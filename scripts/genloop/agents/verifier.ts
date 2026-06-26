import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractJson, type LlmCaller, type ProblemSpec, type Verdict } from '../types';

const here = dirname(fileURLToPath(import.meta.url));
const SYSTEM = readFileSync(join(here, '../prompts/verifier.md'), 'utf8');

export function buildVerifierPrompt(spec: ProblemSpec, answer: number): string {
  return `${SYSTEM}\n\n--- SPEC ---\n${JSON.stringify(spec, null, 2)}\n\n--- COMPUTED ANSWER ---\n${answer}`;
}
export function parseVerdict(raw: string): Verdict | null {
  const j = extractJson(raw) as Partial<Verdict> | null;
  if (!j || typeof j.ok !== 'boolean' || !Array.isArray(j.issues)) return null;
  return { ok: j.ok, issues: j.issues as string[] };
}
export async function runVerifier(caller: LlmCaller, spec: ProblemSpec, answer: number): Promise<Verdict | null> {
  return parseVerdict(await caller.call(buildVerifierPrompt(spec, answer)));
}
