import { describe, it, expect } from 'vitest';
import { SdkCaller } from './sdkClient';

describe('SdkCaller', () => {
  it('constructs with an api key, model, and a temp cwd', () => {
    const c = new SdkCaller('key_x', 'composer-2.5');
    expect(c.model).toBe('composer-2.5');
    expect(typeof c.cwd).toBe('string');
    expect(c.cwd.length).toBeGreaterThan(0);
  });
});
