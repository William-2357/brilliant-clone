import { describe, it, expect } from 'vitest';
import { checkArgs, computeAnswer } from './evaluate';
import { kernels } from '../../../src/content/generated/kernels';
import { drawMatchesNoReplacement } from '../../../src/lib/probability';

describe('evaluate', () => {
  it('accepts in-range args', () => {
    expect(checkArgs(kernels['montyHallSwitchWin'], [10])).toEqual([]);
  });
  it('rejects out-of-range args', () => {
    expect(checkArgs(kernels['montyHallSwitchWin'], [2]).length).toBeGreaterThan(0);
  });
  it('rejects enum args not in the allowed set', () => {
    expect(checkArgs(kernels['drawProbability'], [4, 49]).length).toBeGreaterThan(0);
  });
  it('computes the kernel answer', () => {
    expect(computeAnswer(kernels['drawMatchesNoReplacement'], [4, 52, 2]))
      .toBeCloseTo(drawMatchesNoReplacement(4, 52, 2), 12);
  });
});
