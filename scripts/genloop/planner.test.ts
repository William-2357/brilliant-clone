import { describe, it, expect } from 'vitest';
import { planBatch } from './planner';

describe('planBatch', () => {
  it('produces exactly count targets, each a valid kernel+supported interaction', () => {
    const targets = planBatch({ count: 50, seed: 7 });
    expect(targets.length).toBe(50);
    for (const t of targets) expect(t.kernel.length).toBeGreaterThan(0);
  });
  it('respects a section filter', () => {
    const targets = planBatch({ count: 10, seed: 1, sectionId: 's3-conditional' });
    for (const t of targets) expect(t.sectionId).toBe('s3-conditional');
  });
  it('roughly honors the interaction mix over a large batch', () => {
    const targets = planBatch({ count: 400, seed: 3 });
    const numeric = targets.filter((t) => t.interaction === 'numeric').length / 400;
    expect(numeric).toBeGreaterThan(0.3);
    expect(numeric).toBeLessThan(0.75);
  });
});
