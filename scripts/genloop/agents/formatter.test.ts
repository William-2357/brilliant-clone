import { describe, it, expect } from 'vitest';
import { parseFormat, runFormatter, buildFormatterPrompt } from './formatter';
import type { LlmCaller, ProblemSpec } from '../types';
const spec: ProblemSpec = { sectionId: 's3-conditional', kernel: 'diceSum', args: [7], interaction: 'numeric', scenarioDraft: 'two dice', questionDraft: 'p(7)? (decimal)' };
describe('formatter', () => {
  it('builds a prompt with the draft', () => { expect(buildFormatterPrompt(spec, 0.1667)).toContain('two dice'); });
  it('parses formatting', () => {
    expect(parseFormat('{"title":"T","body":"B","question":"Q? (decimal)","feedbackCorrect":"c","feedbackIncorrect":"i"}')?.title).toBe('T');
    expect(parseFormat('x')).toBeNull();
  });
  it('runs', async () => {
    const caller: LlmCaller = { call: async () => '{"title":"T","body":"B","question":"Q? (decimal)","feedbackCorrect":"c","feedbackIncorrect":"i"}' };
    expect((await runFormatter(caller, spec, 0.1667))?.body).toBe('B');
  });
});
