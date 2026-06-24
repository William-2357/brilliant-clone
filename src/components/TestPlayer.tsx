import { useEffect, useMemo, useState } from 'react';
import type { Lesson, LessonStep } from '../types/lesson';
import { generateProblem } from '../content/problemTemplates';
import { hashString } from '../lib/rng';
import { isCorrect } from '../lib/probability';
import { parseNumericInput, answerHint } from '../lib/answer';
import { fireConfetti } from '../lib/confetti';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../hooks/useAuth';
import { problemResult, allQuestionsResolved } from '../store/progress';
import { navigate } from '../lib/router';
import PredictScale from './PredictScale';
import OrderItems from './OrderItems';

type Phase = 'intro' | 'question' | 'results';

/** Fraction of questions needed to pass (and earn confetti). */
const PASS = 0.7;

/** A committed-but-not-yet-graded answer: just the raw input the learner entered. */
interface RawAnswer {
  /** numeric/slider input, as typed. */
  guess: string;
  /** order-interaction ranking (empty for numeric/slider). */
  order: number[];
}

/**
 * An in-progress draft lets a half-finished test survive a refresh or
 * navigate-away WITHOUT leaking correctness: only the raw inputs (never a graded
 * result) are stored, keyed per user + test and validated against the current
 * seed/attempt so a stale or different-attempt draft is ignored.
 */
interface TestDraft {
  seed: number;
  attempt: number;
  /** Index of the next unanswered question. */
  idx: number;
  answers: (RawAnswer | null)[];
}

const DRAFT_PREFIX = 'bb:test-draft';
function draftKey(uid: string | undefined, lessonId: string): string {
  return `${DRAFT_PREFIX}:${uid ?? 'local'}:${lessonId}`;
}
function saveDraft(uid: string | undefined, lessonId: string, draft: TestDraft): void {
  try {
    localStorage.setItem(draftKey(uid, lessonId), JSON.stringify(draft));
  } catch {
    /* ignore quota / availability errors */
  }
}
function clearDraft(uid: string | undefined, lessonId: string): void {
  try {
    localStorage.removeItem(draftKey(uid, lessonId));
  } catch {
    /* ignore */
  }
}
/** Load a resumable draft for the current seed/attempt, or null if none/stale. */
function loadDraft(
  uid: string | undefined,
  lessonId: string,
  seed: number,
  attempt: number,
  total: number,
): { idx: number; answers: (RawAnswer | undefined)[] } | null {
  try {
    const raw = localStorage.getItem(draftKey(uid, lessonId));
    if (!raw) return null;
    const d = JSON.parse(raw) as TestDraft;
    if (d.seed !== seed || d.attempt !== attempt) return null;
    if (!Array.isArray(d.answers) || d.answers.length !== total) return null;
    if (typeof d.idx !== 'number' || d.idx <= 0 || d.idx >= total) return null;
    const answers = d.answers.map((a) =>
      a && typeof a === 'object'
        ? { guess: String(a.guess ?? ''), order: Array.isArray(a.order) ? a.order : [] }
        : undefined,
    );
    if (!answers.some((a) => a !== undefined)) return null;
    return { idx: d.idx, answers };
  } catch {
    return null;
  }
}

/** Format a numeric value the way the matching question's unit expects. */
function fmtNum(step: LessonStep, v: number): string {
  if (step.unit === 'count' || step.unit === 'sum') return String(Math.round(v));
  if (step.unit === 'dollars') return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
  // Trim trailing zeros so integer answers read "10", not "10.000".
  return Number(v.toFixed(3)).toString();
}

/** The computed correct answer, rendered for the review list. */
function truthString(step: LessonStep): string {
  if ((step.interaction ?? 'numeric') === 'order') {
    return (step.answerOrder ?? []).map((v) => step.orderLabels?.[v] ?? String(v)).join(' › ');
  }
  return fmtNum(step, step.answer ?? 0);
}

/** Grade a committed raw answer against its question (used at finish + in review). */
function gradeRaw(step: LessonStep, raw: RawAnswer): { correct: boolean; your: string } {
  if ((step.interaction ?? 'numeric') === 'order') {
    const target = step.answerOrder ?? [];
    const correct = raw.order.length === target.length && raw.order.every((v, i) => v === target[i]);
    return { correct, your: raw.order.map((v) => step.orderLabels?.[v] ?? String(v)).join(' › ') };
  }
  const value = parseNumericInput(raw.guess);
  if (value === null) return { correct: false, your: '\u2014' };
  return { correct: isCorrect(value, step.answer ?? 0, step.tolerance ?? 0), your: fmtNum(step, value) };
}

/**
 * The Final Test player. Unlike `LessonPlayer`, it runs no simulation while the
 * learner answers (a sim would reveal the answer) and reveals **nothing** — no
 * correct/incorrect, no score — until all ten questions are committed. Answers
 * are kept in local state and graded + persisted in one batch at the very end,
 * so no result leaks into the sidebar, course page, or storage mid-test.
 */
export default function TestPlayer({ lesson }: { lesson: Lesson }) {
  const progress = useProgress();
  const { user } = useAuth();
  const uid = user?.uid;

  // Resolve the starting cursor + any resumable in-progress draft once, at mount.
  const init = useMemo(() => {
    const existing = progress.get(lesson.id);
    const seed0 = existing?.seed ?? hashString(lesson.id);
    const attempt0 = existing?.attempt ?? 0;
    const resolved0 = allQuestionsResolved(lesson, existing);
    const draft0 = resolved0 ? null : loadDraft(uid, lesson.id, seed0, attempt0, lesson.steps.length);
    return { seed0, attempt0, resolved0, draft0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generated-question cursor: `seed` is the learner's stable base, `attempt`
  // advances on each retake so a new test deals a fresh set of questions.
  const [seed, setSeed] = useState<number>(init.seed0);
  const [attempt, setAttempt] = useState<number>(init.attempt0);
  // Stored results ⇒ the test is done (results view); a saved draft ⇒ resume
  // mid-test; otherwise start at the intro.
  const [phase, setPhase] = useState<Phase>(
    init.draft0 ? 'question' : init.resolved0 ? 'results' : 'intro',
  );
  const [idx, setIdx] = useState(init.draft0 ? init.draft0.idx : 0);
  const [guess, setGuess] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [inputError, setInputError] = useState('');
  const [answers, setAnswers] = useState<(RawAnswer | undefined)[]>(
    init.draft0 ? init.draft0.answers : new Array(lesson.steps.length).fill(undefined),
  );

  // The concrete ten questions for this attempt (stable until seed/attempt change).
  const steps = useMemo(
    () => lesson.steps.map((s) => generateProblem(lesson.id, s, seed, attempt, 0)),
    [lesson, seed, attempt],
  );
  const total = steps.length;
  const current = steps[idx];

  // Reset the input control to the blank/default state for a given question.
  function primeInput(step: LessonStep | undefined) {
    setInputError('');
    if (step?.interaction === 'order') {
      setOrder(step.orderItems ? step.orderItems.slice() : []);
      setGuess('');
    } else if (step?.interaction === 'slider') {
      const lo = step.sliderMin ?? 0;
      const hi = step.sliderMax ?? 1;
      const st = step.sliderStep ?? 0.01;
      setGuess(String(Math.round((lo + hi) / 2 / st) * st));
    } else {
      setGuess('');
    }
  }

  // Keep the input in sync with whichever question is on screen (covers the
  // initial mount and a fresh start/retake, where `current` changes via seed).
  useEffect(() => {
    if (phase !== 'question' || !current) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    primeInput(current);
  }, [phase, idx, current]);

  function start() {
    const p = progress.ensureStarted(lesson);
    setSeed(p.seed ?? hashString(lesson.id));
    setAttempt(p.attempt ?? 0);
    setAnswers(new Array(lesson.steps.length).fill(undefined));
    setIdx(0);
    clearDraft(uid, lesson.id);
    setPhase('question');
  }

  function retake() {
    progress.resetLessonResults(lesson);
    const p = progress.get(lesson.id);
    setSeed(p?.seed ?? hashString(lesson.id));
    setAttempt(p?.attempt ?? 0);
    setAnswers(new Array(lesson.steps.length).fill(undefined));
    setIdx(0);
    clearDraft(uid, lesson.id);
    setPhase('question');
  }

  function submit() {
    const step = current;
    if (!step) return;
    const interaction = step.interaction ?? 'numeric';
    // Validate the numeric/slider input before committing (order is always valid).
    if (interaction !== 'order' && parseNumericInput(guess) === null) {
      setInputError('Enter a number — a decimal or fraction, e.g. 0.5 or 1/2.');
      return;
    }
    // Store only the RAW input — grading is deferred to finish(), so nothing
    // about correctness is computed or persisted mid-test.
    const raw: RawAnswer = { guess, order: order.slice() };
    const next = answers.slice();
    next[idx] = raw;
    setAnswers(next);
    if (idx >= total - 1) {
      finish(next);
    } else {
      const nextIdx = idx + 1;
      // Persist a resumable draft (raw inputs only) so a refresh/leave can resume.
      saveDraft(uid, lesson.id, { seed, attempt, idx: nextIdx, answers: next.map((a) => a ?? null) });
      // Prime the next question's input now so the prior answer never flashes.
      primeInput(steps[nextIdx]);
      setIdx(nextIdx);
    }
  }

  // Grade everything at once: persist all ten results in a single pass, drop the
  // in-progress draft, then (and only then) reveal the score.
  function finish(finalAnswers: (RawAnswer | undefined)[]) {
    const graded = steps.map((s, i) => {
      const raw = finalAnswers[i];
      return raw ? gradeRaw(s, raw) : { correct: false, your: '\u2014' };
    });
    steps.forEach((s, i) => progress.recordResult(lesson, s, graded[i].correct ? 'green' : 'red'));
    clearDraft(uid, lesson.id);
    const score = graded.filter((g) => g.correct).length;
    setPhase('results');
    if (score / total >= PASS) {
      fireConfetti({ count: score === total ? 200 : 150 });
    }
  }

  if (phase === 'intro') {
    return (
      <div className="player">
        <div className="player-top">
          <button type="button" className="back-link" onClick={() => navigate('/learn')}>
            ← Course
          </button>
        </div>
        <div className="test-intro">
          <p className="page-eyebrow">Final Test</p>
          <h1 className="page-title">{total} questions, one shot each</h1>
          <p className="test-intro-lead">
            A capstone across every lesson — long-run frequency, independence, the bell curve,
            expected value, conditioning, Monty Hall, the CLT, and random walks.
          </p>
          <ul className="test-intro-points">
            <li>One attempt per question — there are no retries.</li>
            <li>
              <strong>You won&rsquo;t see which answers are right until you finish all {total}.</strong>
            </li>
            <li>Pass at {Math.ceil(PASS * total)} correct. You can retake it any time.</li>
          </ul>
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            Start the test
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const review = steps.map((s, i) => {
      const raw = answers[i];
      const graded = raw ? gradeRaw(s, raw) : undefined;
      // After an in-session finish we have the raw answers; on a later revisit
      // (draft cleared) fall back to the persisted per-question color.
      const correct = graded ? graded.correct : problemResult(progress.get(lesson.id), s.id) === 'green';
      return { step: s, correct, your: graded?.your, truth: truthString(s) };
    });
    const score = review.filter((r) => r.correct).length;
    const perfect = score === total;
    const passed = score / total >= PASS;
    const badgeClass = perfect ? 'badge-master' : passed ? 'badge-clear' : 'badge-miss';
    const badge = perfect ? '\u2605' : passed ? '\u2713' : '\u21BA';
    const heading = perfect ? 'Perfect score!' : passed ? 'Final Test passed' : 'Not passed yet';

    return (
      <div className="player">
        <div className="player-top">
          <button type="button" className="back-link" onClick={() => navigate('/learn')}>
            ← Course
          </button>
        </div>
        <div className="completion test-results">
          <div className={`completion-badge ${badgeClass}`} aria-hidden>
            {badge}
          </div>
          <h2>{heading}</h2>
          <p className="test-score">
            {score}
            <small> / {total}</small>
          </p>

          <ol className="test-review">
            {review.map((r, i) => (
              <li key={r.step.id} className={`test-review-row ${r.correct ? 'ok' : 'no'}`}>
                <span className="test-review-mark" aria-hidden>
                  {r.correct ? '\u2713' : '\u2715'}
                </span>
                <span className="test-review-body">
                  <span className="test-review-q">
                    {i + 1}. {r.step.title}
                  </span>
                  <span className="test-review-ans">
                    {r.your != null && (
                      <>
                        Your answer <b>{r.your}</b>
                        <span aria-hidden> · </span>
                      </>
                    )}
                    Answer <b>{r.truth}</b>
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="completion-summary">
            {passed
              ? 'Strong work — you\u2019ve shown command of all eight topics.'
              : `You need ${Math.ceil(PASS * total)} correct to pass. Revisit the lessons behind any misses, then retake.`}
          </p>

          <button type="button" className="btn btn-primary btn-block" onClick={retake}>
            Retake test
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/learn')}>
            Back to course
          </button>
        </div>
      </div>
    );
  }

  // phase === 'question'
  if (!current) return <div className="center-note">Preparing your test…</div>;
  const interaction = current.interaction ?? 'numeric';
  const isLast = idx >= total - 1;

  return (
    <div className="player">
      <div className="player-top">
        <button type="button" className="back-link" onClick={() => navigate('/learn')}>
          ← Course
        </button>
        <span className="player-step-count">
          Question {idx + 1} of {total}
        </span>
      </div>

      <div className="test-progress" role="img" aria-label={`Question ${idx + 1} of ${total}`}>
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={`qseg ${i < idx ? 'seg-done' : ''} ${i === idx ? 'seg-current' : ''}`}
          />
        ))}
      </div>

      <header className="player-head">
        <p className="player-lesson-title">Final Test</p>
        <div className="player-step-heading">
          <span className="step-tag tag-problem">Problem</span>
          <h2 className="player-step-title">{current.title}</h2>
        </div>
        <p className="player-body">{current.body}</p>
        {current.question && <p className="player-question">{current.question}</p>}
      </header>

      <div className="test-answer panel-block">
        <p className="panel-hint">
          Commit your answer. You won&rsquo;t learn whether it&rsquo;s right until the test is complete.
        </p>

        {interaction === 'numeric' && (
          <>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              className="predict-input"
              placeholder="Your answer"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <span className="predict-unit">{answerHint(current.unit)}</span>
          </>
        )}

        {interaction === 'slider' && (
          <>
            <span className="predict-unit">Drag the handle to your prediction.</span>
            <PredictScale
              min={current.sliderMin ?? 0}
              max={current.sliderMax ?? 1}
              step={current.sliderStep ?? 0.01}
              value={guess === '' ? (current.sliderMin ?? 0) : Number(guess)}
              onChange={(v) => setGuess(String(v))}
              unit={current.unit}
            />
          </>
        )}

        {interaction === 'order' && (
          <>
            <span className="predict-unit">Put the most likely outcome at the top.</span>
            <OrderItems items={order} onChange={setOrder} labels={current.orderLabels} />
          </>
        )}

        {inputError && <span className="predict-error">{inputError}</span>}

        <button type="button" className="btn btn-primary btn-block" onClick={submit}>
          {isLast ? 'Finish & see results' : 'Submit & next question'}
        </button>
      </div>
    </div>
  );
}
