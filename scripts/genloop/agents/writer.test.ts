import { describe, it, expect } from 'vitest';
import { buildWriterPrompt, parseSpec, runWriter } from './writer';
import { kernels } from '../../../src/content/generated/kernels';
import type { LlmCaller, PlanTarget } from '../types';

const target: PlanTarget = { sectionId: 's3-conditional', kernel: 'diceSum', interaction: 'numeric', tier: 'mc-school', seed: 1 };

describe('writer', () => {
  it('prompt includes the kernel arg spec and interaction', () => {
    const p = buildWriterPrompt(target, kernels['diceSum'], ['avoid this (kernel:7)']);
    expect(p).toContain('diceSum');
    expect(p).toContain('numeric');
    expect(p).toContain('sum');
  });
  it('parses a valid spec and rejects junk', () => {
    expect(parseSpec('{"sectionId":"s3-conditional","kernel":"diceSum","args":[7],"interaction":"numeric","scenarioDraft":"x","questionDraft":"y? (decimal)"}')).not.toBeNull();
    expect(parseSpec('nope')).toBeNull();
  });
  it('runWriter uses the caller and returns a parsed spec', async () => {
    const caller: LlmCaller = { call: async () => '{"sectionId":"s3-conditional","kernel":"diceSum","args":[8],"interaction":"numeric","scenarioDraft":"x","questionDraft":"y? (decimal)"}' };
    const spec = await runWriter(caller, target, kernels['diceSum'], []);
    expect(spec?.args).toEqual([8]);
  });
});
