import { useMemo, useState } from 'react';
import { buildSession } from '../content/mixedPractice';
import { REVIEW_INTERVALS_DAYS, scheduleAfterReview } from '../store/review';
import { useProgress } from '../hooks/useProgress';
import { navigate } from '../lib/router';
import { fireConfetti } from '../lib/confetti';
import PracticeProblem from '../components/PracticeProblem';

const SESSION_SIZE = 6;

interface Outcome {
  lessonId: string;
  lessonTitle: string;
  correct: boolean;
  /** Resulting interval rung (index into REVIEW_INTERVALS_DAYS). */
  toStep: number;
}

function intervalLabel(step: number): string {
  const i = Math.max(0, Math.min(REVIEW_INTERVALS_DAYS.length - 1, step));
  const d = REVIEW_INTERVALS_DAYS[i];
  return d === 1 ? '1 day' : `${d} days`;
}

function scoreLine(correct: number, total: number): string {
  if (total === 0) return 'No problems this round.';
  const pct = correct / total;
  if (pct === 1) return 'A perfect round — every concept pushed further out.';
  if (pct >= 0.6) return 'Solid recall. The ones you missed will come back around sooner.';
  return 'Good effort — the missed concepts are scheduled to resurface soon.';
}

/** End-of-session recap: score + which concepts advanced vs. reset (FR-11.1 effect). */
function SessionSummary({ outcomes, onAgain }: { outcomes: Outcome[]; onAgain: () => void }) {
  const total = outcomes.length;
  const correct = outcomes.filter((o) => o.correct).length;
  // One row per concept, keeping the final outcome if a concept appeared twice.
  const byLesson = new Map<string, Outcome>();
  for (const o of outcomes) byLesson.set(o.lessonId, o);
  const rows = [...byLesson.values()];

  return (
    <div className="page practice-page">
      <div className="player-top">
        <button type="button" className="back-link" onClick={() => navigate('/')}>
          ← Home
        </button>
      </div>
      <section className="panel practice-summary">
        <p className="potd-eyebrow">Session complete</p>
        <h2 className="practice-score">
          {correct}
          <span className="practice-score-of"> / {total} correct</span>
        </h2>
        <p className="page-sub">{scoreLine(correct, total)}</p>
        <ul className="practice-recap">
          {rows.map((o) => (
            <li key={o.lessonId} className={`practice-recap-row ${o.correct ? 'adv' : 'reset'}`}>
              <span className="practice-recap-ico" aria-hidden>
                {o.correct ? '↑' : '↺'}
              </span>
              <span className="practice-recap-title">{o.lessonTitle}</span>
              <span className="practice-recap-note">
                {o.correct ? `next review in ${intervalLabel(o.toStep)}` : 'reset to 1 day'}
              </span>
            </li>
          ))}
        </ul>
        <div className="potd-actions">
          <button type="button" className="btn btn-primary" onClick={onAgain}>
            Practice again
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/learn')}>
            Back to course
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Mixed Practice (PRD FR-11.1 + FR-11.2): a short, interleaved review session over
 * the learner's mastered lessons, prioritizing concepts that are due. Each resolve
 * re-schedules that concept (correct → next interval, wrong → reset to 1d). Always
 * runs in faded-scaffolding mode — problems are presented cold via PracticeProblem.
 */
export default function MixedPracticePage() {
  const progress = useProgress();
  const [seed, setSeed] = useState(() => `mix-${Date.now()}`);
  const session = useMemo(
    () => (progress.loaded ? buildSession(progress.stats, progress.all, SESSION_SIZE, seed) : null),
    // Build once per seed when progress is loaded. `recordReview` mutates
    // `progress.stats` mid-session, but the remaining problems must not reshuffle —
    // so we deliberately exclude stats/all from the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress.loaded, seed],
  );

  const [index, setIndex] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  function restart() {
    setOutcomes([]);
    setIndex(0);
    setResolved(false);
    setSeed(`mix-${Date.now()}`);
  }

  if (!progress.loaded || !session) {
    return <div className="center-note">Loading…</div>;
  }

  if (session.length === 0) {
    return (
      <div className="page practice-page">
        <div className="player-top">
          <button type="button" className="back-link" onClick={() => navigate('/')}>
            ← Home
          </button>
        </div>
        <section className="panel practice-empty">
          <p className="potd-eyebrow">Mixed Practice</p>
          <h2 className="practice-empty-title">Nothing to mix yet</h2>
          <p className="page-sub">
            Mixed Practice shuffles problems across the lessons you&rsquo;ve already cleared and
            resurfaces them on a spaced schedule. Clear your first lesson to unlock it.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/learn')}>
            Go to lessons →
          </button>
        </section>
      </div>
    );
  }

  if (index >= session.length) {
    return <SessionSummary outcomes={outcomes} onAgain={restart} />;
  }

  const current = session[index];
  const last = index + 1 >= session.length;

  function handleResolved(correct: boolean) {
    const prev = progress.stats.review?.[current.lessonId];
    const next = scheduleAfterReview(prev, correct, Date.now());
    progress.recordReview(current.lessonId, correct);
    setOutcomes((o) => [
      ...o,
      { lessonId: current.lessonId, lessonTitle: current.lessonTitle, correct, toStep: next.intervalStep },
    ]);
    setResolved(true);
    if (correct) fireConfetti({ count: 90 });
  }

  function advance() {
    setResolved(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="page practice-page">
      <div className="player-top">
        <button type="button" className="back-link" onClick={() => navigate('/')}>
          ← Home
        </button>
        <span className="player-step-count">
          {index + 1} / {session.length}
        </span>
      </div>

      <div className="practice-progress" role="img" aria-label={`Problem ${index + 1} of ${session.length}`}>
        {session.map((_, i) => {
          // Color each segment by its recorded outcome — green for correct, red for a
          // miss — so the bar reflects results, not just position. The active (unresolved)
          // problem is highlighted; later ones stay neutral.
          const outcome = outcomes[i];
          const state = outcome ? (outcome.correct ? 'done' : 'wrong') : i === index ? 'current' : '';
          return <span key={i} className={`practice-seg ${state}`} />;
        })}
      </div>

      <header className="page-head practice-head">
        <p className="page-eyebrow">Mixed Practice</p>
        <h1 className="page-title">Interleaved review</h1>
        <p className="page-sub">
          Recall it cold and commit — one shot per problem. Concepts you nail wait longer to return.
        </p>
      </header>

      <section className="panel potd">
        <div className="potd-head">
          <p className="potd-eyebrow">Problem {index + 1}</p>
          <span className="potd-topic">{current.lessonTitle}</span>
        </div>
        <h3 className="potd-title">{current.step.title}</h3>
        <p className="potd-body">{current.step.body}</p>
        {current.step.question && <p className="potd-question">{current.step.question}</p>}

        <PracticeProblem
          key={index}
          step={current.step}
          topic={current.lessonTitle}
          onResolved={handleResolved}
          mode="single"
        />

        {resolved && (
          <div className="potd-actions">
            <button type="button" className="btn btn-primary" onClick={advance}>
              {last ? 'See results' : 'Next problem →'}
            </button>
            <span className="potd-next">Spaced repetition keeps the wins.</span>
          </div>
        )}
      </section>
    </div>
  );
}
