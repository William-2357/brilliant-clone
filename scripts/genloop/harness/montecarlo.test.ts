import { describe, it, expect } from 'vitest';
import { monteCarloAgrees } from './montecarlo';
import { kernels } from '../../../src/content/generated/kernels';

describe('monteCarloAgrees', () => {
  it('confirms a correct closed form', () => {
    const k = kernels['drawMatchesNoReplacement'];
    const res = monteCarloAgrees(k, [4, 52, 2], k.fn(4, 52, 2), 0.01);
    expect(res.agrees).toBe(true);
  });
  it('rejects a wrong claimed value when a sampler exists', () => {
    const k = kernels['binomialPmf'];
    const res = monteCarloAgrees(k, [12, 6, 0.5], 0.9, 0.02);
    expect(res.agrees).toBe(false);
  });
  it('agrees (or is skipped) on buffon', () => {
    const k = kernels['buffonProbability'];
    const res = monteCarloAgrees(k, [1, 1], k.fn(1, 1), 0.02);
    expect(res.agrees || res.skipped).toBe(true);
  });
});
