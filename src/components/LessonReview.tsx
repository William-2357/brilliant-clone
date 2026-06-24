import { useEffect, useState } from 'react';
import type { Lesson, LessonStep } from '../types/lesson';
import { generateProblem } from '../content/problemTemplates';
import { hashString } from '../lib/rng';
import { problemResult } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { simulations } from '../simulations';
import LectureContent from './LectureContent';
import QuestionBar from './QuestionBar';
import OrderItems from './OrderItems';
import DrawDistribution from './DrawDistribution';
import SpeedControl from './SpeedControl';

/** Small badge describing how the learner did on a question, by stored color. */
const VERDICT: Record<string, { label: string; cls: string }> = {
  green: { label: 'First try', cls: 'green' },
  yellow: { label: 'On retry', cls: 'yellow' },
  red: { label: 'Missed', cls: 'red' },
};

/** The computed answer line for a step, mirroring the player's reveal phrasing. */
function reviewTruth(step: LessonStep): string {
  const interaction = step.interaction ?? 'numeric';
  if (interaction === 'order') {
    const order = (step.answerOrder ?? []).map((v) => step.orderLabels?.[v] ?? String(v));
    return `Most to least likely: ${order.join(' › ')}.`;
  }
  if (interaction === 'draw') return 'The accent outline traces the true distribution.';
  if (interaction === 'wheel') return `A fair wheel has an expected payout of $${step.answer ?? 0}.`;
  if (step.unit === 'count' || step.unit === 'sum') return `The answer is ${Math.round(step.answer ?? 0)}.`;
  if (step.unit === 'dollars') return `The answer is $${step.answer ?? 0}.`;
  return `The answer is ${Number((step.answer ?? 0).toFixed(3)).toString()}.`;
}

interface Props {
  lesson: Lesson;
  /** Leave review and return to the completion ("lesson cleared") summary screen. */
  onExit: () => void;
}

/**
 * Read-only walk-through of an already-completed lesson: re-read the lecture,
 * replay each simulation, and see every problem's computed answer alongside the
 * result the learner earned — all without touching their stored record. Problems
 * are regenerated from the learner's saved seed/attempt so the review reflects the
 * questions they actually saw (the first variant of each).
 */
export default function LessonReview({ lesson, onExit }: Props) {
  const progress = useProgress();
  const lessonProgress = progress.get(lesson.id);
  const seed = lessonProgress?.seed ?? hashString(lesson.id);
  const attempt = lessonProgress?.attempt ?? 0;

  const [idx, setIdx] = useState(0);

  // Each step change returns the learner to the top so the next item starts in view.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [idx]);
  const baseStep = lesson.steps[idx];
  // Cheap pure build (one step); the React Compiler memoizes it automatically.
  const step = baseStep ? generateProblem(lesson.id, baseStep, seed, attempt, 0) : baseStep;

  if (!step) return null;

  const isConcept = step.type === 'concept';
  const interaction = step.interaction ?? 'numeric';
  const Sim = step.simulation ? simulations[step.simulation] : null;
  const res = problemResult(lessonProgress, step.id);
  const verdict = res ? VERDICT[res] : undefined;

  const problems = lesson.steps.filter((s) => s.type === 'problem');
  const problemNumber =
    step.type === 'problem' ? problems.findIndex((s) => s.id === step.id) + 1 : 0;

  const atFirst = idx === 0;
  const atLast = idx === lesson.steps.length - 1;

  // Peak-scale the true distribution so the review bars fill the sketch pad.
  const drawValue = (() => {
    if (interaction !== 'draw') return [] as number[];
    const shape = step.answerShape ?? [];
    const peak = Math.max(...shape, 0.0001);
    return shape.map((v) => v / peak);
  })();

  return (
    <div className="player">
      <div className="player-top">
        <button type="button" className="back-link" onClick={onExit}>
          ← Summary
        </button>
        <span className="player-step-count">
          {isConcept ? 'Concept' : `Problem ${problemNumber} of ${problems.length}`}
        </span>
      </div>

      <QuestionBar
        lesson={lesson}
        progress={lessonProgress}
        currentId={step.type === 'problem' ? step.id : undefined}
      />

      <header className="player-head">
        <p className="player-lesson-title">{lesson.title} · Review</p>
        <div className="player-step-heading">
          <span className={`step-tag tag-${step.type}`}>{isConcept ? 'Concept' : 'Problem'}</span>
          <h2 className="player-step-title">{step.title}</h2>
          {verdict && <span className={`review-verdict v-${verdict.cls}`}>{verdict.label}</span>}
        </div>
        {!isConcept && (
          <>
            <p className="player-body">{step.body}</p>
            {step.question && <p className="player-question">{step.question}</p>}
          </>
        )}
      </header>

      {isConcept && (
        <div className="lecture-panel">
          <LectureContent step={step} />
        </div>
      )}

      <div className="player-stage player-stage--solo">
        {!isConcept && (
          <div className="panel-block review-answer">
            <p className="review-answer-truth">{reviewTruth(step)}</p>
            {step.feedback?.correct && <p className="panel-hint">{step.feedback.correct}</p>}
            {interaction === 'order' && (
              <OrderItems
                items={step.answerOrder ?? []}
                answer={step.answerOrder}
                labels={step.orderLabels}
                disabled
                onChange={() => {}}
              />
            )}
            {interaction === 'draw' && (
              <DrawDistribution
                categories={step.drawCategories ?? []}
                value={drawValue}
                truth={step.answerShape}
                showTruth
                disabled
                onChange={() => {}}
              />
            )}
          </div>
        )}

        {Sim && (
          <section className="player-sim">
            <Sim
              key={`${step.id}:${seed}:${attempt}`}
              config={step.simConfig ?? {}}
              mode="explore"
              runSignal={0}
            />
            <SpeedControl />
          </section>
        )}
      </div>

      <div className="review-nav">
        <button
          type="button"
          className="btn"
          disabled={atFirst}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          ← Previous
        </button>
        {atLast ? (
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Finish review
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIdx((i) => Math.min(lesson.steps.length - 1, i + 1))}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
