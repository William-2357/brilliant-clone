import { useMemo, useState } from 'react';
import { dailyProblem, readPotdStatus, writePotdStatus, type PotdStatus } from '../content/daily';
import type { LessonStep } from '../types/lesson';
import { useProgress } from '../hooks/useProgress';
import { dayKey } from '../store/progress';
import { fireConfetti } from '../lib/confetti';
import { navigate } from '../lib/router';
import FeedbackBanner from './FeedbackBanner';
import PracticeProblem from './PracticeProblem';

/** Format a numeric value the way its unit expects (mirrors the lesson/test reveal). */
function fmtNum(step: LessonStep, v: number): string {
  if (step.unit === 'count' || step.unit === 'sum') return String(Math.round(v));
  if (step.unit === 'dollars') return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
  return v.toFixed(3);
}

/**
 * A single, date-seeded problem the learner can attempt right from Home. The same
 * problem appears all day (stable per `dayKey`) and rotates tomorrow. The render +
 * grade loop is the shared `PracticeProblem`; this wrapper adds the daily framing,
 * persists the day's outcome, advances the streak on a solve, and celebrates. The
 * answer is computed by `generateProblem` from `probability.ts`, never hand-typed.
 */
export default function ProblemOfTheDay() {
  const progress = useProgress();
  const today = dayKey(new Date().getTime());

  // Deterministic per day: same problem all day, a fresh one tomorrow. Memoized so
  // re-renders don't regenerate it (and PracticeProblem keeps a stable step).
  const daily = useMemo(() => dailyProblem(today), [today]);

  // Whether the problem was already resolved earlier today (a returning-visitor
  // recap, captured once at mount) vs. resolved live in this mount (PracticeProblem
  // shows its own feedback).
  const [recap] = useState<PotdStatus | null>(() => readPotdStatus(today));
  const [liveStatus, setLiveStatus] = useState<PotdStatus | null>(null);
  const status = recap ?? liveStatus;

  if (!daily) return null;
  const { pick, step } = daily;
  const { lessonId, lessonTitle } = pick;

  function handleResolved(correct: boolean) {
    const next: PotdStatus = correct ? 'solved' : 'revealed';
    writePotdStatus(today, next);
    setLiveStatus(next);
    if (correct) {
      progress.recordPotdSolved();
      fireConfetti({ count: 120 });
    }
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

      {recap ? (
        <FeedbackBanner
          correct={recap === 'solved'}
          message={
            recap === 'solved'
              ? step.feedback?.correct ?? 'Nicely done.'
              : step.feedback?.incorrect ?? 'Here is the reasoning.'
          }
          truth={`The answer is ${fmtNum(step, step.answer ?? 0)}.`}
        />
      ) : (
        <PracticeProblem step={step} topic={lessonTitle} onResolved={handleResolved} />
      )}

      {status && (
        <div className="potd-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/learn/${lessonId}`)}>
            Practice in {lessonTitle} →
          </button>
          <span className="potd-next">A fresh problem unlocks tomorrow.</span>
        </div>
      )}
    </section>
  );
}
