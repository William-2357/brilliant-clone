import { useRef, useState } from 'react';
import { dailyProblem, readPotdStatus, writePotdStatus, type PotdStatus } from '../content/daily';
import type { LessonStep } from '../types/lesson';
import { isCorrect } from '../lib/probability';
import { parseNumericInput, answerHint } from '../lib/answer';
import { useProgress } from '../hooks/useProgress';
import { useExplainAI } from '../hooks/useExplainAI';
import { fetchAiExplanation, aiConfigured } from '../lib/coachClient';
import type { ExplainInput } from '../lib/explain';
import { dayKey } from '../store/progress';
import { fireConfetti } from '../lib/confetti';
import { navigate } from '../lib/router';
import FeedbackBanner from './FeedbackBanner';
import PredictScale from './PredictScale';

/** Format a numeric value the way its unit expects (mirrors the lesson/test reveal). */
function fmtNum(step: LessonStep, v: number): string {
  if (step.unit === 'count' || step.unit === 'sum') return String(Math.round(v));
  if (step.unit === 'dollars') return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
  return v.toFixed(3);
}

/** Midpoint value (as a string) for a slider step, snapped to its step size. */
function sliderMid(step: LessonStep): string {
  const lo = step.sliderMin ?? 0;
  const hi = step.sliderMax ?? 1;
  const st = step.sliderStep ?? 0.01;
  return String(Math.round((lo + hi) / 2 / st) * st);
}

/**
 * A single, date-seeded problem the learner can attempt right from Home. The same
 * problem appears all day (stable per `dayKey`) and rotates tomorrow. The answer is
 * computed by `generateProblem` from `probability.ts`, never hand-typed, and is
 * withheld on a wrong guess (you can retry or choose to reveal it).
 */
export default function ProblemOfTheDay() {
  const progress = useProgress();
  const [explainAI] = useExplainAI();
  const today = dayKey(new Date().getTime());

  // Deterministic per day: same problem all day, a fresh one tomorrow. Computed
  // before state so the slider's starting value can be seeded from the generated
  // step (which may be a slider variant even though the pool is keyed off the
  // static numeric slots).
  const daily = dailyProblem(today);
  const pick = daily?.pick ?? null;
  const step = daily?.step ?? null;

  const [done, setDone] = useState<PotdStatus | null>(() => readPotdStatus(today));
  const [guess, setGuess] = useState(() =>
    step && step.interaction === 'slider' ? sliderMid(step) : '',
  );
  const [tried, setTried] = useState(false);
  const [error, setError] = useState('');
  // AI wrong-answer explanation (swaps in for the hand-written hint when connected).
  const [aiExplain, setAiExplain] = useState<{
    text: string;
    source: 'template' | 'ai' | 'loading';
  } | null>(null);
  const explainSeqRef = useRef(0);

  if (!pick || !step) return null;
  const { lessonId, lessonTitle } = pick;
  const answer = step.answer ?? 0;
  // Hoisted so the check() closure doesn't dereference the (nullable) step.
  const tolerance = step.tolerance ?? 0;
  const truth = `The answer is ${fmtNum(step, answer)}.`;

  function check() {
    const value = parseNumericInput(guess);
    if (value === null) {
      setError('Enter a number — a decimal or fraction, e.g. 0.5 or 1/2.');
      return;
    }
    setError('');
    if (isCorrect(value, answer, tolerance)) {
      setDone('solved');
      writePotdStatus(today, 'solved');
      progress.recordPotdSolved();
      fireConfetti({ count: 120 });
    } else {
      setTried(true);
    }
  }

  function reveal() {
    setDone('revealed');
    writePotdStatus(today, 'revealed');
    requestExplanation();
  }

  /** Render the hand-written hint, then swap in an AI explanation if connected. */
  function requestExplanation() {
    if (!explainAI || !step || !aiConfigured()) return;
    const hint = step.feedback?.incorrect ?? '';
    if (!hint) return;
    const input: ExplainInput = {
      surface: 'daily',
      topic: lessonTitle,
      question: step.question ? `${step.body} ${step.question}` : step.body,
      interaction: step.interaction ?? 'numeric',
      unit: step.unit,
      learnerAnswer: guess.trim() === '' ? '(no value entered)' : guess.trim(),
      correctAnswer: fmtNum(step, answer),
      tolerance: step.tolerance,
      authorHint: hint,
    };
    const seq = ++explainSeqRef.current;
    setAiExplain({ text: hint, source: 'loading' });
    void fetchAiExplanation(input).then((ai) => {
      if (seq !== explainSeqRef.current) return;
      setAiExplain(ai ? { text: ai, source: 'ai' } : { text: hint, source: 'template' });
    });
  }

  return (
    <section className="panel potd">
      <div className="potd-head">
        <p className="potd-eyebrow">Problem of the day</p>
        <span className="potd-topic">{lessonTitle}</span>
      </div>
      <h3 className="potd-title">{step.title}</h3>
      <p className="potd-body">{step.body}</p>
      {step.question && <p className="potd-question">{step.question}</p>}

      {done ? (
        <>
          <FeedbackBanner
            correct={done === 'solved'}
            message={
              done === 'solved'
                ? step.feedback?.correct ?? 'Nicely done.'
                : aiExplain?.text ?? step.feedback?.incorrect ?? 'Here is the reasoning.'
            }
            truth={truth}
            source={
              done === 'revealed' && aiExplain?.source === 'ai'
                ? 'ai'
                : done === 'revealed' && aiExplain?.source === 'loading'
                  ? 'loading'
                  : undefined
            }
          />
          <div className="potd-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/learn/${lessonId}`)}>
              Practice in {lessonTitle} →
            </button>
            <span className="potd-next">A fresh problem unlocks tomorrow.</span>
          </div>
        </>
      ) : (
        <div className="potd-answer">
          {step.interaction === 'slider' ? (
            <>
              <PredictScale
                min={step.sliderMin ?? 0}
                max={step.sliderMax ?? 1}
                step={step.sliderStep ?? 0.01}
                value={guess === '' ? (step.sliderMin ?? 0) : Number(guess)}
                onChange={(v) => setGuess(String(v))}
                unit={step.unit}
              />
              <button type="button" className="btn btn-primary btn-block" onClick={check}>
                Check
              </button>
            </>
          ) : (
            <>
              <div className="potd-input-row">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  className="predict-input"
                  placeholder="Your answer"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                />
                <button type="button" className="btn btn-primary" onClick={check}>
                  Check
                </button>
              </div>
              <span className="predict-unit">{answerHint(step.unit)}</span>
            </>
          )}
          {tried && (
            <p className="potd-retry" role="status">
              Not quite — take another look and try again.
            </p>
          )}
          {error && <span className="predict-error">{error}</span>}
          <button type="button" className="potd-reveal" onClick={reveal}>
            Reveal answer
          </button>
        </div>
      )}
    </section>
  );
}
