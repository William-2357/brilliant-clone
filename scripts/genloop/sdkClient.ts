import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LlmCaller } from './types';

// @cursor/sdk is imported lazily inside call() so that merely importing this module
// (e.g. in the unit test / repo gate) never loads the heavy SDK + its native optional
// deps. The SDK only loads during an actual live run.
export class SdkCaller implements LlmCaller {
  apiKey: string;
  model: string;
  cwd: string;
  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.cwd = mkdtempSync(join(tmpdir(), 'genloop-'));
  }
  async call(prompt: string): Promise<string> {
    const { Agent, CursorAgentError } = await import('@cursor/sdk');
    try {
      const result = await Agent.prompt(prompt, {
        apiKey: this.apiKey,
        model: { id: this.model },
        local: { cwd: this.cwd, settingSources: [] },
      });
      if (result.status === 'error') throw new Error(`run failed: ${result.id}`);
      return result.result ?? '';
    } catch (err) {
      if (err instanceof CursorAgentError) throw new Error(`startup failed: ${err.message} (retryable=${err.isRetryable})`, { cause: err });
      throw err;
    }
  }
}
