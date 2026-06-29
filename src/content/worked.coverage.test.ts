import { describe, it, expect } from 'vitest';
import { workedByKernel, parseWorkedResult, deriveWorked, canonicalWorked } from '../lib/worked';
import { kernels, type Kernel } from './generated/kernels';
import { generatedProblems } from './generated';
import { lessons, gradableSteps } from './lessons';
import { generateProblem } from './problemTemplates';
import { supportLevelFor } from '../store/progress';

/**
 * Representative args for the variadic kernels (whose `args` spec is empty because
 * they take a flat list). Fixed-arg kernels are sampled from their spec below.
 */
const VARIADIC: Record<string, number[]> = {
  expectedValueWheel: [5, 0.4, 10, 0.2, 0, 0.4],
  stddev: [2, 0.5, 0, 0.5],
  expectedIndicatorSum: [0.5, 0.3, 0.2],
  countProduct: [3, 4, 5],
  multinomialArrangements: [2, 2, 1],
  pearson: [3, 1, 2, 3, 2, 4, 5],
  markovStationary: [2, 0.9, 0.1, 0.2, 0.8, 0],
  extinctionProbability: [0.3, 0.3, 0.4],
};

function sampleArgs(name: string, k: Kernel): number[] {
  if (VARIADIC[name]) return VARIADIC[name];
  return k.args.map((a) => {
    if (a.kind === 'enum') return a.values![0];
    const mid = (a.min! + a.max!) / 2;
    return a.kind === 'int' ? Math.round(mid) : mid;
  });
}

const tol = (want: number) => Math.max(5e-3, Math.abs(want) * 0.03);

describe('workedByKernel — coverage', () => {
  it('has exactly one formatter per kernel (1:1 with the kernel registry)', () => {
    expect(Object.keys(workedByKernel).sort()).toEqual(Object.keys(kernels).sort());
  });
});

describe('workedByKernel — agreement with probability.ts', () => {
  it('each formatter result equals its kernel on sampled args', () => {
    for (const [name, k] of Object.entries(kernels)) {
      const args = sampleArgs(name, k);
      const w = workedByKernel[name](args);
      const got = parseWorkedResult(w.result);
      const want = k.fn(...args);
      expect(Number.isFinite(got), `${name}: non-numeric result "${w.result}"`).toBe(true);
      expect(
        Math.abs(got - want) <= tol(want),
        `${name}: worked result ${got} vs kernel ${want}`,
      ).toBe(true);
    }
  });

  it('each formatter result matches every bank entry it would produce', () => {
    for (const g of generatedProblems) {
      const interaction = g.step.interaction ?? 'numeric';
      if (interaction !== 'numeric' && interaction !== 'slider' && interaction !== 'wheel') continue;
      const fmt = workedByKernel[g.kernel];
      expect(fmt, `no workedByKernel formatter for ${g.kernel}`).toBeDefined();
      const got = parseWorkedResult(fmt(g.args).result);
      const want = g.step.answer ?? NaN;
      expect(
        Math.abs(got - want) <= tol(want),
        `${g.step.id} (${g.kernel}): worked ${got} vs answer ${want}`,
      ).toBe(true);
    }
  });
});

/** First numeric/slider gradable problem (skipping any order/draw/wheel lead-ins). */
function firstCalcStep(lesson: (typeof lessons)[number]) {
  return gradableSteps(lesson).find((p) => {
    const it = p.interaction ?? 'numeric';
    return it === 'numeric' || it === 'slider';
  });
}

describe('lesson sweep — lecture worked example + first-calc completion', () => {
  const built = lessons.filter((l) => l.status === 'built');

  it('has built lessons to sweep', () => {
    expect(built.length).toBeGreaterThan(0);
  });

  for (const lesson of built) {
    it(`${lesson.id}: lecture shows a worked example and the first calc problem is a completion`, () => {
      // (a) The concept step's simulation has a fully worked canonical lecture example.
      const concept = lesson.steps.find((s) => s.type === 'concept');
      expect(concept, `${lesson.id}: no concept step`).toBeDefined();
      expect(
        canonicalWorked(concept!.simulation),
        `${lesson.id}: no lecture worked example for sim "${concept!.simulation}"`,
      ).not.toBeNull();

      // (b) The first calculation problem yields a non-null completion breakdown and
      //     resolves to 'completion' on a guided run.
      const first = firstCalcStep(lesson);
      expect(first, `${lesson.id}: no numeric/slider problem`).toBeDefined();
      const gen = generateProblem(lesson.id, first!, 12345, 0, 0);
      const worked = deriveWorked(gen);
      expect(worked, `${lesson.id}: first calc (${first!.id}) has no completion breakdown`).not.toBeNull();
      expect(supportLevelFor(true, true, !!worked)).toBe('completion');

      // (c) Any later calculation problem stays cold (full), even on a guided run.
      const calc = gradableSteps(lesson).filter((p) => {
        const it = p.interaction ?? 'numeric';
        return it === 'numeric' || it === 'slider';
      });
      for (const later of calc.slice(1)) {
        expect(supportLevelFor(true, false, true)).toBe('full');
        expect(later.id).not.toBe(first!.id);
      }
    });
  }
});
