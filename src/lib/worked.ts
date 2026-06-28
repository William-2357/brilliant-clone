/**
 * Worked-example derivation for the worked → completion → full scaffolding
 * progression (FR-11.4, extended). A `WorkedExample` is a term-by-term breakdown
 * of a computation; the lesson player shows a fully worked *canonical* example
 * first, then a *completion* problem (the learner's own instance with the final
 * line blanked), then fades to cold problems.
 *
 * Crucially the numbers are **derived from the step's own `simConfig`/`answer`**
 * (which are themselves computed by `probability.ts`), so this works whether the
 * problem came from a template or the pre-generated bank — and never invents a
 * number the engine didn't already produce. When a step's computation can't be
 * reconstructed cleanly, `deriveWorked` returns null and the player falls back to
 * the existing (binary) scaffold, so every other lesson degrades gracefully.
 */
import type { LessonStep, SimulationType } from '../types/lesson';
import { expectedValue, type WheelSegment } from './probability';

export interface WorkedLine {
  /** Left side of the line, e.g. "$5 × 0.40" (may contain $...$ inline math). */
  label: string;
  /** The line's value, e.g. "$2.00". Hidden when the line is blanked. */
  value: string;
}

export interface WorkedExample {
  intro: string;
  lines: WorkedLine[];
  result: string;
  resultLabel: string;
}

const money = (x: number): string => `$${Number.isInteger(x) ? x.toFixed(0) : x.toFixed(2)}`;
const pctOf = (p: number): string => `${Math.round(p * 100)}%`;

/** Decode a prize wheel out of the flat numeric simConfig (mirrors simData.readWheel). */
function readWheelConfig(cfg: Record<string, number>): WheelSegment[] {
  const n = cfg.n ?? 0;
  const segs: WheelSegment[] = [];
  for (let i = 0; i < n; i++) {
    segs.push({ value: cfg[`v${i}`] ?? 0, p: cfg[`p${i}`] ?? 0 });
  }
  return segs;
}

/** Expected value, worked term-by-term: each payout × its probability, summed. */
function expectedValueWorked(segs: WheelSegment[]): WorkedExample {
  return {
    intro: 'Expected value weights each payout by its probability, then adds the pieces.',
    lines: segs.map((s) => ({
      label: `${money(s.value)} × ${s.p.toFixed(2)}`,
      value: money(s.value * s.p),
    })),
    result: money(expectedValue(segs)),
    resultLabel: 'Expected payout',
  };
}

/** A long-run count, worked: the rate times the number of trials. */
function longRunCountWorked(p: number, n: number): WorkedExample {
  const cnt = Math.round(p * n);
  return {
    intro: 'A long-run count is the rate times the number of trials.',
    lines: [{ label: `${pctOf(p)} of ${n}`, value: String(cnt) }],
    result: String(cnt),
    resultLabel: 'Expected count',
  };
}

/**
 * Reconstruct a worked breakdown from a problem's own data, for the *completion*
 * stage (the learner fills in the final, blanked line). Returns null when the
 * computation isn't cleanly reconstructable from `simConfig`/`answer`, or when the
 * reconstruction wouldn't match the graded answer (a safety check, since the
 * worked result must agree with the value the learner is graded against).
 */
export function deriveWorked(step: LessonStep): WorkedExample | null {
  const interaction = step.interaction ?? 'numeric';
  if (interaction !== 'numeric' && interaction !== 'slider') return null;
  const cfg = step.simConfig ?? {};

  // Expected value (the multi-term showcase). The `spread` key marks the variance/
  // SD variants, whose answer isn't the EV — skip those.
  if (step.simulation === 'expectedValue' && step.unit === 'dollars' && cfg.spread === undefined && cfg.n) {
    const segs = readWheelConfig(cfg);
    const ev = expectedValue(segs);
    if (step.answer != null && Math.abs(ev - step.answer) > 0.01) return null;
    return expectedValueWorked(segs);
  }

  // Long-run count (rate × n).
  if (step.simulation === 'coinFlip' && step.unit === 'count' && cfg.p != null && cfg.flips != null) {
    const cnt = Math.round(cfg.p * cfg.flips);
    if (step.answer != null && Math.abs(cnt - step.answer) > 1) return null;
    return longRunCountWorked(cfg.p, cfg.flips);
  }

  return null;
}

/**
 * A fixed, fully worked study example for the *worked* stage — deliberately
 * different numbers from the learner's own instance, so studying it then solving
 * theirs is genuine practice (not copying). Scoped to expected value, the one
 * lesson whose computation is a genuine multi-term sum worth "working" (and whose
 * unit always matches the question); other sims fall back to the guided hint.
 */
export function canonicalWorked(simulation: SimulationType | undefined): WorkedExample | null {
  if (simulation === 'expectedValue') {
    return expectedValueWorked([
      { value: 5, p: 0.4 },
      { value: 10, p: 0.2 },
      { value: 0, p: 0.4 },
    ]);
  }
  return null;
}
