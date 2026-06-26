import { describe, it, expect } from 'vitest';
import { renderEntry } from './emit';
import type { GeneratedProblem } from '../../../src/content/generated/index';

const g: GeneratedProblem = {
  step: {
    id: 'gen-x', type: 'problem', title: 'T', body: 'b "quoted" line',
    question: 'q? (decimal)', answer: 0.5, tolerance: 0.05, unit: 'probability',
    feedback: { correct: 'c', incorrect: 'i' },
  },
  sectionId: 's3-conditional', kernel: 'diceSum', args: [7], tier: 'mc-school', difficulty: 2,
  provenance: { model: 'm', seed: 1, createdAt: '2026-06-25T00:00:00.000Z' },
};

describe('renderEntry', () => {
  it('produces valid JS that JSON.parse-round-trips the data portion', () => {
    const src = renderEntry(g);
    expect(src).toContain('"gen-x"');
    expect(src).toContain('kernel: "diceSum"');
    expect(src).toContain('b \\"quoted\\" line');
  });
});
