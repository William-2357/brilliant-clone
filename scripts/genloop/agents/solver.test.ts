import { describe, it, expect } from 'vitest';
import { parseSolve, runSolver, buildSolverPrompt } from './solver';
import type { LlmCaller } from '../types';
describe('solver', () => {
  it('prompt contains ONLY the statement (no kernel/args/answer)', () => {
    const p = buildSolverPrompt('two dice', 'p(7)? (decimal)');
    expect(p).toContain('two dice');
    expect(p).not.toContain('diceSum');
  });
  it('parses a solve result', () => {
    expect(parseSolve('{"answer":0.167,"steps":["6/36"],"estDifficulty":2,"confident":true}')?.answer).toBeCloseTo(0.167, 3);
    expect(parseSolve('x')).toBeNull();
  });
  it('runs', async () => {
    const caller: LlmCaller = { call: async () => '{"answer":0.1667,"steps":["6/36","=1/6"],"estDifficulty":2,"confident":true}' };
    expect((await runSolver(caller, 'two dice', 'p(7)? (decimal)'))?.steps.length).toBe(2);
  });
});
