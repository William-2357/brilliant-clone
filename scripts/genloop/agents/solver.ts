import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractJson, type LlmCaller, type SolveResult } from '../types';

const here = dirname(fileURLToPath(import.meta.url));
const SYSTEM = readFileSync(join(here, '../prompts/solver.md'), 'utf8');

export function buildSolverPrompt(scenario: string, question: string): string {
  return `${SYSTEM}\n\n--- PROBLEM ---\n${scenario}\n\n${question}`;
}
export function parseSolve(raw: string): SolveResult | null {
  const j = extractJson(raw) as Partial<SolveResult> | null;
  if (!j || !Array.isArray(j.steps) || typeof j.confident !== 'boolean') return null;
  const answer = j.answer === null || typeof j.answer === 'number' ? (j.answer ?? null) : null;
  return { answer, steps: j.steps as string[], estDifficulty: Number(j.estDifficulty) || 3, confident: j.confident };
}
export async function runSolver(caller: LlmCaller, scenario: string, question: string): Promise<SolveResult | null> {
  return parseSolve(await caller.call(buildSolverPrompt(scenario, question)));
}
