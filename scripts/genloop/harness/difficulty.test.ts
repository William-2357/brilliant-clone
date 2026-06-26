import { describe, it, expect } from 'vitest';
import { isTrivial, scoreDifficulty, tierOf } from './difficulty';

describe('difficulty', () => {
  it('flags answer-in-prose as trivial', () => {
    expect(isTrivial('The chance is 0.25 exactly.', 'What is it?', 0.25, ['one step'])).toBe(true);
  });
  it('flags a one-step solution as trivial', () => {
    expect(isTrivial('A fair coin.', 'P(heads)?', 0.5, ['read it off'])).toBe(true);
  });
  it('does not flag a multi-step, answer-not-stated problem', () => {
    expect(isTrivial('Two aces off the top of a deck.', 'P(both aces)?', 0.0045, ['4/52', 'times 3/51'])).toBe(false);
  });
  it('maps higher scores to higher tiers', () => {
    expect(tierOf(scoreDifficulty(1, ['a']))).toBe('school');
    expect(tierOf(scoreDifficulty(5, ['a', 'b', 'c', 'd']))).toBe('amc');
  });
});
