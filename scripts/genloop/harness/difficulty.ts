import type { Tier } from '../../../src/content/generated/index';

/** True if the problem is too easy to keep (answer stated, or a single-step read-off). */
export function isTrivial(scenario: string, question: string, answer: number, steps: string[]): boolean {
  const text = `${scenario} ${question}`.toLowerCase();
  const a = answer;
  const printed = new Set([
    String(a), a.toFixed(2), a.toFixed(3), `${Math.round(a * 100)}%`, `${Math.round(a * 100)} percent`,
  ]);
  for (const p of printed) if (p && text.includes(p.toLowerCase())) return true;
  if (steps.length < 2) return true;
  return false;
}

/** 1..5 from the solver's reported steps and an explicit base difficulty (1..5). */
export function scoreDifficulty(base: number, steps: string[]): number {
  const s = base * 0.6 + Math.min(4, steps.length) * 0.6;
  return Math.max(1, Math.min(5, Math.round(s)));
}

export function tierOf(score: number): Tier {
  if (score <= 1) return 'school';
  if (score === 2) return 'mc-school';
  if (score === 3 || score === 4) return 'mc-chapter';
  return 'amc';
}
