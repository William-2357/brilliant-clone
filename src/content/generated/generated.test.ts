import { describe, it, expect } from 'vitest';
import { generatedProblems } from './index';
import { kernels } from './kernels';
import { validateStep } from '../validate';

describe('generated bank is self-verifying', () => {
  it('every entry recomputes its answer from its kernel and passes validateStep', () => {
    for (const g of generatedProblems) {
      const k = kernels[g.kernel];
      expect(k, `unknown kernel ${g.kernel}`).toBeDefined();
      const interaction = g.step.interaction ?? 'numeric';
      // numeric/slider/wheel all store the single kernel value as step.answer; recompute
      // it from the kernel so the bank can never drift. (order/draw answers are
      // multi-valued and have no single-value kernels yet — validateStep still checks them.)
      if (interaction === 'numeric' || interaction === 'slider' || interaction === 'wheel') {
        expect(Math.abs(k.fn(...g.args) - (g.step.answer ?? NaN)))
          .toBeLessThanOrEqual(1e-9);
      }
      expect(validateStep(g.step), `validateStep issues for ${g.step.id}`).toEqual([]);
    }
  });
});
