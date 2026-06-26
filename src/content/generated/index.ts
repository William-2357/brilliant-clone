import type { LessonStep } from '../../types/lesson';
import { foundationsProblems } from './foundations';
import { combinatoricsProblems } from './combinatorics';
import { conditionalProblems } from './conditional';
import { expectationProblems } from './expectation';
import { distributionsProblems } from './distributions';
import { limitProblems } from './limit';
import { stochasticProblems } from './stochastic';
import { geometricProblems } from './geometric';

export type Tier = 'school' | 'mc-school' | 'mc-chapter' | 'amc';

export interface GeneratedProblem {
  step: LessonStep;
  sectionId: string;
  kernel: string;
  args: number[];
  tier: Tier;
  difficulty: number;
  /** When set, this problem is a variant for that lesson problem slot id (e.g. 'l1-s2'). */
  slotId?: string;
  provenance: {
    model: string;
    seed: number;
    createdAt: string;
    writerRunId?: string;
    solverRunId?: string;
  };
}

export const generatedProblems: GeneratedProblem[] = [
  ...foundationsProblems,
  ...combinatoricsProblems,
  ...conditionalProblems,
  ...expectationProblems,
  ...distributionsProblems,
  ...limitProblems,
  ...stochasticProblems,
  ...geometricProblems,
];

/**
 * Generated variants grouped by the lesson problem slot they target (entries that set
 * `slotId`). `problemTemplates.ts` bridges these into the lesson player so generated,
 * sim-matched problems replace the hand-written question bank for that slot while still
 * varying per retry/replay.
 */
export const generatedBySlot: Record<string, GeneratedProblem[]> = (() => {
  const m: Record<string, GeneratedProblem[]> = {};
  for (const g of generatedProblems) if (g.slotId) (m[g.slotId] ??= []).push(g);
  return m;
})();
