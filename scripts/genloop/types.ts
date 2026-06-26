import type { InteractionType } from '../../src/types/lesson';
import type { GeneratedProblem, Tier } from '../../src/content/generated/index';

export interface NewKernelProposal {
  name: string;
  source: string;
  mcSampler: string;
  vitestCase: string;
  sectionIds: string[];
  interactions: InteractionType[];
  unit: GeneratedProblem['step']['unit'];
}

export interface ProblemSpec {
  sectionId: string;
  kernel: string;
  args: number[];
  interaction: InteractionType;
  scenarioDraft: string;
  questionDraft: string;
  orderItems?: number[];
  drawCategories?: (number | string)[];
  wheelPayouts?: number[];
  newKernel?: NewKernelProposal;
}

export interface Verdict { ok: boolean; issues: string[]; }
export interface SolveResult { answer: number | null; steps: string[]; estDifficulty: number; confident: boolean; }

export interface PlanTarget { sectionId: string; kernel: string; interaction: InteractionType; tier: Tier; seed: number; }

export type CandidateResult =
  | { status: 'accepted'; problem: GeneratedProblem }
  | { status: 'rejected'; reason: string }
  | { status: 'error'; reason: string };

export interface LlmCaller { call(prompt: string): Promise<string>; }

/** Pull the first JSON object/array out of an LLM response (handles ``` fences). */
export function extractJson(raw: string): unknown {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : raw;
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  const open = body[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === open) depth++;
    else if (body[i] === close) { depth--; if (depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
    } }
  }
  return null;
}
