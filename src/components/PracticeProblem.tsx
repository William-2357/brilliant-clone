import { useRef, useState } from 'react';
import type { LessonStep } from '../types/lesson';
import { isCorrect } from '../lib/probability';
import { parseNumericInput, answerHint } from '../lib/answer';
import { useExplainAI } from '../hooks/useExplainAI';
import { fetchAiExplanation, aiConfigured } from '../lib/coachClient';
import type { ExplainInput } from '../lib/explain';
import FeedbackBanner from './FeedbackBanner';
import PredictScale from './PredictScale';
import OrderItems from './OrderItems';
import DrawDistribution from './DrawDistribution';
import WheelSegments from './WheelSegments';

/**
 * How the problem is graded — the engine always judges the committed answer (the
 * deterministic engine owns grading, never a fallible self-report). The modes only
 * differ in how many attempts the learner gets:
 *   'retry'  — a wrong attempt lets the learner try again or reveal it (the Problem
 *              of the Day flow).
 *   'single' — one committed attempt is final: a wrong answer immediately reveals
 *              the truth and resolves as a miss. With no retries it can't be
 *              brute-forced, and with engine grading it can't be self-deceived —
 *              so the spaced-repetition schedule reflects genuine recall (Mixed
 *              Practice). It keeps Anki's *spacing*; the engine, not the honor
 *              system, decides right vs. wrong.
 */
export type PracticeMode = 'retry' | 'single';

interface Props {
  /** The concrete problem to render (already built by generateProblem). */
  step: LessonStep;
  /** Lesson/concept this problem teaches — used for the AI explanation context. */
  topic: string;
  /**
   * Called exactly once when the problem reaches a terminal state: `true` when the
   * engine grades the committed answer correct, `false` on a miss / reveal. The
   * parent decides what happens next (record a review, advance the session, …).
   */
  onResolved: (correct: boolean) => void;
  /** Attempts allowed — defaults to 'retry' (Problem of the Day). Mixed Practice uses 'single'. */
  mode?: PracticeMode;
}

type Status = 'open' | 'solved' | 'revealed';

/** Format a numeric answer the way its unit expects (mirrors the lesson reveal). */
function fmtAnswer(step: LessonStep, v: number): string {
  if (step.unit === 'count' || step.unit === 'sum') return String(Math.round(v));
  if (step.unit === 'dollars') return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
  return v.toFixed(3);
}

/** Midpoint of a slider's range, snapped to its step — the neutral starting guess. */
function sliderMid(step: LessonStep): string {
  const lo = step.sliderMin ?? 0;
  const hi = step.sliderMax ?? 1;
  const st = step.sliderStep ?? 0.01;
  return String(Math.round((lo + hi) / 2 / st) * st);
}

/**
 * A single standalone predict-then-verify problem, generalized across every
 * interaction type (numeric / slider / order / draw / wheel). It renders the
 * problem, reveals the truth, and reports the outcome via `onResolved`; it owns no
 * persistence, navigation, or celebration. Reused by the Problem of the Day
 * ('retry' mode — the app grades) and Mixed Practice ('self' mode — Anki-style
 * self-rating). The answer always comes from `step.answer` / `step.answerOrder` /
 * `step.answerShape` (computed upstream by probability.ts) — never derived here.
 *
 * Callers must give each problem a stable identity (a memoized step, or a `key`
 * per problem) so this component's internal state initializes once per problem.
 */
export default function PracticeProblem({ step, topic, onResolved, mode = 'retry' }: Props) {
  const [explainAI] = useExplainAI();
  const interaction = step.interaction ?? 'numeric';
  const singleAttempt = mode === 'single';

  const [status, setStatus] = useState<Status>('open');
  const [guess, setGuess] = useState(() => (interaction === 'slider' ? sliderMid(step) : ''));
  const [order, setOrder] = useState<number[]>(() =>
    interaction === 'order' && step.orderItems ? step.orderItems.slice() : [],
  );
  const [drawn, setDrawn] = useState<number[]>(() =>
    interaction === 'draw' && step.drawCategories ? new Array(step.drawCategories.length).fill(0) : [],
  );
  const [probs, setProbs] = useState<number[]>(() =>
    interaction === 'wheel' && step.wheelPayouts?.length
      ? new Array(step.wheelPayouts.length).fill(1 / step.wheelPayouts.length)
      : [],
  );
  const [tried, setTried] = useState(false);
  const [error, setError] = useState('');
  const [aiExplain, setAiExplain] = useState<{
    text: string;
    source: 'template' | 'ai' | 'loading';
  } | null>(null);
  const explainSeqRef = useRef(0);

  const answer = step.answer ?? 0;
  const showTruth = status !== 'open';

  /** Grade the committed prediction; returns null (and sets an error) on bad input. */
  function grade(): boolean | null {
    if (interaction === 'order') {
      const target = step.answerOrder ?? [];
      return order.length === target.length && order.every((v, i) => v === target[i]);
    }
    if (interaction === 'draw') {
      const truth = step.answerShape ?? [];
      const total = drawn.reduce((a, b) => a + b, 0);
      if (total <= 0) {
        setError('Sketch the bars first.');
        return null;
      }
      const dist = drawn.map((h) => h / total);
      const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
      return tv <= (step.tolerance ?? 0.15);
    }
    if (interaction === 'wheel') {
      const payouts = step.wheelPayouts ?? [];
      const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
      return isCorrect(ev, answer, step.tolerance ?? 0);
    }
    const value = parseNumericInput(guess);
    if (value === null) {
      setError('Enter a number — a decimal or fraction, e.g. 0.5 or 1/2.');
      return null;
    }
    return isCorrect(value, answer, step.tolerance ?? 0);
  }

  /** Grade the committed answer with the engine. In 'retry' a wrong answer stays
   *  open for another try; in 'single' it's final and reveals the truth at once. */
  function check() {
    const ok = grade();
    if (ok === null) return;
    setError('');
    if (ok) {
      setStatus('solved');
      onResolved(true);
    } else if (singleAttempt) {
      setStatus('revealed');
      onResolved(false);
      requestExplanation();
    } else {
      setTried(true);
    }
  }

  /** Give up and reveal the answer (resolves as a miss). */
  function reveal() {
    setStatus('revealed');
    onResolved(false);
    requestExplanation();
  }

  /** Learner's vs. the correct answer, as readable strings for the AI payload. */
  function describeAnswers(): { learner: string; correct: string } {
    if (interaction === 'order') {
      return { learner: order.join(' › '), correct: (step.answerOrder ?? []).join(' › ') };
    }
    if (interaction === 'draw') {
      return { learner: 'a hand-sketched distribution', correct: 'the computed distribution shape' };
    }
    if (interaction === 'wheel') {
      const ev = (step.wheelPayouts ?? []).reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
      return { learner: `an expected payout of $${ev.toFixed(2)}`, correct: `$${answer}` };
    }
    return {
      learner: guess.trim() === '' ? '(no value entered)' : guess.trim(),
      correct: fmtAnswer(step, answer),
    };
  }

  /** On a miss, render the hand-written hint, then swap in an AI explanation if connected. */
  function requestExplanation() {
    const hint = step.feedback?.incorrect ?? '';
    if (!explainAI || !hint || !aiConfigured()) return;
    const { learner, correct } = describeAnswers();
    const input: ExplainInput = {
      surface: 'daily',
      topic,
      question: step.question ? `${step.body} ${step.question}` : step.body,
      interaction,
      unit: step.unit,
      learnerAnswer: learner,
      correctAnswer: correct,
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

  let truthLine: string | undefined;
  if (showTruth) {
    if (interaction === 'order') {
      truthLine = `Most to least likely: ${(step.answerOrder ?? []).join(' › ')}.`;
    } else if (interaction === 'draw') {
      truthLine = 'The blue outline is the true distribution.';
    } else if (interaction === 'wheel') {
      truthLine = `A fair wheel has an expected payout of $${answer}.`;
    } else {
      truthLine = `The answer is ${fmtAnswer(step, answer)}.`;
    }
  }

  /** The locked interaction with the true value overlaid — shared by every resolved state. */
  function truthOverlay() {
    return (
      <>
        {interaction === 'order' && (
          <OrderItems items={order} answer={step.answerOrder} labels={step.orderLabels} disabled onChange={() => {}} />
        )}
        {interaction === 'draw' && (
          <DrawDistribution
            categories={step.drawCategories ?? []}
            value={drawn}
            truth={step.answerShape}
            showTruth
            disabled
            onChange={() => {}}
          />
        )}
        {interaction === 'slider' && (
          <PredictScale
            min={step.sliderMin ?? 0}
            max={step.sliderMax ?? 1}
            step={step.sliderStep ?? 0.01}
            value={guess === '' ? (step.sliderMin ?? 0) : Number(guess)}
            onChange={() => {}}
            unit={step.unit}
            truth={answer}
            showTruth
            disabled
          />
        )}
        {interaction === 'wheel' && (
          <WheelSegments
            payouts={step.wheelPayouts ?? []}
            probs={probs}
            onChange={() => {}}
            target={answer}
            disabled
            reveal
          />
        )}
      </>
    );
  }

  if (status === 'solved' || status === 'revealed') {
    const solved = status === 'solved';
    return (
      <div className="practice-feedback">
        <FeedbackBanner
          correct={solved}
          message={
            solved
              ? step.feedback?.correct ?? 'Nicely done.'
              : aiExplain?.text ?? step.feedback?.incorrect ?? 'Here is the reasoning.'
          }
          truth={truthLine}
          source={
            !solved && aiExplain?.source === 'ai'
              ? 'ai'
              : !solved && aiExplain?.source === 'loading'
                ? 'loading'
                : undefined
          }
        />
        {truthOverlay()}
      </div>
    );
  }

  const blockLabel =
    interaction === 'order'
      ? 'Check the ranking'
      : interaction === 'draw'
        ? 'Check the sketch'
        : interaction === 'wheel'
          ? 'Check the wheel'
          : 'Check';

  return (
    <div className="practice-answer">
      {singleAttempt && (
        <p className="predict-unit practice-oneshot">One shot — commit your best answer.</p>
      )}

      {interaction === 'numeric' && (
        <>
          <div className="practice-input-row">
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
          <button type="button" className="btn btn-primary btn-block" onClick={check}>
            Check
          </button>
        </>
      )}

      {interaction === 'order' && (
        <>
          <span className="predict-unit">Put the most likely outcome at the top.</span>
          <OrderItems items={order} onChange={setOrder} labels={step.orderLabels} />
          <button type="button" className="btn btn-primary btn-block" onClick={check}>
            {blockLabel}
          </button>
        </>
      )}

      {interaction === 'draw' && (
        <>
          <span className="predict-unit">Drag across the pad to sketch the shape you expect.</span>
          <DrawDistribution categories={step.drawCategories ?? []} value={drawn} onChange={setDrawn} />
          <button type="button" className="btn btn-primary btn-block" onClick={check}>
            {blockLabel}
          </button>
        </>
      )}

      {interaction === 'wheel' && (
        <>
          <span className="predict-unit">Drag the dividers so the wheel's expected payout meets the target.</span>
          <WheelSegments
            payouts={step.wheelPayouts ?? []}
            probs={probs}
            onChange={setProbs}
            target={answer}
            reveal={false}
          />
          <button type="button" className="btn btn-primary btn-block" onClick={check}>
            {blockLabel}
          </button>
        </>
      )}

      {tried && (
        <p className="practice-retry" role="status">
          Not quite — take another look and try again.
        </p>
      )}
      {error && <span className="predict-error">{error}</span>}
      <button type="button" className="practice-reveal" onClick={reveal}>
        {singleAttempt ? "I don't know — reveal" : 'Reveal answer'}
      </button>
    </div>
  );
}
