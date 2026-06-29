import { describe, it, expect } from 'vitest';
import { supportLevelFor } from './progress';

describe('supportLevelFor — completion-or-full fading', () => {
  it('is always full when the lesson is not guided (already cleared / replaying)', () => {
    expect(supportLevelFor(false, true, true)).toBe('full');
    expect(supportLevelFor(false, false, true)).toBe('full');
  });

  it('shows the completion only on the first calculation problem of a guided lesson', () => {
    expect(supportLevelFor(true, true, true)).toBe('completion');
    // Not the first calculation problem → cold.
    expect(supportLevelFor(true, false, true)).toBe('full');
  });

  it('falls back to full when no worked breakdown is available for the step', () => {
    expect(supportLevelFor(true, true, false)).toBe('full');
  });
});
