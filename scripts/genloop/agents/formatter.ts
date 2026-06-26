import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractJson, type LlmCaller, type ProblemSpec } from '../types';

const here = dirname(fileURLToPath(import.meta.url));
const SYSTEM = readFileSync(join(here, '../prompts/formatter.md'), 'utf8');

export interface Formatted { title: string; body: string; question: string; feedbackCorrect: string; feedbackIncorrect: string; }

export function buildFormatterPrompt(spec: ProblemSpec, answer: number): string {
  return `${SYSTEM}\n\n--- DRAFT ---\n${JSON.stringify({ scenario: spec.scenarioDraft, question: spec.questionDraft, interaction: spec.interaction }, null, 2)}\n\n--- ANSWER (do not change) ---\n${answer}`;
}
export function parseFormat(raw: string): Formatted | null {
  const j = extractJson(raw) as Partial<Formatted> | null;
  if (!j || !j.title || !j.body || !j.question || !j.feedbackCorrect || !j.feedbackIncorrect) return null;
  return j as Formatted;
}
export async function runFormatter(caller: LlmCaller, spec: ProblemSpec, answer: number): Promise<Formatted | null> {
  return parseFormat(await caller.call(buildFormatterPrompt(spec, answer)));
}
