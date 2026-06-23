import { useEffect, useMemo, useState } from 'react';
import type { Lesson, LessonStep } from '../types/lesson';
import { lessons, gradableSteps } from '../content/lessons';
import { recommendNext } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { simulations } from '../simulations';
import { isCorrect } from '../lib/probability';
import FeedbackBanner from './FeedbackBanner';
import MilestoneBanner from './MilestoneBanner';
import CompletionScreen from './CompletionScreen';
import { navigate } from '../lib/router';

type Phase = 'predict' | 'running' | 'feedback';

interface Props {
  lesson: Lesson;
}

export default function LessonPlayer({ lesson }: Props) {
  const progress = useProgress();
  const conceptStep = useMemo(() => lesson.steps.find((s) => s.type === 'concept'), [lesson]);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('predict');
  const [guess, setGuess] = useState('');
  const [inputError, setInputError] = useState('');
  const [correct, setCorrect] = useState(false);
  const [runSignal, setRunSignal] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [completed, setCompleted] = useState(false);

  // Initialise / resume at the saved step.
  useEffect(() => {
    const p = progress.ensureStarted(lesson);
    const idx = lesson.steps.findIndex((s) => s.id === p.currentStepId);
    /* eslint-disable react-hooks/set-state-in-effect */
    setStepIndex(idx >= 0 ? idx : 0);
    setCompleted(p.mastered);
    setMilestone('');
    /* eslint-enable react-hooks/set-state-in-effect */
    resetStepUi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  function resetStepUi() {
    setPhase('predict');
    setGuess('');
    setInputError('');
    setShowReview(false);
    // Reset the run trigger so a freshly shown problem does NOT auto-run on mount.
    // A run only happens once the learner locks a prediction (runSignal -> >0).
    setRunSignal(0);
  }

  const step = lesson.steps[stepIndex];

  function goToStep(idx: number) {
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, idx));
    setStepIndex(clamped);
    progress.setCurrentStep(lesson.id, lesson.steps[clamped].id);
    resetStepUi();
  }

  function advance() {
    if (stepIndex < lesson.steps.length - 1) {
      goToStep(stepIndex + 1);
    }
  }

  function lockPrediction(currentStep: LessonStep) {
    const value = parseFloat(guess);
    if (Number.isNaN(value)) {
      setInputError('Enter a number (e.g. 0.5).');
      return;
    }
    const ok = isCorrect(value, currentStep.answer ?? 0, currentStep.tolerance ?? 0);
    setCorrect(ok);
    setInputError('');
    setPhase('running');
    setRunSignal((n) => n + 1);
  }

  function onSettled(currentStep: LessonStep) {
    const result = progress.recordResult(lesson, currentStep, correct);
    setPhase('feedback');
    if (result.triggerReview) setShowReview(true);
    if (result.masteredNow) {
      setMilestone(
        lesson.index === 1
          ? 'First lesson complete! You\u2019re on your way.'
          : `Lesson ${lesson.index} mastered!`,
      );
      const allMastered = lessons
        .filter((l) => l.status === 'built')
        .every((l) => (l.id === lesson.id ? true : progress.get(l.id)?.mastered));
      if (allMastered) setMilestone('Incredible \u2014 every available lesson mastered!');
    }
  }

  function tryAgain() {
    setGuess('');
    setPhase('predict');
  }

  function continueFromProblem() {
    const masteredNow = progress.get(lesson.id)?.mastered;
    const isLast = stepIndex >= lesson.steps.length - 1;
    if (masteredNow && isLast) {
      setCompleted(true);
    } else {
      advance();
    }
  }

  if (!step) return <div className="center-note">This lesson is coming soon.</div>;

  if (completed) {
    const next = recommendNext(lessons, progress.all);
    const nextLesson = next && next.id !== lesson.id ? next : null;
    return (
      <CompletionScreen
        lesson={lesson}
        problemsSolved={gradableSteps(lesson).length}
        nextLesson={nextLesson}
        onNext={() => nextLesson && navigate(`/learn/${nextLesson.id}`)}
        onBackToCourse={() => navigate('/learn')}
      />
    );
  }

  const Sim = step.simulation ? simulations[step.simulation] : null;
  const problems = gradableSteps(lesson);
  const solvedCount = problems.filter((p) =>
    progress.get(lesson.id)?.completedProblemIds.includes(p.id),
  ).length;

  return (
    <div className="player">
      {milestone && <MilestoneBanner text={milestone} onDismiss={() => setMilestone('')} />}

      <div className="player-progress">
        <button type="button" className="link-btn" onClick={() => navigate('/learn')}>
          ← Course
        </button>
        <span className="player-step-count">
          Step {stepIndex + 1} of {lesson.steps.length} · {solvedCount}/{problems.length} solved
        </span>
      </div>

      <div className="lesson-progress-track">
        <div
          className="lesson-progress-fill"
          style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }}
        />
        <span className="lesson-progress-flag" aria-hidden>
          {'\u2691'}
        </span>
      </div>

      <h1 className="player-lesson-title">{lesson.title}</h1>
      <h2 className="player-step-title">{step.title}</h2>
      <p className="player-body">{step.body}</p>

      {step.type === 'problem' && step.question && (
        <p className="player-question">{step.question}</p>
      )}

      {Sim && (
        <Sim
          key={step.id}
          config={step.simConfig ?? {}}
          mode={step.type === 'concept' ? 'explore' : 'verify'}
          runSignal={step.type === 'problem' ? runSignal : 0}
          onSettled={step.type === 'problem' ? () => onSettled(step) : undefined}
        />
      )}

      {step.type === 'concept' && (
        <div className="player-actions">
          <button type="button" className="btn btn-primary" onClick={advance}>
            Continue
          </button>
        </div>
      )}

      {step.type === 'problem' && phase === 'predict' && (
        <div className="predict">
          <div className="predict-row">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              className="predict-input"
              placeholder="Your prediction"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lockPrediction(step)}
            />
            <button type="button" className="btn btn-primary" onClick={() => lockPrediction(step)}>
              Lock in &amp; run
            </button>
          </div>
          {step.unit && <span className="predict-unit">Answer as a {step.unit}.</span>}
          {inputError && <span className="predict-error">{inputError}</span>}
        </div>
      )}

      {step.type === 'problem' && phase === 'running' && (
        <p className="player-running">Running the simulation…</p>
      )}

      {step.type === 'problem' && phase === 'feedback' && step.feedback && (
        <>
          <FeedbackBanner
            correct={correct}
            message={correct ? step.feedback.correct : step.feedback.incorrect}
            truth={
              step.unit === 'sum'
                ? `The answer is ${step.answer}.`
                : `The true value is ${(step.answer ?? 0).toFixed(3)}.`
            }
          />
          {showReview && conceptStep && (
            <div className="review">
              <strong className="review-title">Quick review: {conceptStep.title}</strong>
              <p>{conceptStep.body}</p>
            </div>
          )}
          <div className="player-actions">
            {correct ? (
              <button type="button" className="btn btn-primary" onClick={continueFromProblem}>
                Continue
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={tryAgain}>
                Try again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
