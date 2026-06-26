import { describe, it, expect } from 'vitest';
import { runOne, type Deps } from './orchestrator';
import { kernels } from '../../src/content/generated/kernels';
import { Deduper } from './harness/dedup';
import type { PlanTarget } from './types';

const target: PlanTarget = { sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', interaction: 'numeric', tier: 'mc-school', seed: 1 };

function deps(over: Partial<Deps> = {}): Deps {
  return {
    writer: async () => ({ sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', args: [4, 52, 2], interaction: 'numeric', scenarioDraft: 'A dealer deals the top two cards of a shuffled deck.', questionDraft: 'P(both aces)? (decimal)' }),
    verifier: async () => ({ ok: true, issues: [] }),
    solver: async () => ({ answer: kernels['drawMatchesNoReplacement'].fn(4, 52, 2), steps: ['4/52', 'times 3/51'], estDifficulty: 2, confident: true }),
    formatter: async () => ({ title: 'Two aces', body: 'A dealer deals the top two cards of a shuffled deck.', question: 'P(both aces)? (decimal)', feedbackCorrect: 'c', feedbackIncorrect: 'i' }),
    deduper: new Deduper(),
    model: 'fake',
    ...over,
  };
}

describe('runOne', () => {
  it('accepts when all gates pass and recompute matches', async () => {
    const res = await runOne(target, deps());
    expect(res.status).toBe('accepted');
    if (res.status === 'accepted') {
      expect(res.problem.kernel).toBe('drawMatchesNoReplacement');
      expect(Math.abs(kernels['drawMatchesNoReplacement'].fn(...res.problem.args) - (res.problem.step.answer ?? 0))).toBeLessThan(1e-9);
    }
  });
  it('rejects when the blind solver disagrees', async () => {
    const res = await runOne(target, deps({ solver: async () => ({ answer: 0.9, steps: ['x', 'y'], estDifficulty: 2, confident: true }) }));
    expect(res.status).toBe('rejected');
  });
  it('rejects when the verifier says not ok', async () => {
    const res = await runOne(target, deps({ verifier: async () => ({ ok: false, issues: ['ambiguous'] }) }));
    expect(res.status).toBe('rejected');
  });
  it('rejects a trivial (answer-in-prose) problem', async () => {
    const res = await runOne(target, deps({ writer: async () => ({ sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', args: [4, 52, 2], interaction: 'numeric', scenarioDraft: 'The answer is 0.0045.', questionDraft: 'P? (decimal)' }) }));
    expect(res.status).toBe('rejected');
  });
  it('rejects when the formatter drifts the shipped prose into answer-in-prose', async () => {
    const res = await runOne(target, deps({ formatter: async () => ({ title: 'T', body: 'The probability is 0.004524886877828055 exactly.', question: 'P? (decimal)', feedbackCorrect: 'c', feedbackIncorrect: 'i' }) }));
    expect(res.status).toBe('rejected');
  });
});
