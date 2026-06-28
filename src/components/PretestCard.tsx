import { useState } from 'react';
import type { LessonStep } from '../types/lesson';
import { parseNumericInput, answerHint } from '../lib/answer';
import PredictScale from './PredictScale';

interface Props {
  step: LessonStep;
  lessonTitle: string;
  onSubmit: (guess: number) => void;
  onSkip: () => void;
}

/**
 * Pretesting (errorful generation): a single cold guess captured *before* the
 * lesson teaches anything. It is never graded — the value is only stored to power
 * the intuition-vs-reality reveal on the completion screen. No simulation runs and
 * no answer is shown here; the lesson itself closes the gap right after.
 */
export default function PretestCard({ step, lessonTitle, onSubmit, onSkip }: Props) {
  const isSlider = step.interaction === 'slider';
  const sliderMid = (() => {
    const lo = step.sliderMin ?? 0;
    const hi = step.sliderMax ?? 1;
    const st = step.sliderStep ?? 0.01;
    return Math.round((lo + hi) / 2 / st) * st;
  })();
  const [guess, setGuess] = useState<string>(isSlider ? String(sliderMid) : '');
  const [error, setError] = useState('');

  function lockIn() {
    const value = parseNumericInput(guess);
    if (value === null) {
      setError('Enter a number — a decimal or fraction, e.g. 0.5 or 1/2.');
      return;
    }
    setError('');
    onSubmit(value);
  }

  return (
    <section className="panel pretest">
      <div className="pretest-head">
        <p className="pretest-eyebrow">Before we start</p>
        <span className="pretest-topic">{lessonTitle}</span>
      </div>
      <h3 className="pretest-title">What&rsquo;s your gut estimate?</h3>
      <p className="pretest-lead">
        No teaching yet — just guess. Being wrong here actually helps you learn the idea faster.
      </p>

      <p className="pretest-body">{step.body}</p>
      {step.question && <p className="pretest-question">{step.question}</p>}

      <div className="pretest-answer">
        {isSlider ? (
          <PredictScale
            min={step.sliderMin ?? 0}
            max={step.sliderMax ?? 1}
            step={step.sliderStep ?? 0.01}
            value={guess === '' ? (step.sliderMin ?? 0) : Number(guess)}
            onChange={(v) => setGuess(String(v))}
            unit={step.unit}
          />
        ) : (
          <>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              className="predict-input"
              placeholder="Your gut guess"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lockIn()}
            />
            <span className="predict-unit">{answerHint(step.unit)}</span>
          </>
        )}
        {error && <span className="predict-error">{error}</span>}

        <button type="button" className="btn btn-primary btn-block" onClick={lockIn}>
          Lock in my guess
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onSkip}>
          I&rsquo;m not sure — teach me
        </button>
      </div>
    </section>
  );
}
