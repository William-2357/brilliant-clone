import { describe, it, expect } from 'vitest';
import { extractJson } from './types';

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('parses JSON inside a ```json fence with surrounding prose', () => {
    const raw = 'Sure!\n```json\n{"a":2,"b":[1,2]}\n```\nDone.';
    expect(extractJson(raw)).toEqual({ a: 2, b: [1, 2] });
  });
  it('returns null on no JSON', () => {
    expect(extractJson('no json here')).toBeNull();
  });
});
