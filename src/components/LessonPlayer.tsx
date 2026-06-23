import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lesson, LessonStep } from '../types/lesson';
import { lessons, gradableSteps } from '../content/lessons';
import { recommendNext, allQuestionsResolved } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { simulations } from '../simulations';
import { isCorrect } from '../lib/probability';
import { fireConfetti } from '../lib/confetti';
import FeedbackBanner from './FeedbackBanner';
import MilestoneBanner from './MilestoneBanner';
import CompletionScreen from './CompletionScreen';
import QuestionBar from './QuestionBar';
import LectureContent from './LectureContent';
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
  // True once a question has reached its terminal outcome (green/yellow/red).
  const [resolved, setResolved] = useState(false);
  const [runSignal, setRunSignal] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [completed, setCompleted] = useState(false);
  const [showLecture, setShowLecture] = useState(false);

  // Number of attempts spent on the current question, and the last lock outcome.
  const triesRef = useRef(0);
  const lastCorrectRef = useRef(false);

  // Initialise / resume at the saved step.
  useEffect(() => {
    const p = progress.ensureStarted(lesson);
    const idx = lesson.steps.findIndex((s) => s.id === p.currentStepId);
    /* eslint-disable react-hooks/set-state-in-effect */
    setStepIndex(idx >= 0 ? idx : 0);
    setCompleted(allQuestionsResolved(lesson, p));
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
    setShowLecture(false);
    setCorrect(false);
    setResolved(false);
    triesRef.current = 0;
    lastCorrectRef.current = false;
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
    triesRef.current += 1;
    const ok = isCorrect(value, currentStep.answer ?? 0, currentStep.tolerance ?? 0);
    lastCorrectRef.current = ok;
    setCorrect(ok);
    setInputError('');
    setPhase('running');
    setRunSignal((n) => n + 1);
  }

  function onSettled(currentStep: LessonStep) {
    const ok = lastCorrectRef.current;
    if (ok) {
      const color = triesRef.current === 1 ? 'green' : 'yellow';
      const result = progress.recordResult(lesson, currentStep, color);
      setResolved(true);
      setPhase('feedback');
      // Bigger burst for a clean first-try (green) answer.
      fireConfetti({ count: color === 'green' ? 160 : 100 });
      celebrate(result.masteredNow);
      return;
    }
    if (triesRef.current >= 2) {
      const result = progress.recordResult(lesson, currentStep, 'red');
      setResolved(true);
      if (result.triggerReview) setShowReview(true);
      setPhase('feedback');
      return;
    }
    // First miss — let them read the simulation and try once more.
    setResolved(false);
    setPhase('feedback');
  }

  function celebrate(masteredNow: boolean) {
    if (!masteredNow) return;
    setMilestone(
      lesson.index === 1
        ? 'First lesson mastered! You\u2019re on your way.'
        : `Lesson ${lesson.index} mastered \u2014 a perfect run!`,
    );
    const allMastered = lessons
      .filter((l) => l.status === 'built')
      .every((l) => (l.id === lesson.id ? true : progress.get(l.id)?.mastered));
    if (allMastered) setMilestone('Incredible \u2014 every available lesson mastered!');
  }

  function tryAgain() {
    setGuess('');
    setInputError('');
    setPhase('predict');
  }

  function continueFromProblem() {
    const isLast = stepIndex >= lesson.steps.length - 1;
    if (isLast) {
      setCompleted(true);
    } else {
      advance();
    }
  }

  function retryLesson() {
    progress.resetLessonResults(lesson);
    const firstProblemIdx = lesson.steps.findIndex((s) => s.type === 'problem');
    const target = firstProblemIdx >= 0 ? firstProblemIdx : 0;
    setCompleted(false);
    setStepIndex(target);
    progress.setCurrentStep(lesson.id, lesson.steps[target].id);
    resetStepUi();
  }

  if (!step) return <div className="center-note">This lesson is coming soon.</div>;

  if (completed) {
    const p = progress.get(lesson.id);
    const next = recommendNext(lessons, progress.all);
    const nextLesson = next && next.id !== lesson.id ? next : null;
    return (
      <CompletionScreen
        lesson={lesson}
        progress={p}
        cleared={p?.cleared ?? false}
        mastered={p?.mastered ?? false}
        nextLesson={nextLesson}
        onNext={() => nextLesson && navigate(`/learn/${nextLesson.id}`)}
        onRetry={retryLesson}
        onBackToCourse={() => navigate('/learn')}
      />
    );
  }

  const Sim = step.simulation ? simulations[step.simulation] : null;
  const problems = gradableSteps(lesson);
  const lessonProgress = progress.get(lesson.id);
  const solvedCount = problems.filter((p) =>
    lessonProgress?.completedProblemIds.includes(p.id),
  ).length;
  const isFinalMiss = step.type === 'problem' && phase === 'feedback' && !correct && resolved;
  const isRetryMiss = step.type === 'problem' && phase === 'feedback' && !correct && !resolved;

  const stepLabel = step.type === 'concept' ? 'Concept' : 'Problem';

  return (
    <div className="player">
      {milestone && <MilestoneBanner text={milestone} onDismiss={() => setMilestone('')} />}

      <div className="player-top">
        <button type="button" className="back-link" onClick={() => navigate('/learn')}>
          ← Course
        </button>
        <span className="player-step-count">
          {solvedCount}/{problems.length} cleared
        </span>
      </div>

      <QuestionBar
        lesson={lesson}
        progress={lessonProgress}
        currentId={step.type === 'problem' ? step.id : undefined}
      />

      <header className="player-head">
        <p className="player-lesson-title">{lesson.title}</p>
        <div className="player-step-heading">
          <span className={`step-tag tag-${step.type}`}>{stepLabel}</span>
          <h2 className="player-step-title">{step.title}</h2>
          {step.type === 'problem' && conceptStep && (
            <button
              type="button"
              className="lecture-toggle"
              onClick={() => setShowLecture((v) => !v)}
              aria-expanded={showLecture}
            >
              {showLecture ? 'Hide lecture' : '📖 Review lecture'}
            </button>
          )}
        </div>
        {step.type === 'problem' && (
          <>
            <p className="player-body">{step.body}</p>
            {step.question && <p className="player-question">{step.question}</p>}
          </>
        )}
      </header>

      {step.type === 'concept' && (
        <div className="lecture-panel">
          <LectureContent step={step} />
        </div>
      )}

      {step.type === 'problem' && showLecture && conceptStep && (
        <div className="lecture-panel lecture-review">
          <div className="lecture-review-head">
            <span className="lecture-review-title">Lecture · {conceptStep.title}</span>
            <button
              type="button"
              className="lecture-review-close"
              onClick={() => setShowLecture(false)}
              aria-label="Close lecture"
            >
              ×
            </button>
          </div>
          <LectureContent step={conceptStep} />
        </div>
      )}

      <div className="player-stage">
        <section className="player-sim">
          {Sim && (
            <Sim
              key={step.id}
              config={step.simConfig ?? {}}
              mode={step.type === 'concept' ? 'explore' : 'verify'}
              runSignal={step.type === 'problem' ? runSignal : 0}
              onSettled={step.type === 'problem' ? () => onSettled(step) : undefined}
            />
          )}
          {step.type === 'problem' && phase === 'running' && (
            <p className="player-running">Running the simulation…</p>
          )}
        </section>

        <aside className="player-panel">
          {step.type === 'concept' && (
            <div className="panel-block">
              <p className="panel-hint">Explore freely, then continue when you&rsquo;re ready.</p>
              <button type="button" className="btn btn-primary btn-block" onClick={advance}>
                Continue
              </button>
            </div>
          )}

          {step.type === 'problem' && phase === 'predict' && (
            <div className="predict panel-block">
              <p className="panel-hint">
                {triesRef.current === 0
                  ? 'Commit a prediction, then run the simulation to check it. You get two tries.'
                  : 'One try left — read the simulation result and enter your answer.'}
              </p>
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
              {step.unit && <span className="predict-unit">Answer as a {step.unit}.</span>}
              {inputError && <span className="predict-error">{inputError}</span>}
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => lockPrediction(step)}
              >
                {triesRef.current === 0 ? 'Lock in & run' : 'Lock in second try'}
              </button>
            </div>
          )}

          {step.type === 'problem' && phase === 'running' && (
            <div className="panel-block">
              <p className="panel-hint">Watching the long run unfold…</p>
            </div>
          )}

          {step.type === 'problem' && phase === 'feedback' && step.feedback && (
            <div className="panel-block">
              <FeedbackBanner
                correct={correct}
                message={correct ? step.feedback.correct : step.feedback.incorrect}
                truth={
                  correct || isFinalMiss
                    ? step.unit === 'sum'
                      ? `The answer is ${step.answer}.`
                      : `The true value is ${(step.answer ?? 0).toFixed(3)}.`
                    : undefined
                }
              />
              {isRetryMiss && (
                <p className="panel-hint">
                  Not quite. The simulation above shows how it settles — enter your second answer.
                </p>
              )}
              {showReview && conceptStep && (
                <div className="review">
                  <strong className="review-title">Quick review: {conceptStep.title}</strong>
                  <p>{conceptStep.body}</p>
                </div>
              )}
              {resolved ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={continueFromProblem}
                >
                  Continue
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-block" onClick={tryAgain}>
                  Try again (last try)
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
