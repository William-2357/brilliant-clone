import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lesson, LessonStep } from '../types/lesson';
import { lessons, gradableSteps } from '../content/lessons';
import { generateProblem } from '../content/problemTemplates';
import { hashString } from '../lib/rng';
import { recommendNext, allQuestionsResolved } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useExplainAI } from '../hooks/useExplainAI';
import { simulations } from '../simulations';
import { isCorrect } from '../lib/probability';
import { parseNumericInput, answerHint } from '../lib/answer';
import { fetchAiExplanation, aiConfigured } from '../lib/coachClient';
import type { ExplainInput } from '../lib/explain';
import { fireConfetti } from '../lib/confetti';
import FeedbackBanner from './FeedbackBanner';
import MilestoneBanner from './MilestoneBanner';
import CompletionScreen from './CompletionScreen';
import LessonReview from './LessonReview';
import QuestionBar from './QuestionBar';
import LectureContent from './LectureContent';
import OrderItems from './OrderItems';
import DrawDistribution from './DrawDistribution';
import PredictScale from './PredictScale';
import WheelSegments from './WheelSegments';
import SpeedControl from './SpeedControl';
import { navigate } from '../lib/router';

type Phase = 'predict' | 'running' | 'feedback';

interface Props {
  lesson: Lesson;
}

export default function LessonPlayer({ lesson }: Props) {
  const progress = useProgress();
  const [explainAI] = useExplainAI();
  const conceptStep = useMemo(() => lesson.steps.find((s) => s.type === 'concept'), [lesson]);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('predict');
  const [guess, setGuess] = useState('');
  // State for the non-numeric interactions: a ranking and a sketched shape.
  const [order, setOrder] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  // Wheel-segment probabilities for the "make the game fair" interaction.
  const [probs, setProbs] = useState<number[]>([]);
  const [inputError, setInputError] = useState('');
  const [correct, setCorrect] = useState(false);
  // True once a question has reached its terminal outcome (green/yellow/red).
  const [resolved, setResolved] = useState(false);
  const [runSignal, setRunSignal] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [completed, setCompleted] = useState(false);
  // True while re-reading a completed lesson read-only (vs. the completion summary).
  const [reviewing, setReviewing] = useState(false);
  const [showLecture, setShowLecture] = useState(false);
  // Generated-question pool cursor: `seed` is the learner's stable base, `attempt`
  // advances on each lesson replay, and `retry` advances on the second try of a
  // question — so retries and replays pull a different problem instead of repeating.
  const [seed, setSeed] = useState<number>(() => progress.get(lesson.id)?.seed ?? hashString(lesson.id));
  const [attempt, setAttempt] = useState<number>(() => progress.get(lesson.id)?.attempt ?? 0);
  const [retry, setRetry] = useState(0);

  // AI wrong-answer explanation (replaces the hand-written feedback on a final miss
  // when an AI backend is connected + the toggle is on; falls back otherwise).
  const [aiExplain, setAiExplain] = useState<{
    text: string;
    source: 'template' | 'ai' | 'loading';
  } | null>(null);
  const explainSeqRef = useRef(0);

  // Number of attempts spent on the current question, and the last lock outcome.
  const triesRef = useRef(0);
  const lastCorrectRef = useRef(false);

  // Initialise / resume at the saved step.
  useEffect(() => {
    const p = progress.ensureStarted(lesson);
    const idx = lesson.steps.findIndex((s) => s.id === p.currentStepId);
    /* eslint-disable react-hooks/set-state-in-effect */
    setSeed(p.seed ?? hashString(lesson.id));
    setAttempt(p.attempt ?? 0);
    setStepIndex(idx >= 0 ? idx : 0);
    setCompleted(allQuestionsResolved(lesson, p));
    setReviewing(false);
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
    setRetry(0);
    // Invalidate any in-flight explanation request and clear the panel.
    explainSeqRef.current += 1;
    setAiExplain(null);
    triesRef.current = 0;
    lastCorrectRef.current = false;
    // Reset the run trigger so a freshly shown problem does NOT auto-run on mount.
    // A run only happens once the learner locks a prediction (runSignal -> >0).
    setRunSignal(0);
  }

  const baseStep = lesson.steps[stepIndex];
  // Overlay the generated (parameterized) problem for this slot + seed. Concept
  // steps and slots without a template fall back to the static step.
  const step = useMemo(
    () => (baseStep ? generateProblem(lesson.id, baseStep, seed, attempt, retry) : baseStep),
    [lesson.id, baseStep, seed, attempt, retry],
  );

  // Seed the order/draw interaction state whenever the visible (generated) step changes.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrder(step?.interaction === 'order' && step.orderItems ? step.orderItems.slice() : []);
    setDrawn(
      step?.interaction === 'draw' && step.drawCategories
        ? new Array(step.drawCategories.length).fill(0)
        : [],
    );
    if (step?.interaction === 'slider') {
      const lo = step.sliderMin ?? 0;
      const hi = step.sliderMax ?? 1;
      const st = step.sliderStep ?? 0.01;
      setGuess(String(Math.round((lo + hi) / 2 / st) * st));
    }
    setProbs(
      step?.interaction === 'wheel' && step.wheelPayouts?.length
        ? new Array(step.wheelPayouts.length).fill(1 / step.wheelPayouts.length)
        : [],
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [step]);

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

  // Grade the committed prediction for whichever interaction this step uses.
  // Returns null when the input is invalid (an error message is set instead).
  function gradeInteraction(currentStep: LessonStep): boolean | null {
    const interaction = currentStep.interaction ?? 'numeric';
    if (interaction === 'order') {
      const target = currentStep.answerOrder ?? [];
      return order.length === target.length && order.every((v, i) => v === target[i]);
    }
    if (interaction === 'draw') {
      const truth = currentStep.answerShape ?? [];
      const total = drawn.reduce((a, b) => a + b, 0);
      if (total <= 0) {
        setInputError('Sketch the bars first.');
        return null;
      }
      const dist = drawn.map((h) => h / total);
      const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
      return tv <= (currentStep.tolerance ?? 0.15);
    }
    if (interaction === 'wheel') {
      const payouts = currentStep.wheelPayouts ?? [];
      const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
      return isCorrect(ev, currentStep.answer ?? 0, currentStep.tolerance ?? 0);
    }
    // numeric and slider both grade a single value against `answer`.
    const value = parseNumericInput(guess);
    if (value === null) {
      setInputError('Enter a number — a decimal or fraction, e.g. 0.5 or 1/2.');
      return null;
    }
    return isCorrect(value, currentStep.answer ?? 0, currentStep.tolerance ?? 0);
  }

  function lockPrediction(currentStep: LessonStep) {
    const ok = gradeInteraction(currentStep);
    if (ok === null) return;
    triesRef.current += 1;
    lastCorrectRef.current = ok;
    setCorrect(ok);
    setInputError('');
    // First wrong attempt: withhold the answer entirely — don't run the simulation
    // (which would reveal it). Just prompt one more try. The sim runs and reveals
    // only when the answer is correct or on the second attempt.
    if (!ok && triesRef.current < 2) {
      setResolved(false);
      setPhase('feedback');
      return;
    }
    // The wheel interaction has no batch sim to run — resolve immediately.
    const hasSim = currentStep.interaction !== 'wheel' && !!currentStep.simulation;
    if (hasSim) {
      setPhase('running');
      setRunSignal((n) => n + 1);
    } else {
      onSettled(currentStep);
    }
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
    // Reached only on the second wrong attempt — the first never runs the sim.
    const result = progress.recordResult(lesson, currentStep, 'red');
    setResolved(true);
    if (result.triggerReview) setShowReview(true);
    setPhase('feedback');
    requestExplanation(currentStep);
  }

  /** Human-readable learner vs. correct answer for the current interaction. */
  function describeAnswers(s: LessonStep): { learner: string; correct: string } {
    const it = s.interaction ?? 'numeric';
    if (it === 'order') {
      return { learner: order.join(' › '), correct: (s.answerOrder ?? []).join(' › ') };
    }
    if (it === 'draw') {
      return { learner: 'a hand-sketched distribution', correct: 'the computed distribution shape' };
    }
    if (it === 'wheel') {
      const ev = (s.wheelPayouts ?? []).reduce((sum, v, i) => sum + v * (probs[i] ?? 0), 0);
      return { learner: `an expected payout of $${ev.toFixed(2)}`, correct: `$${s.answer}` };
    }
    const learner = guess.trim() === '' ? '(no value entered)' : guess.trim();
    const correct =
      s.unit === 'count' || s.unit === 'sum' ? String(s.answer) : (s.answer ?? 0).toFixed(3);
    return { learner, correct };
  }

  /**
   * On a resolved miss, render the hand-written hint immediately, then swap in an AI
   * explanation if the toggle is on and a backend answers (else keep the hint).
   */
  function requestExplanation(currentStep: LessonStep) {
    const hint = currentStep.feedback?.incorrect ?? '';
    // Only reach for AI when the toggle is on AND an endpoint is configured; otherwise
    // the hand-written feedback stands (no "thinking…" flash without a backend).
    if (!explainAI || !hint || !aiConfigured()) return;
    const { learner, correct: correctStr } = describeAnswers(currentStep);
    const input: ExplainInput = {
      surface: 'lesson',
      topic: conceptStep ? `${lesson.title} — ${conceptStep.title}` : lesson.title,
      question: currentStep.question ? `${currentStep.body} ${currentStep.question}` : currentStep.body,
      interaction: currentStep.interaction ?? 'numeric',
      unit: currentStep.unit,
      learnerAnswer: learner,
      correctAnswer: correctStr,
      tolerance: currentStep.tolerance,
      authorHint: hint,
    };
    const seq = ++explainSeqRef.current;
    setAiExplain({ text: hint, source: 'loading' });
    void fetchAiExplanation(input).then((ai) => {
      if (seq !== explainSeqRef.current) return;
      setAiExplain(ai ? { text: ai, source: 'ai' } : { text: hint, source: 'template' });
    });
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
    // Pull a different problem from the pool for the second try.
    setRetry((r) => r + 1);
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
    setReviewing(false);
    progress.resetLessonResults(lesson);
    setSeed(progress.get(lesson.id)?.seed ?? hashString(lesson.id));
    setAttempt(progress.get(lesson.id)?.attempt ?? 0);
    const firstProblemIdx = lesson.steps.findIndex((s) => s.type === 'problem');
    const target = firstProblemIdx >= 0 ? firstProblemIdx : 0;
    setCompleted(false);
    setStepIndex(target);
    progress.setCurrentStep(lesson.id, lesson.steps[target].id);
    resetStepUi();
  }

  if (!step) return <div className="center-note">This lesson is coming soon.</div>;

  if (completed) {
    if (reviewing) {
      return (
        <LessonReview
          lesson={lesson}
          onExit={() => setReviewing(false)}
        />
      );
    }
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
        onReview={() => setReviewing(true)}
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

  const stepLabel = step.type === 'concept' ? 'Concept' : 'Problem';
  const interaction = step.interaction ?? 'numeric';
  const showTruth = correct || isFinalMiss;
  let truthLine: string | undefined;
  if (showTruth) {
    if (interaction === 'order') {
      truthLine = `Most to least likely: ${(step.answerOrder ?? []).join(' › ')}.`;
    } else if (interaction === 'draw') {
      truthLine = 'The blue outline is the true distribution.';
    } else if (interaction === 'wheel') {
      truthLine = `A fair wheel has an expected payout of $${step.answer}.`;
    } else {
      truthLine =
        step.unit === 'sum' || step.unit === 'count'
          ? `The answer is ${step.answer}.`
          : `The true value is ${(step.answer ?? 0).toFixed(3)}.`;
    }
  }

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

      {step.type === 'concept' ? (
        <>
          <div className="concept-grid">
            <div className="concept-lecture">
              <div className="lecture-panel">
                <LectureContent step={step} />
              </div>
            </div>
            <div className="concept-sim">
              <p className="panel-hint explore-hint">
                Explore the simulation freely, then continue when you&rsquo;re ready.
              </p>
              <section className="player-sim">
                {Sim && (
                  <Sim
                    key={`${step.id}:${seed}:${attempt}`}
                    config={step.simConfig ?? {}}
                    mode="explore"
                    runSignal={0}
                  />
                )}
                {Sim && <SpeedControl />}
              </section>
            </div>
          </div>
          <div className="explore-actions">
            <button type="button" className="btn btn-primary explore-continue" onClick={advance}>
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="player-stage">
          <section className="player-sim">
            {interaction === 'wheel' ? (
              <WheelSegments
                payouts={step.wheelPayouts ?? []}
                probs={probs}
                onChange={setProbs}
                target={step.answer ?? 0}
                disabled={phase !== 'predict'}
                reveal={showTruth}
              />
            ) : (
              <>
                {Sim && (
                  <Sim
                    key={`${step.id}:${seed}:${attempt}:${retry}`}
                    config={step.simConfig ?? {}}
                    mode="verify"
                    runSignal={runSignal}
                    onSettled={() => onSettled(step)}
                  />
                )}
                {phase === 'running' && <p className="player-running">Running the simulation…</p>}
                {Sim && <SpeedControl />}
              </>
            )}
          </section>

          <aside className="player-panel">
            {phase === 'predict' && (
              <div className="predict panel-block">
                <p className="panel-hint">
                  {triesRef.current === 0
                    ? 'Commit a prediction, then run the simulation to check it. You get two tries.'
                    : 'One try left — think it through and commit your answer; the simulation reveals the result this time.'}
                </p>

                {interaction === 'numeric' && (
                  <>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      className="predict-input"
                      placeholder="Your prediction"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && lockPrediction(step)}
                    />
                    <span className="predict-unit">{answerHint(step.unit)}</span>
                  </>
                )}

                {interaction === 'slider' && (
                  <>
                    <span className="predict-unit">Drag the handle to your prediction.</span>
                    <PredictScale
                      min={step.sliderMin ?? 0}
                      max={step.sliderMax ?? 1}
                      step={step.sliderStep ?? 0.01}
                      value={guess === '' ? (step.sliderMin ?? 0) : Number(guess)}
                      onChange={(v) => setGuess(String(v))}
                      unit={step.unit}
                    />
                  </>
                )}

                {interaction === 'order' && (
                  <>
                    <span className="predict-unit">Put the most likely outcome at the top.</span>
                    <OrderItems items={order} onChange={setOrder} labels={step.orderLabels} />
                  </>
                )}

                {interaction === 'draw' && (
                  <>
                    <span className="predict-unit">Drag across the pad to sketch the shape you expect.</span>
                    <DrawDistribution
                      categories={step.drawCategories ?? []}
                      value={drawn}
                      onChange={setDrawn}
                    />
                  </>
                )}

                {interaction === 'wheel' && (
                  <span className="predict-unit">
                    Drag the dividers on the wheel so its expected payout meets the target.
                  </span>
                )}

                {inputError && <span className="predict-error">{inputError}</span>}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => lockPrediction(step)}
                >
                  {interaction === 'wheel'
                    ? 'Check the wheel'
                    : triesRef.current === 0
                      ? 'Lock in & run'
                      : 'Lock in second try'}
                </button>
              </div>
            )}

            {phase === 'running' && (
              <div className="panel-block">
                <p className="panel-hint">Watching the long run unfold…</p>
              </div>
            )}

            {phase === 'feedback' && step.feedback && (
              <div className="panel-block">
                {correct || resolved ? (
                  <FeedbackBanner
                    correct={correct}
                    message={
                      correct
                        ? step.feedback.correct
                        : aiExplain?.text ?? step.feedback.incorrect
                    }
                    truth={truthLine}
                    source={
                      !correct && aiExplain?.source === 'ai'
                        ? 'ai'
                        : !correct && aiExplain?.source === 'loading'
                          ? 'loading'
                          : undefined
                    }
                  />
                ) : (
                  <FeedbackBanner
                    correct={false}
                    message="Not quite — you have one more try. Take another look, then commit a new prediction."
                  />
                )}
                {showTruth && interaction === 'order' && (
                  <OrderItems
                    items={order}
                    answer={step.answerOrder}
                    labels={step.orderLabels}
                    disabled
                    onChange={() => {}}
                  />
                )}
                {showTruth && interaction === 'draw' && (
                  <DrawDistribution
                    categories={step.drawCategories ?? []}
                    value={drawn}
                    truth={step.answerShape}
                    showTruth
                    disabled
                    onChange={() => {}}
                  />
                )}
                {showTruth && interaction === 'slider' && (
                  <PredictScale
                    min={step.sliderMin ?? 0}
                    max={step.sliderMax ?? 1}
                    step={step.sliderStep ?? 0.01}
                    value={Number(guess)}
                    onChange={() => {}}
                    unit={step.unit}
                    truth={step.answer}
                    showTruth
                    disabled
                  />
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
      )}
    </div>
  );
}
