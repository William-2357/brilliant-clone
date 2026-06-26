import { describe, it, expect } from 'vitest';
import { Deduper } from './dedup';

describe('Deduper', () => {
  it('rejects an identical (kernel,args) pair', () => {
    const d = new Deduper();
    expect(d.accept('binomialPmf', [12, 6, 0.5], 'A coin is flipped twelve times.')).toBe(true);
    expect(d.accept('binomialPmf', [12, 6, 0.5], 'Totally different prose here friend.')).toBe(false);
  });
  it('rejects near-duplicate prose even with different args', () => {
    const d = new Deduper();
    const prose = 'A dealer shuffles a standard deck and deals the top two cards face down today.';
    expect(d.accept('drawMatchesNoReplacement', [4, 52, 2], prose)).toBe(true);
    expect(d.accept('drawMatchesNoReplacement', [4, 52, 3], prose)).toBe(false);
  });
});
