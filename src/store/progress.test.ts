import { describe, it, expect } from 'vitest';
import { supportLevelFor } from './progress';

const both = { worked: true, completion: true };

describe('supportLevelFor — worked → completion → full fading', () => {
  it('is always full when the lesson is not guided (already cleared / replaying)', () => {
    expect(supportLevelFor(false, 0, both)).toBe('full');
    expect(supportLevelFor(false, 1, both)).toBe('full');
  });

  it('fades worked (problem 0) → completion (problem 1) → full (problem 2+) when guided', () => {
    expect(supportLevelFor(true, 0, both)).toBe('worked');
    expect(supportLevelFor(true, 1, both)).toBe('completion');
    expect(supportLevelFor(true, 2, both)).toBe('full');
    expect(supportLevelFor(true, 4, both)).toBe('full');
  });

  it('falls back to full when no worked example is available for that stage', () => {
    expect(supportLevelFor(true, 0, { worked: false, completion: true })).toBe('full');
    expect(supportLevelFor(true, 1, { worked: true, completion: false })).toBe('full');
  });
});
