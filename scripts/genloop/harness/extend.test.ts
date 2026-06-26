import { describe, it, expect } from 'vitest';
import { buildProbabilityPatch, buildTestPatch } from './extend';
import type { NewKernelProposal } from '../types';

const prop: NewKernelProposal = {
  name: 'thirdsRule',
  source: 'export function thirdsRule(n: number): number {\n  return n / 3;\n}',
  mcSampler: '([n]) => (Math.random() < 1/3 ? n : 0)',
  vitestCase: "it('thirdsRule', () => { expect(thirdsRule(3)).toBeCloseTo(1, 10); });",
  sectionIds: ['s1-foundations'], interactions: ['numeric'], unit: 'value',
};

describe('extend patches', () => {
  it('appends the function source to probability.ts content', () => {
    const out = buildProbabilityPatch('// existing\n', prop);
    expect(out).toContain('export function thirdsRule');
    expect(out.endsWith('\n')).toBe(true);
  });
  it('inserts the import and the test case into probability.test.ts content', () => {
    const existing = "import {\n  binomialPmf,\n} from './probability';\n\ndescribe('x', () => {});\n";
    const out = buildTestPatch(existing, prop);
    expect(out).toContain('thirdsRule,');
    expect(out).toContain("it('thirdsRule'");
  });
});
