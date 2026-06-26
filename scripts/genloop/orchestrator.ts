import { kernels } from '../../src/content/generated/kernels';
import type { LessonStep } from '../../src/types/lesson';
import type { GeneratedProblem } from '../../src/content/generated/index';
import { validateStep } from '../../src/content/validate';
import { checkArgs, computeAnswer } from './harness/evaluate';
import { monteCarloAgrees } from './harness/montecarlo';
import { isTrivial, scoreDifficulty, tierOf } from './harness/difficulty';
import { Deduper } from './harness/dedup';
import { isCorrect } from '../../src/lib/probability';
import type { CandidateResult, PlanTarget, ProblemSpec, Verdict, SolveResult } from './types';
import type { Formatted } from './agents/formatter';

export interface Deps {
  writer: (target: PlanTarget, avoid: string[]) => Promise<ProblemSpec | null>;
  verifier: (spec: ProblemSpec, answer: number) => Promise<Verdict | null>;
  solver: (scenario: string, question: string) => Promise<SolveResult | null>;
  formatter: (spec: ProblemSpec, answer: number) => Promise<Formatted | null>;
  deduper: Deduper;
  model: string;
}

let counter = 0;
function nextId(sectionId: string): string {
  counter++;
  return `gen-${sectionId.replace(/[^a-z0-9]/gi, '')}-${String(counter).padStart(4, '0')}`;
}

export async function runOne(target: PlanTarget, deps: Deps): Promise<CandidateResult> {
  const kernel = kernels[target.kernel];
  if (!kernel) return { status: 'error', reason: `unknown kernel ${target.kernel}` };

  const spec = await deps.writer(target, []);
  if (!spec) return { status: 'rejected', reason: 'writer returned no parseable spec' };
  if (spec.kernel !== target.kernel) return { status: 'rejected', reason: 'writer changed kernel' };

  const argIssues = checkArgs(kernel, spec.args);
  if (argIssues.length) return { status: 'rejected', reason: `args: ${argIssues.join('; ')}` };

  const answer = computeAnswer(kernel, spec.args);
  if (!Number.isFinite(answer)) return { status: 'rejected', reason: 'non-finite answer' };

  const mc = monteCarloAgrees(kernel, spec.args, answer, kernel.defaultTolerance);
  if (!mc.agrees) return { status: 'rejected', reason: `monte-carlo disagree: est ${mc.estimate} vs ${answer}` };

  const verdict = await deps.verifier(spec, answer);
  if (!verdict) return { status: 'rejected', reason: 'verifier returned no parseable verdict' };
  if (!verdict.ok) return { status: 'rejected', reason: `verifier: ${verdict.issues.join('; ')}` };

  const solve = await deps.solver(spec.scenarioDraft, spec.questionDraft);
  if (!solve) return { status: 'rejected', reason: 'solver returned no parseable result' };
  if (!solve.confident) return { status: 'rejected', reason: 'solver not confident (ambiguous)' };
  if (spec.interaction === 'numeric' || spec.interaction === 'slider') {
    if (solve.answer === null || !isCorrect(solve.answer, answer, kernel.defaultTolerance)) {
      return { status: 'rejected', reason: `solver disagree: ${solve.answer} vs ${answer}` };
    }
  }

  if (isTrivial(spec.scenarioDraft, spec.questionDraft, answer, solve.steps)) {
    return { status: 'rejected', reason: 'trivial (answer-in-prose or single-step)' };
  }

  const fmt = await deps.formatter(spec, answer);
  if (!fmt) return { status: 'rejected', reason: 'formatter returned no parseable result' };

  // Re-verify the SHIPPED prose. The formatter may have drifted from the draft, so an
  // independent solve of the FINAL wording must still reach the computed answer, and the
  // final prose must not have become trivial / answer-revealing. This closes the loop:
  // nothing unchecked is ever emitted, since there is no human gate.
  const finalSolve = await deps.solver(fmt.body, fmt.question);
  if (!finalSolve || !finalSolve.confident) {
    return { status: 'rejected', reason: 'final-prose solver not confident' };
  }
  if (spec.interaction === 'numeric' || spec.interaction === 'slider') {
    if (finalSolve.answer === null || !isCorrect(finalSolve.answer, answer, kernel.defaultTolerance)) {
      return { status: 'rejected', reason: `final-prose solver disagree: ${finalSolve.answer} vs ${answer}` };
    }
  }
  if (isTrivial(fmt.body, fmt.question, answer, finalSolve.steps)) {
    return { status: 'rejected', reason: 'final prose trivial / answer-in-prose' };
  }

  const difficulty = scoreDifficulty(finalSolve.estDifficulty, finalSolve.steps);
  const step: LessonStep = {
    id: nextId(spec.sectionId),
    type: 'problem',
    title: fmt.title,
    body: fmt.body,
    question: fmt.question,
    answer,
    tolerance: kernel.defaultTolerance,
    unit: kernel.unit,
    interaction: spec.interaction,
    feedback: { correct: fmt.feedbackCorrect, incorrect: fmt.feedbackIncorrect },
  };
  if (spec.interaction === 'slider') {
    step.sliderMin = 0;
    step.sliderMax = kernel.unit === 'probability' || kernel.unit === 'fraction' ? 1 : Math.max(1, Math.ceil(answer * 2));
    step.sliderStep = (step.sliderMax - step.sliderMin) / 100;
  }

  const issues = validateStep(step);
  if (issues.length) return { status: 'rejected', reason: `validateStep: ${issues.join('; ')}` };

  if (!deps.deduper.accept(spec.kernel, spec.args, fmt.body)) {
    return { status: 'rejected', reason: 'duplicate / near-duplicate' };
  }

  const problem: GeneratedProblem = {
    step,
    sectionId: spec.sectionId,
    kernel: spec.kernel,
    args: spec.args,
    tier: tierOf(difficulty),
    difficulty,
    provenance: { model: deps.model, seed: target.seed, createdAt: new Date().toISOString() },
  };
  return { status: 'accepted', problem };
}
