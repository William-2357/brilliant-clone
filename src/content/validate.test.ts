import { describe, it, expect } from 'vitest';
import { validateStep } from './validate';
import type { LessonStep } from '../types/lesson';

const numeric: LessonStep = {
  id: 't-num', type: 'problem', title: 'T', body: 'b',
  question: 'p? (decimal)', answer: 0.5, tolerance: 0.05, unit: 'probability',
  feedback: { correct: 'c', incorrect: 'i' },
};

describe('validateStep', () => {
  it('accepts a well-formed numeric problem', () => {
    expect(validateStep(numeric)).toEqual([]);
  });
  it('rejects a non-finite answer', () => {
    expect(validateStep({ ...numeric, answer: NaN }).length).toBeGreaterThan(0);
  });
  it('rejects a count problem with a sub-1 tolerance', () => {
    expect(validateStep({ ...numeric, unit: 'count', answer: 5, tolerance: 0.5 }).length).toBeGreaterThan(0);
  });
  it('rejects an order step whose answerOrder is not a permutation', () => {
    const bad: LessonStep = {
      ...numeric, id: 't-ord', interaction: 'order',
      orderItems: [2, 3, 4], answerOrder: [2, 3, 9], unit: 'order',
    };
    expect(validateStep(bad).length).toBeGreaterThan(0);
  });
  it('rejects a draw shape that does not sum to 1', () => {
    const bad: LessonStep = {
      ...numeric, id: 't-draw', interaction: 'draw',
      drawCategories: [0, 1, 2], answerShape: [0.2, 0.2, 0.2], tolerance: 0.18, unit: 'shape',
    };
    expect(validateStep(bad).length).toBeGreaterThan(0);
  });
});
