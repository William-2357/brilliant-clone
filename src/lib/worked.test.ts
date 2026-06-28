import { describe, it, expect } from 'vitest';
import { deriveWorked, canonicalWorked } from './worked';
import type { LessonStep } from '../types/lesson';

function evStep(partial: Partial<LessonStep>): LessonStep {
  return {
    id: 'l5-s2',
    type: 'problem',
    title: 'Weigh the payouts',
    body: 'A wheel pays.',
    simulation: 'expectedValue',
    unit: 'dollars',
    interaction: 'numeric',
    answer: 4,
    simConfig: { n: 3, v0: 5, p0: 0.4, v1: 10, p1: 0.2, v2: 0, p2: 0.4 },
    ...partial,
  };
}

describe('deriveWorked — expected value', () => {
  it('breaks EV into one line per segment and sums to the answer', () => {
    const w = deriveWorked(evStep({}));
    expect(w).not.toBeNull();
    expect(w!.lines).toHaveLength(3);
    expect(w!.lines[0]).toEqual({ label: '$5 × 0.40', value: '$2' });
    expect(w!.result).toBe('$4');
  });

  it('returns null for the variance/SD variant (spread set, answer ≠ EV)', () => {
    const w = deriveWorked(
      evStep({ unit: 'SD', answer: 1, simConfig: { n: 2, v0: 3, p0: 0.5, v1: 1, p1: 0.5, spread: 1 } }),
    );
    expect(w).toBeNull();
  });

  it('returns null when the reconstruction would not match the graded answer', () => {
    const w = deriveWorked(evStep({ answer: 99 }));
    expect(w).toBeNull();
  });

  it('returns null for non-numeric interactions (order/draw)', () => {
    expect(deriveWorked(evStep({ interaction: 'order', unit: 'order' }))).toBeNull();
  });
});

describe('deriveWorked — long-run count', () => {
  it('works rate × n for a coin-count problem', () => {
    const w = deriveWorked({
      id: 'l1-s2',
      type: 'problem',
      title: 'Count the outcomes',
      body: 'A run of trials.',
      simulation: 'coinFlip',
      unit: 'count',
      interaction: 'numeric',
      answer: 450,
      simConfig: { flips: 1000, p: 0.45 },
    });
    expect(w).not.toBeNull();
    expect(w!.lines[0]).toEqual({ label: '45% of 1000', value: '450' });
    expect(w!.result).toBe('450');
  });
});

describe('canonicalWorked — fixed study example', () => {
  it('gives a multi-line EV example for the expectedValue sim', () => {
    const w = canonicalWorked('expectedValue');
    expect(w).not.toBeNull();
    expect(w!.lines.length).toBeGreaterThan(1);
    expect(w!.result).toBe('$4');
  });

  it('is null for sims without a modeled worked example', () => {
    expect(canonicalWorked('galtonBoard')).toBeNull();
    expect(canonicalWorked(undefined)).toBeNull();
  });
});
