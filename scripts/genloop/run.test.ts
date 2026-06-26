import { describe, it, expect } from 'vitest';
import { parseFlags } from './run';

describe('parseFlags', () => {
  it('parses count, section, model, dry-run', () => {
    const f = parseFlags(['--count', '12', '--section', 's3-conditional', '--model', 'auto', '--dry-run']);
    expect(f.count).toBe(12);
    expect(f.sectionId).toBe('s3-conditional');
    expect(f.model).toBe('auto');
    expect(f.dryRun).toBe(true);
  });
  it('defaults count to 10 and dryRun to false', () => {
    const f = parseFlags([]);
    expect(f.count).toBe(10);
    expect(f.dryRun).toBe(false);
  });
});
