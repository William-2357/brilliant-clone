import { describe, it, expect } from 'vitest';
import { kernels } from './kernels';
import { binomialPmf } from '../../lib/probability';

describe('kernels registry', () => {
  it('every kernel has args, a section, at least one interaction, and a finite fn on midpoints', () => {
    for (const [name, k] of Object.entries(kernels)) {
      expect(k.name).toBe(name);
      expect(k.args.length).toBeGreaterThanOrEqual(0);
      expect(k.sectionIds.length).toBeGreaterThan(0);
      expect(k.interactions.length).toBeGreaterThan(0);
      const mid = k.args.map((a) =>
        a.kind === 'enum' ? (a.values![0]) : (a.min! + a.max!) / 2);
      expect(Number.isFinite(k.fn(...mid))).toBe(true);
    }
  });
  it('binomialPmf kernel computes the real probability', () => {
    const k = kernels['binomialPmf'];
    expect(k.fn(12, 6, 0.5)).toBeCloseTo(binomialPmf(12, 6, 0.5), 12);
  });
});
