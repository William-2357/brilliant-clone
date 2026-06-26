import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Kernel } from '../../../src/content/generated/kernels';
import { extractJson, type LlmCaller, type PlanTarget, type ProblemSpec } from '../types';

const here = dirname(fileURLToPath(import.meta.url));
const SYSTEM = readFileSync(join(here, '../prompts/writer.md'), 'utf8');

export function buildWriterPrompt(target: PlanTarget, kernel: Kernel, avoid: string[]): string {
  return [
    SYSTEM,
    '\n--- TARGET ---',
    JSON.stringify({ sectionId: target.sectionId, kernel: kernel.name, interaction: target.interaction, tier: target.tier }, null, 2),
    '\n--- KERNEL ARG SPEC ---',
    JSON.stringify(kernel.args, null, 2),
    `\nunit: ${kernel.unit}`,
    avoid.length ? `\n--- AVOID THESE (already used) ---\n${avoid.join('\n')}` : '',
  ].join('\n');
}

export function parseSpec(raw: string): ProblemSpec | null {
  const j = extractJson(raw) as Partial<ProblemSpec> | null;
  if (!j || typeof j.kernel !== 'string' || !Array.isArray(j.args) || typeof j.interaction !== 'string') return null;
  if (typeof j.scenarioDraft !== 'string' || typeof j.questionDraft !== 'string' || typeof j.sectionId !== 'string') return null;
  return j as ProblemSpec;
}

export async function runWriter(caller: LlmCaller, target: PlanTarget, kernel: Kernel, avoid: string[]): Promise<ProblemSpec | null> {
  const raw = await caller.call(buildWriterPrompt(target, kernel, avoid));
  return parseSpec(raw);
}
