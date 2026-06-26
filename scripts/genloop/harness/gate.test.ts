import { describe, it, expect } from 'vitest';
import { parseGateOutput } from './gate';

describe('parseGateOutput', () => {
  it('passes when all three succeed', () => {
    const r = parseGateOutput({ tsc: 0, eslint: 0, vitest: 0 });
    expect(r.ok).toBe(true);
  });
  it('fails and names the failing step', () => {
    const r = parseGateOutput({ tsc: 0, eslint: 1, vitest: 0 });
    expect(r.ok).toBe(false);
    expect(r.failed).toContain('eslint');
  });
});
