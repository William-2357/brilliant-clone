import { describe, it, expect } from 'vitest';
import { parseVerdict, runVerifier, buildVerifierPrompt } from './verifier';
import type { LlmCaller, ProblemSpec } from '../types';
const spec: ProblemSpec = { sectionId: 's3-conditional', kernel: 'diceSum', args: [7], interaction: 'numeric', scenarioDraft: 'two dice', questionDraft: 'p(7)? (decimal)' };
describe('verifier', () => {
  it('builds a prompt containing the computed answer', () => {
    expect(buildVerifierPrompt(spec, 0.1667)).toContain('0.1667');
  });
  it('parses a verdict', () => {
    expect(parseVerdict('{"ok":true,"issues":[]}')).toEqual({ ok: true, issues: [] });
    expect(parseVerdict('junk')).toBeNull();
  });
  it('runs', async () => {
    const caller: LlmCaller = { call: async () => '{"ok":false,"issues":["ambiguous"]}' };
    expect((await runVerifier(caller, spec, 0.1667))?.ok).toBe(false);
  });
});
