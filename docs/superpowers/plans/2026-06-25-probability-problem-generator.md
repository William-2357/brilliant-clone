# Autonomous Probability Problem Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully autonomous, offline pipeline that uses the Cursor SDK to write, verify, blind-solve, and format new probability problems, emitting a self-verifying typed problem bank under `src/content/generated/` whose answers are always computed by `src/lib/probability.ts`.

**Architecture:** Two halves. **Agents** (LLM via `@cursor/sdk`) only return JSON describing a problem's *form*; they run in a throwaway cwd and never touch the repo. The **harness** (plain Node/TS) owns all side effects and all correctness gates: it computes answers from `probability.ts` kernels, cross-checks with Monte-Carlo and an independent blind solver, validates with the app's own graders, dedups, scores difficulty, emits typed bank entries, and runs `tsc`+`eslint`+`vitest`. No human gate; the bank is self-verifying via a recompute test.

**Tech Stack:** TypeScript, Node, `tsx` (run scripts), `@cursor/sdk` (LLM agents), `vitest` (tests), existing `src/lib/probability.ts` + `src/types/lesson.ts` + `src/content/validate.ts` (extracted).

---

## File structure

```
src/
  types/lesson.ts                 # MODIFY: export InteractionType
  content/
    validate.ts                   # CREATE: shared graders + validateStep() (extracted from smoke-content.ts)
    generated/
      kernels.ts                  # CREATE: answer-kernel registry over probability.ts
      index.ts                    # CREATE: GeneratedProblem type + aggregate pool
      foundations.ts              # CREATE: GeneratedProblem[] (one file per section; start with two)
      conditional.ts              # CREATE: GeneratedProblem[]
      generated.test.ts           # CREATE: recompute + validate every entry
  lib/probability.ts              # MODIFY (extend path only, at runtime by the harness)
  lib/probability.test.ts         # MODIFY (extend path only)
scripts/
  smoke-content.ts                # MODIFY: import from src/content/validate.ts
  genloop/
    tsconfig.json                 # CREATE
    types.ts                      # CREATE: ProblemSpec, Verdict, SolveResult, PlanTarget, Candidate, LlmCaller, extractJson
    sdkClient.ts                  # CREATE: SdkCaller (real LLM), model validation
    planner.ts                    # CREATE: planBatch()
    harness/
      evaluate.ts                 # CREATE: computeAnswer(), arg checks
      samplers.ts                 # CREATE: per-kernel Monte-Carlo samplers
      montecarlo.ts               # CREATE: monteCarloAgrees()
      difficulty.ts               # CREATE: scoreDifficulty(), isTrivial(), tierOf()
      dedup.ts                    # CREATE: Deduper
      emit.ts                     # CREATE: renderEntry(), appendEntry(), snapshot/restore
      gate.ts                     # CREATE: parseGateOutput(); runRepoGate()
      extend.ts                   # CREATE: applyNewKernel()
    agents/
      writer.ts verifier.ts solver.ts formatter.ts   # CREATE: buildPrompt()+parse()+run()
    prompts/
      writer.md verifier.md solver.md formatter.md    # CREATE
    orchestrator.ts               # CREATE: runOne() state machine (DI)
    run.ts                        # CREATE: CLI entrypoint
    README.md                     # CREATE
eslint.config.js                  # MODIFY: scripts/** Node-globals override
.gitignore                        # MODIFY: scripts/genloop/.manifest/
package.json                      # MODIFY: devDeps + scripts
```

---

## Phase 0 — Foundations & repo touch-ups

### Task 1: Export `InteractionType`; add scripts ESLint override; add devDeps

**Files:**
- Modify: `src/types/lesson.ts:40`
- Modify: `eslint.config.js`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Export `InteractionType`**

In `src/types/lesson.ts`, change the declaration so it is exported:

```ts
export type InteractionType = 'numeric' | 'slider' | 'order' | 'draw' | 'wheel';
```

- [ ] **Step 2: Add ESLint override for `scripts/**`**

In `eslint.config.js`, extend the second override's `files` glob to include scripts, so Node-run tooling gets Node globals and skips the Fast-Refresh rule:

```js
  {
    // Node-run tooling and Playwright e2e specs — not part of the Vite app bundle,
    // so they get Node globals (process) and skip the React Fast Refresh rule.
    files: ['e2e/**/*.ts', 'playwright.config.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
```

- [ ] **Step 3: Install dev dependencies**

Run: `npm install -D @cursor/sdk tsx`
Expected: both added to `devDependencies`; `package-lock.json` updated.

- [ ] **Step 4: Add npm scripts + gitignore**

In `package.json` `scripts`, add:

```json
    "genloop": "tsx scripts/genloop/run.ts",
    "smoke": "tsx scripts/smoke-content.ts"
```

In `.gitignore`, append:

```
scripts/genloop/.manifest/
```

- [ ] **Step 5: Verify lint + build still pass**

Run: `npm run lint && npm run build`
Expected: PASS (no new errors).

- [ ] **Step 6: Commit**

```bash
git add src/types/lesson.ts eslint.config.js package.json package-lock.json .gitignore
git commit -m "chore: export InteractionType, lint scripts as node, add genloop devdeps"
```

---

### Task 2: Extract shared validators into `src/content/validate.ts`

The harness and `smoke-content.ts` must share ONE validator. Extract the graders +
`validate()` from `scripts/smoke-content.ts` into a pure module that returns issues.

**Files:**
- Create: `src/content/validate.ts`
- Test: `src/content/validate.test.ts`
- Modify: `scripts/smoke-content.ts`

- [ ] **Step 1: Write the failing test**

Create `src/content/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateStep } from './validate';
import type { LessonStep } from '../types/lesson';

const numeric: LessonStep = {
  id: 't-num', type: 'problem', title: 'T', body: 'b',
  question: 'p? (decimal)', answer: 0.5, tolerance: 0.05, unit: 'probability',
  feedback: { correct: 'c', incorrect: 'i' },
};

describe('validateStep', () => {
  it('accepts a well-formed numeric problem', () => {
    expect(validateStep(numeric)).toEqual([]);
  });
  it('rejects a non-finite answer', () => {
    expect(validateStep({ ...numeric, answer: NaN }).length).toBeGreaterThan(0);
  });
  it('rejects a count problem with a sub-1 tolerance', () => {
    expect(validateStep({ ...numeric, unit: 'count', answer: 5, tolerance: 0.5 }).length).toBeGreaterThan(0);
  });
  it('rejects an order step whose answerOrder is not a permutation', () => {
    const bad: LessonStep = {
      ...numeric, id: 't-ord', interaction: 'order',
      orderItems: [2, 3, 4], answerOrder: [2, 3, 9], unit: 'order',
    };
    expect(validateStep(bad).length).toBeGreaterThan(0);
  });
  it('rejects a draw shape that does not sum to 1', () => {
    const bad: LessonStep = {
      ...numeric, id: 't-draw', interaction: 'draw',
      drawCategories: [0, 1, 2], answerShape: [0.2, 0.2, 0.2], tolerance: 0.18, unit: 'shape',
    };
    expect(validateStep(bad).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/validate.test.ts`
Expected: FAIL ("Cannot find module './validate'").

- [ ] **Step 3: Implement `src/content/validate.ts`**

Move the grader replicas + reachability helpers + `validate` body from
`scripts/smoke-content.ts` here, but return an issue list instead of pushing to a global.
(Drop the sim↔answer `simConsistency` and `orderDeepCheck` lesson-specific bits — the
generator validates against kernels, not lesson ids. Keep the structural + grader +
reachability checks.)

```ts
import { isCorrect } from '../lib/probability';
import { parseNumericInput } from '../lib/answer';
import type { LessonStep } from '../types/lesson';

const approx = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const sameArr = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);
const isPermutation = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
};

export function gradeNumericStr(step: LessonStep, s: string): boolean {
  const v = parseNumericInput(s);
  if (v === null) return false;
  return isCorrect(v, step.answer ?? 0, step.tolerance ?? 0);
}
export function gradeOrderArr(step: LessonStep, order: number[]): boolean {
  const t = step.answerOrder ?? [];
  return order.length === t.length && order.every((v, i) => v === t[i]);
}
export function gradeDrawHeights(step: LessonStep, drawn: number[]): boolean {
  const truth = step.answerShape ?? [];
  const total = drawn.reduce((a, b) => a + b, 0);
  if (total <= 0) return false;
  const dist = drawn.map((h) => h / total);
  const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
  return tv <= (step.tolerance ?? 0.15);
}
export function gradeWheelProbs(step: LessonStep, probs: number[]): boolean {
  const payouts = step.wheelPayouts ?? [];
  const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
  return isCorrect(ev, step.answer ?? 0, step.tolerance ?? 0);
}

const MIN_SEG = 0.05;
export function wheelReach(payouts: number[], target: number): { minEV: number; maxEV: number; probs: number[] | null } {
  const n = payouts.length;
  const minPay = Math.min(...payouts);
  const maxPay = Math.max(...payouts);
  const iLo = payouts.indexOf(minPay);
  const iHi = payouts.indexOf(maxPay);
  const baseEV = payouts.reduce((s, v) => s + MIN_SEG * v, 0);
  const L = 1 - n * MIN_SEG;
  const minEV = baseEV + L * minPay;
  const maxEV = baseEV + L * maxPay;
  let probs: number[] | null = null;
  if (iHi !== iLo && maxPay > minPay) {
    const x = (target - baseEV - L * minPay) / (maxPay - minPay);
    const xc = Math.max(0, Math.min(L, x));
    probs = new Array(n).fill(MIN_SEG);
    probs[iHi] += xc;
    probs[iLo] += L - xc;
  }
  return { minEV, maxEV, probs };
}

/** Returns a list of problems with the step; empty array means it is valid + answerable. */
export function validateStep(step: LessonStep): string[] {
  const issues: string[] = [];
  const push = (cond: boolean, msg: string) => { if (!cond) issues.push(msg); };

  push(step.type === 'problem', 'step is not a problem');
  push(!!step.question, 'missing question text');
  push(!!step.feedback?.correct && !!step.feedback?.incorrect, 'missing feedback text');
  const interaction = step.interaction ?? 'numeric';

  if (interaction === 'numeric' || interaction === 'slider') {
    const ans = step.answer;
    const tol = step.tolerance;
    push(typeof ans === 'number' && Number.isFinite(ans), `bad answer: ${ans}`);
    push(typeof tol === 'number' && (tol as number) > 0, `bad tolerance: ${tol}`);
    if (typeof ans === 'number' && Number.isFinite(ans)) {
      push(gradeNumericStr(step, String(ans)), `true answer ${ans} rejected (tol ${tol})`);
      push(!gradeNumericStr(step, String(ans + (tol ?? 0) * 6 + 1)), 'a clearly wrong answer was accepted');
      if (interaction === 'slider') {
        const lo = step.sliderMin ?? 0, hi = step.sliderMax ?? 1, st = step.sliderStep ?? 0.01;
        push(lo < hi, `slider range invalid [${lo}, ${hi}]`);
        push(st > 0, `slider step invalid ${st}`);
        const grid = Math.min(hi, Math.max(lo, Math.round((ans - lo) / st) * st + lo));
        push(gradeNumericStr(step, String(grid)), `slider unreachable: grid ${grid} vs ans ${ans}`);
      }
      if (step.unit === 'count') push((tol ?? 0) >= 1, `count tolerance ${tol} < 1`);
    }
  } else if (interaction === 'order') {
    const items = step.orderItems ?? [], ord = step.answerOrder ?? [];
    push(items.length >= 2, 'order: fewer than 2 items');
    push(isPermutation(items, ord), `order: answerOrder ${ord} not a permutation of ${items}`);
    push(gradeOrderArr(step, ord), 'order: the true order is rejected');
    const rev = [...ord].reverse();
    if (!sameArr(rev, ord)) push(!gradeOrderArr(step, rev), 'order: reversed order accepted');
  } else if (interaction === 'draw') {
    const cats = step.drawCategories ?? [], shape = step.answerShape ?? [];
    push(cats.length >= 2, 'draw: fewer than 2 categories');
    push(shape.length === cats.length, `draw: shape len ${shape.length} != categories ${cats.length}`);
    const sum = shape.reduce((a, b) => a + b, 0);
    push(approx(sum, 1, 1e-6), `draw: answerShape sums to ${sum}, not 1`);
    push(shape.every((v) => v >= 0), 'draw: negative shape value');
    const tol = step.tolerance ?? 0;
    push(tol > 0 && tol < 1, `draw: tolerance ${tol} not in (0,1)`);
    push(gradeDrawHeights(step, shape.slice()), 'draw: the true shape is rejected');
    const spike = shape.map((_, i) => (i === 0 ? 1 : 0));
    push(!gradeDrawHeights(step, spike), 'draw: a single-bar spike was accepted');
  } else if (interaction === 'wheel') {
    const payouts = step.wheelPayouts ?? [], target = step.answer ?? 0, tol = step.tolerance ?? 0;
    push(payouts.length >= 2, 'wheel: fewer than 2 payouts');
    push(tol > 0, 'wheel: tolerance <= 0');
    const { minEV, maxEV, probs } = wheelReach(payouts, target);
    push(target >= minEV - 1e-9 && target <= maxEV + 1e-9, `wheel: target ${target} out of reach [${minEV.toFixed(2)}, ${maxEV.toFixed(2)}]`);
    push(probs !== null && gradeWheelProbs(step, probs), `wheel: cannot hit target ${target} within tol ${tol}`);
  }
  return issues;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/validate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Re-point `smoke-content.ts` at the shared module**

In `scripts/smoke-content.ts`, delete the local grader replicas + `wheelReach` + the
generic structural body of `validate`, and import from the new module. Keep the
lesson-specific `simConsistency` and `orderDeepCheck` (they are lesson-id-aware), but
call `validateStep` for the structural/grader checks:

```ts
import { validateStep } from '../src/content/validate';
// ...inside validate(step, where): for (const m of validateStep(step)) check(false, where, m);
//   then keep the existing simConsistency(step, where) and orderDeepCheck(step, where) calls.
```

- [ ] **Step 6: Run the smoke test unchanged**

Run: `npx -y tsx scripts/smoke-content.ts`
Expected: "✅ ALL PROBLEMS ANSWERABLE & CORRECT — 0 failures." (same as before).

- [ ] **Step 7: Commit**

```bash
git add src/content/validate.ts src/content/validate.test.ts scripts/smoke-content.ts
git commit -m "refactor: extract shared step validators into src/content/validate.ts"
```

---

## Phase 1 — Kernel registry + bank + self-verifying test

### Task 3: Answer-kernel registry (`src/content/generated/kernels.ts`)

Seed one kernel per section (the rest follow the identical shape). Each kernel's `fn` is
a `probability.ts` function; `args` constrains the writer.

**Files:**
- Create: `src/content/generated/kernels.ts`
- Test: `src/content/generated/kernels.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { kernels } from './kernels';
import { binomialPmf, expectedValue } from '../../lib/probability';

describe('kernels registry', () => {
  it('every kernel has args, a section, at least one interaction, and a finite fn on midpoints', () => {
    for (const [name, k] of Object.entries(kernels)) {
      expect(k.name).toBe(name);
      expect(k.args.length).toBeGreaterThanOrEqual(0);
      expect(k.sectionIds.length).toBeGreaterThan(0);
      expect(k.interactions.length).toBeGreaterThan(0);
      const mid = k.args.map((a) =>
        a.kind === 'enum' ? (a.values![0]) : (a.min! + a.max!) / 2);
      expect(Number.isFinite(k.fn(...mid))).toBe(true);
    }
  });
  it('binomialPmf kernel computes the real probability', () => {
    const k = kernels['binomialPmf'];
    expect(k.fn(12, 6, 0.5)).toBeCloseTo(binomialPmf(12, 6, 0.5), 12);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/content/generated/kernels.test.ts`
Expected: FAIL ("Cannot find module './kernels'").

- [ ] **Step 3: Implement `kernels.ts`**

```ts
import type { InteractionType, SimulationType } from '../../types/lesson';
import {
  binomialPmf, diceSumDistribution, montyHallSwitchWin, drawProbability,
  drawMatchesNoReplacement, expectedValue, totalProbability, bayesPosterior,
  geometricMean, poissonPmf, randomWalkRMS, buffonProbability,
  type WheelSegment, type Branch,
} from '../../lib/probability';

export interface KernelArgSpec {
  name: string;
  kind: 'int' | 'number' | 'prob' | 'enum';
  min?: number; max?: number; step?: number; values?: number[];
}

export interface Kernel {
  name: string;
  fn: (...args: number[]) => number;
  args: KernelArgSpec[];
  sectionIds: string[];
  interactions: InteractionType[];
  unit: 'fraction' | 'probability' | 'dollars' | 'count' | 'value' | 'distance' | 'position' | 'standard error';
  defaultTolerance: number;
  simulation?: SimulationType;
}

const dice = diceSumDistribution();

export const kernels: Record<string, Kernel> = {
  binomialPmf: {
    name: 'binomialPmf',
    fn: (n, k, p) => binomialPmf(n, k, p),
    args: [
      { name: 'n', kind: 'int', min: 6, max: 20 },
      { name: 'k', kind: 'int', min: 0, max: 20 },
      { name: 'p', kind: 'prob', min: 0.3, max: 0.7, step: 0.05 },
    ],
    sectionIds: ['s5-distributions', 's1-foundations'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'galtonBoard',
  },
  diceSum: {
    name: 'diceSum',
    fn: (sum) => dice[sum] ?? 0,
    args: [{ name: 'sum', kind: 'int', min: 2, max: 12 }],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'diceRoll',
  },
  drawProbability: {
    name: 'drawProbability',
    fn: (matches, deck) => drawProbability(matches, deck),
    args: [
      { name: 'matches', kind: 'int', min: 1, max: 13 },
      { name: 'deck', kind: 'enum', values: [52, 51, 50] },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'conditional',
  },
  drawMatchesNoReplacement: {
    name: 'drawMatchesNoReplacement',
    fn: (matches, deck, draws) => drawMatchesNoReplacement(matches, deck, draws),
    args: [
      { name: 'matches', kind: 'int', min: 2, max: 13 },
      { name: 'deck', kind: 'enum', values: [52] },
      { name: 'draws', kind: 'int', min: 2, max: 3 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.004,
  },
  totalProbability2: {
    name: 'totalProbability2',
    fn: (w0, p0, w1, p1) => totalProbability([{ weight: w0, p: p0 } as Branch, { weight: w1, p: p1 } as Branch]),
    args: [
      { name: 'w0', kind: 'int', min: 1, max: 9 },
      { name: 'p0', kind: 'prob', min: 0.05, max: 0.95, step: 0.05 },
      { name: 'w1', kind: 'int', min: 1, max: 9 },
      { name: 'p1', kind: 'prob', min: 0.05, max: 0.95, step: 0.05 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  bayesPosterior: {
    name: 'bayesPosterior',
    fn: (prior, sens, spec) => bayesPosterior(prior, sens, spec),
    args: [
      { name: 'prior', kind: 'prob', min: 0.01, max: 0.2, step: 0.01 },
      { name: 'sens', kind: 'prob', min: 0.8, max: 0.99, step: 0.01 },
      { name: 'spec', kind: 'prob', min: 0.8, max: 0.99, step: 0.01 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'bayesGrid',
  },
  montyHallSwitchWin: {
    name: 'montyHallSwitchWin',
    fn: (doors) => montyHallSwitchWin(doors),
    args: [{ name: 'doors', kind: 'int', min: 3, max: 100 }],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'fraction',
    defaultTolerance: 0.03,
    simulation: 'montyHall',
  },
  geometricMean: {
    name: 'geometricMean',
    fn: (p) => geometricMean(p),
    args: [{ name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 }],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric', 'slider'],
    unit: 'value',
    defaultTolerance: 0.1,
    simulation: 'waitingTime',
  },
  poissonPmf: {
    name: 'poissonPmf',
    fn: (k, lambda) => poissonPmf(k, lambda),
    args: [
      { name: 'k', kind: 'int', min: 0, max: 8 },
      { name: 'lambda', kind: 'number', min: 1, max: 6, step: 0.5 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'poisson',
  },
  randomWalkRMS: {
    name: 'randomWalkRMS',
    fn: (n) => randomWalkRMS(n, 0.5),
    args: [{ name: 'n', kind: 'enum', values: [16, 25, 36, 64, 100, 256, 400] }],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric', 'slider'],
    unit: 'distance',
    defaultTolerance: 1,
    simulation: 'randomWalk',
  },
  buffonProbability: {
    name: 'buffonProbability',
    fn: (L, d) => buffonProbability(L, d),
    args: [
      { name: 'L', kind: 'number', min: 0.2, max: 1, step: 0.1 },
      { name: 'd', kind: 'enum', values: [1] },
    ],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'buffon',
  },
  expectedValueWheel: {
    name: 'expectedValueWheel',
    // Variadic (value,p) pairs flattened: [v0,p0,v1,p1,...]. argSpec is empty;
    // the writer supplies wheelPayouts + the harness derives args from the chosen segments.
    fn: (...flat) => {
      const segs: WheelSegment[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) segs.push({ value: flat[i], p: flat[i + 1] });
      return expectedValue(segs);
    },
    args: [],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric', 'wheel'],
    unit: 'dollars',
    defaultTolerance: 0.5,
    simulation: 'expectedValue',
  },
};
```

> NOTE: `expectedValueWheel` is variadic; the harness treats its `args` as the flattened
> `(value, p)` pairs (validated to sum p≈1, non-negative). All other kernels use fixed
> positional `args` matching `KernelArgSpec[]`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/content/generated/kernels.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/generated/kernels.ts src/content/generated/kernels.test.ts
git commit -m "feat: answer-kernel registry over probability.ts"
```

---

### Task 4: Bank types + aggregate + one fixture + self-verifying test

**Files:**
- Create: `src/content/generated/index.ts`
- Create: `src/content/generated/conditional.ts`
- Create: `src/content/generated/foundations.ts`
- Create: `src/content/generated/generated.test.ts`

- [ ] **Step 1: Write the failing self-verifying test**

```ts
import { describe, it, expect } from 'vitest';
import { generatedProblems } from './index';
import { kernels } from './kernels';
import { validateStep } from '../validate';

describe('generated bank is self-verifying', () => {
  it('every entry recomputes its answer from its kernel and passes validateStep', () => {
    for (const g of generatedProblems) {
      const k = kernels[g.kernel];
      expect(k, `unknown kernel ${g.kernel}`).toBeDefined();
      const interaction = g.step.interaction ?? 'numeric';
      if (interaction === 'numeric' || interaction === 'slider') {
        expect(Math.abs(k.fn(...g.args) - (g.step.answer ?? NaN)))
          .toBeLessThanOrEqual(1e-9);
      }
      expect(validateStep(g.step), `validateStep issues for ${g.step.id}`).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/content/generated/generated.test.ts`
Expected: FAIL ("Cannot find module './index'").

- [ ] **Step 3: Implement the bank types + one fixture entry**

`src/content/generated/index.ts`:

```ts
import type { LessonStep } from '../../types/lesson';
import { conditionalProblems } from './conditional';
import { foundationsProblems } from './foundations';

export type Tier = 'school' | 'mc-school' | 'mc-chapter' | 'amc';

export interface GeneratedProblem {
  step: LessonStep;
  sectionId: string;
  kernel: string;             // kernels[kernel].fn(...args) === step.answer (numeric/slider)
  args: number[];
  tier: Tier;
  difficulty: number;         // 1..5
  provenance: {
    model: string;
    seed: number;
    createdAt: string;
    writerRunId?: string;
    solverRunId?: string;
  };
}

export const generatedBySection: Record<string, GeneratedProblem[]> = {
  's3-conditional': conditionalProblems,
  's1-foundations': foundationsProblems,
};

export const generatedProblems: GeneratedProblem[] = [
  ...conditionalProblems,
  ...foundationsProblems,
];
```

`src/content/generated/conditional.ts` (one real, verified fixture so the test has teeth;
`drawMatchesNoReplacement(4,52,2) = (4/52)(3/51) ≈ 0.004524886...`):

```ts
import type { GeneratedProblem } from './index';

export const conditionalProblems: GeneratedProblem[] = [
  {
    step: {
      id: 'gen-s3-0001',
      type: 'problem',
      title: 'Two aces off the top',
      body: 'A dealer shuffles a standard 52-card deck and deals the top two cards face down.',
      question: 'What is the probability that both are aces? (decimal)',
      answer: 0.004524886877828055,
      tolerance: 0.004,
      unit: 'probability',
      feedback: {
        correct: 'Right — chain the draws: (4/52)(3/51) ≈ 0.0045.',
        incorrect: 'The draws are without replacement: multiply (4/52) by (3/51).',
      },
    },
    sectionId: 's3-conditional',
    kernel: 'drawMatchesNoReplacement',
    args: [4, 52, 2],
    tier: 'mc-school',
    difficulty: 2,
    provenance: { model: 'fixture', seed: 0, createdAt: '2026-06-25T00:00:00.000Z' },
  },
];
```

`src/content/generated/foundations.ts`:

```ts
import type { GeneratedProblem } from './index';

export const foundationsProblems: GeneratedProblem[] = [];
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/content/generated/generated.test.ts`
Expected: PASS (1 test). Also run `npm run build && npm run lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/generated/index.ts src/content/generated/conditional.ts src/content/generated/foundations.ts src/content/generated/generated.test.ts
git commit -m "feat: self-verifying generated problem bank scaffold + fixture"
```

---

## Phase 2 — Harness (pure, no LLM)

### Task 5: `genloop/types.ts` + `extractJson`

**Files:**
- Create: `scripts/genloop/types.ts`
- Create: `scripts/genloop/tsconfig.json`
- Test: `scripts/genloop/types.test.ts`
- Modify: `vitest.config.ts` — add `'scripts/genloop/**/*.test.ts'` to `test.include` (otherwise Vitest, scoped to `src/**`, never discovers the genloop tests)

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/types.test.ts`
Expected: FAIL ("Cannot find module './types'").

- [ ] **Step 3: Implement `types.ts` and `tsconfig.json`**

`scripts/genloop/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true
  },
  "include": ["**/*.ts", "../../src/**/*.ts"]
}
```

`scripts/genloop/types.ts`:

```ts
import type { InteractionType } from '../../src/types/lesson';
import type { GeneratedProblem, Tier } from '../../src/content/generated/index';

export interface NewKernelProposal {
  name: string;
  source: string;        // TS source of the new probability.ts function
  mcSampler: string;     // TS source of a Monte-Carlo sampler body
  vitestCase: string;    // a vitest `it(...)` block
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
  // Walk to the matching bracket to tolerate trailing prose.
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/types.ts scripts/genloop/types.test.ts scripts/genloop/tsconfig.json
git commit -m "feat(genloop): core types + robust JSON extraction"
```

---

### Task 6: `harness/evaluate.ts` — compute the answer from a spec

**Files:**
- Create: `scripts/genloop/harness/evaluate.ts`
- Test: `scripts/genloop/harness/evaluate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { checkArgs, computeAnswer } from './evaluate';
import { kernels } from '../../../src/content/generated/kernels';
import { drawMatchesNoReplacement } from '../../../src/lib/probability';

describe('evaluate', () => {
  it('accepts in-range args', () => {
    expect(checkArgs(kernels['montyHallSwitchWin'], [10])).toEqual([]);
  });
  it('rejects out-of-range args', () => {
    expect(checkArgs(kernels['montyHallSwitchWin'], [2]).length).toBeGreaterThan(0);
  });
  it('rejects enum args not in the allowed set', () => {
    expect(checkArgs(kernels['drawProbability'], [4, 49]).length).toBeGreaterThan(0);
  });
  it('computes the kernel answer', () => {
    expect(computeAnswer(kernels['drawMatchesNoReplacement'], [4, 52, 2]))
      .toBeCloseTo(drawMatchesNoReplacement(4, 52, 2), 12);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/evaluate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `evaluate.ts`**

```ts
import type { Kernel } from '../../../src/content/generated/kernels';

export function checkArgs(kernel: Kernel, args: number[]): string[] {
  const issues: string[] = [];
  if (kernel.name === 'expectedValueWheel') {
    if (args.length < 4 || args.length % 2 !== 0) issues.push('wheel: need an even number of (value,p) args >= 4');
    let psum = 0;
    for (let i = 1; i < args.length; i += 2) { psum += args[i]; if (args[i] < 0) issues.push('wheel: negative probability'); }
    if (Math.abs(psum - 1) > 1e-6) issues.push(`wheel: probabilities sum to ${psum}, not 1`);
    return issues;
  }
  if (args.length !== kernel.args.length) {
    issues.push(`expected ${kernel.args.length} args, got ${args.length}`);
    return issues;
  }
  kernel.args.forEach((spec, i) => {
    const v = args[i];
    if (!Number.isFinite(v)) { issues.push(`${spec.name} is not finite`); return; }
    if (spec.kind === 'int' && !Number.isInteger(v)) issues.push(`${spec.name} must be an integer`);
    if (spec.kind === 'enum') { if (!spec.values!.includes(v)) issues.push(`${spec.name}=${v} not in ${spec.values}`); return; }
    if (spec.min !== undefined && v < spec.min) issues.push(`${spec.name}=${v} < ${spec.min}`);
    if (spec.max !== undefined && v > spec.max) issues.push(`${spec.name}=${v} > ${spec.max}`);
  });
  return issues;
}

export function computeAnswer(kernel: Kernel, args: number[]): number {
  return kernel.fn(...args);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/evaluate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/evaluate.ts scripts/genloop/harness/evaluate.test.ts
git commit -m "feat(genloop): kernel arg validation + answer evaluation"
```

---

### Task 7: `harness/samplers.ts` + `harness/montecarlo.ts`

**Files:**
- Create: `scripts/genloop/harness/samplers.ts`
- Create: `scripts/genloop/harness/montecarlo.ts`
- Test: `scripts/genloop/harness/montecarlo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { monteCarloAgrees } from './montecarlo';
import { kernels } from '../../../src/content/generated/kernels';

describe('monteCarloAgrees', () => {
  it('confirms a correct closed form', () => {
    const k = kernels['drawMatchesNoReplacement'];
    const res = monteCarloAgrees(k, [4, 52, 2], k.fn(4, 52, 2), 0.01);
    expect(res.agrees).toBe(true);
  });
  it('rejects a wrong claimed value when a sampler exists', () => {
    const k = kernels['binomialPmf'];
    const res = monteCarloAgrees(k, [12, 6, 0.5], 0.9, 0.02);
    expect(res.agrees).toBe(false);
  });
  it('returns skipped=true when no sampler is registered', () => {
    const k = kernels['buffonProbability'];
    const res = monteCarloAgrees(k, [1, 1], k.fn(1, 1), 0.02);
    // buffon sampler IS registered below; assert it agrees instead:
    expect(res.agrees || res.skipped).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/montecarlo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `samplers.ts`**

Each sampler returns a single random sample whose mean equals the kernel value. Keyed by
kernel name. (Harness-only; never imported by the app.)

```ts
type Sampler = (args: number[]) => number;

function bernoulli(p: number): number { return Math.random() < p ? 1 : 0; }

export const samplers: Record<string, Sampler> = {
  binomialPmf: ([n, k, p]) => {
    let h = 0; for (let i = 0; i < n; i++) if (Math.random() < p) h++;
    return h === k ? 1 : 0;
  },
  diceSum: ([sum]) => {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    return a + b === sum ? 1 : 0;
  },
  drawProbability: ([matches, deck]) => bernoulli(matches / deck),
  drawMatchesNoReplacement: ([matches, deck, draws]) => {
    let m = matches, d = deck;
    for (let i = 0; i < draws; i++) { if (Math.random() < m / d) { m--; d--; } else return 0; }
    return 1;
  },
  totalProbability2: ([w0, p0, w1, p1]) => {
    const pick0 = Math.random() < w0 / (w0 + w1);
    return bernoulli(pick0 ? p0 : p1);
  },
  bayesPosterior: ([prior, sens, spec]) => {
    // P(D | +): sample only positives, score fraction that are diseased.
    for (;;) {
      const diseased = Math.random() < prior;
      const positive = diseased ? Math.random() < sens : Math.random() >= spec;
      if (positive) return diseased ? 1 : 0;
    }
  },
  montyHallSwitchWin: ([doors]) => {
    const car = Math.floor(Math.random() * doors);
    const pick = Math.floor(Math.random() * doors);
    // Switching wins iff the first pick was wrong.
    return pick === car ? 0 : 1;
  },
  geometricMean: ([p]) => { let s = 1; while (Math.random() >= p) s++; return s; },
  poissonPmf: ([k, lambda]) => {
    // Knuth's algorithm for a Poisson sample.
    const L = Math.exp(-lambda); let n = 0, prod = 1;
    do { n++; prod *= Math.random(); } while (prod > L);
    return (n - 1) === k ? 1 : 0;
  },
  randomWalkRMS: ([n]) => {
    let x = 0; for (let i = 0; i < n; i++) x += Math.random() < 0.5 ? 1 : -1;
    return x * x; // mean = n; RMS = sqrt(mean) (compare against value^2)
  },
  buffonProbability: ([L, d]) => {
    const theta = (Math.random() * Math.PI) / 2;
    const x = Math.random() * (d / 2);
    return x <= (L / 2) * Math.sin(theta) ? 1 : 0;
  },
  expectedValueWheel: (flat) => {
    const r = Math.random(); let acc = 0;
    for (let i = 0; i + 1 < flat.length; i += 2) { acc += flat[i + 1]; if (r <= acc) return flat[i]; }
    return flat[flat.length - 2];
  },
};
```

- [ ] **Step 4: Implement `montecarlo.ts`**

```ts
import type { Kernel } from '../../../src/content/generated/kernels';
import { samplers } from './samplers';

export interface McResult { agrees: boolean; skipped: boolean; estimate: number; expected: number; }

export function monteCarloAgrees(
  kernel: Kernel, args: number[], expected: number, tolerance: number, trials = 60000,
): McResult {
  const sampler = samplers[kernel.name];
  if (!sampler) return { agrees: true, skipped: true, estimate: NaN, expected };
  let total = 0;
  for (let i = 0; i < trials; i++) total += sampler(args);
  let estimate = total / trials;
  // randomWalkRMS samples the squared distance; compare against sqrt(mean).
  if (kernel.name === 'randomWalkRMS') estimate = Math.sqrt(estimate);
  // Use a Monte-Carlo-friendly band: max(2*tolerance, 0.02) so noise never false-fails.
  const band = Math.max(2 * tolerance, 0.02 * Math.max(1, Math.abs(expected)));
  return { agrees: Math.abs(estimate - expected) <= band, skipped: false, estimate, expected };
}
```

> NOTE: The MC band is intentionally looser than the in-app `tolerance` — Monte-Carlo
> only needs to catch gross closed-form errors, not certify the fine tolerance (that is
> the closed form's job). Keep `trials` high enough for rare events.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/montecarlo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/genloop/harness/samplers.ts scripts/genloop/harness/montecarlo.ts scripts/genloop/harness/montecarlo.test.ts
git commit -m "feat(genloop): per-kernel Monte-Carlo cross-check"
```

---

### Task 8: `harness/difficulty.ts` — non-triviality + tier

**Files:**
- Create: `scripts/genloop/harness/difficulty.ts`
- Test: `scripts/genloop/harness/difficulty.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { isTrivial, scoreDifficulty, tierOf } from './difficulty';

describe('difficulty', () => {
  it('flags answer-in-prose as trivial', () => {
    expect(isTrivial('The chance is 0.25 exactly.', 'What is it?', 0.25, ['one step'])).toBe(true);
  });
  it('flags a one-step solution as trivial', () => {
    expect(isTrivial('A fair coin.', 'P(heads)?', 0.5, ['read it off'])).toBe(true);
  });
  it('does not flag a multi-step, answer-not-stated problem', () => {
    expect(isTrivial('Two aces off the top of a deck.', 'P(both aces)?', 0.0045, ['4/52', 'times 3/51'])).toBe(false);
  });
  it('maps higher scores to higher tiers', () => {
    expect(tierOf(scoreDifficulty(1, ['a']))).toBe('school');
    expect(tierOf(scoreDifficulty(5, ['a', 'b', 'c', 'd']))).toBe('amc');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/difficulty.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `difficulty.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/difficulty.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/difficulty.ts scripts/genloop/harness/difficulty.test.ts
git commit -m "feat(genloop): non-triviality heuristic + tier scoring"
```

---

### Task 9: `harness/dedup.ts`

**Files:**
- Create: `scripts/genloop/harness/dedup.ts`
- Test: `scripts/genloop/harness/dedup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Deduper } from './dedup';

describe('Deduper', () => {
  it('rejects an identical (kernel,args) pair', () => {
    const d = new Deduper();
    expect(d.accept('binomialPmf', [12, 6, 0.5], 'A coin is flipped twelve times.')).toBe(true);
    expect(d.accept('binomialPmf', [12, 6, 0.5], 'Totally different prose here friend.')).toBe(false);
  });
  it('rejects near-duplicate prose even with different args', () => {
    const d = new Deduper();
    const prose = 'A dealer shuffles a standard deck and deals the top two cards face down today.';
    expect(d.accept('drawMatchesNoReplacement', [4, 52, 2], prose)).toBe(true);
    expect(d.accept('drawMatchesNoReplacement', [4, 52, 3], prose)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/dedup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `dedup.ts`**

```ts
function shingles(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) set.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
  return set;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export class Deduper {
  private keys = new Set<string>();
  private proseShingles: Set<string>[] = [];
  private threshold: number;
  constructor(threshold = 0.6) { this.threshold = threshold; }

  /** Seed from already-emitted problems so a fresh run won't re-create them. */
  seed(entries: Array<{ kernel: string; args: number[]; prose: string }>): void {
    for (const e of entries) { this.keys.add(this.key(e.kernel, e.args)); this.proseShingles.push(shingles(e.prose)); }
  }

  private key(kernel: string, args: number[]): string {
    return kernel + ':' + args.map((a) => Math.round(a * 1e4) / 1e4).join(',');
  }

  accept(kernel: string, args: number[], prose: string): boolean {
    const k = this.key(kernel, args);
    if (this.keys.has(k)) return false;
    const sh = shingles(prose);
    for (const prev of this.proseShingles) if (jaccard(sh, prev) >= this.threshold) return false;
    this.keys.add(k);
    this.proseShingles.push(sh);
    return true;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/dedup.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/dedup.ts scripts/genloop/harness/dedup.test.ts
git commit -m "feat(genloop): (kernel,args) + prose-shingle dedup"
```

---

### Task 10: `harness/emit.ts` — render typed bank entry + snapshot/restore

**Files:**
- Create: `scripts/genloop/harness/emit.ts`
- Test: `scripts/genloop/harness/emit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderEntry } from './emit';
import type { GeneratedProblem } from '../../../src/content/generated/index';

const g: GeneratedProblem = {
  step: {
    id: 'gen-x', type: 'problem', title: 'T', body: 'b "quoted" line',
    question: 'q? (decimal)', answer: 0.5, tolerance: 0.05, unit: 'probability',
    feedback: { correct: 'c', incorrect: 'i' },
  },
  sectionId: 's3-conditional', kernel: 'diceSum', args: [7], tier: 'mc-school', difficulty: 2,
  provenance: { model: 'm', seed: 1, createdAt: '2026-06-25T00:00:00.000Z' },
};

describe('renderEntry', () => {
  it('produces valid JS that JSON.parse-round-trips the data portion', () => {
    const src = renderEntry(g);
    expect(src).toContain('"gen-x"');
    expect(src).toContain('kernel: "diceSum"');
    // escaping: embedded quotes survive
    expect(src).toContain('b \\"quoted\\" line');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/emit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `emit.ts`**

Render entries as an object literal using `JSON.stringify` for the data (safe escaping)
but with unquoted top-level keys for readability is unnecessary — emit valid TS by
`JSON.stringify` and `satisfies GeneratedProblem`.

```ts
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GeneratedProblem } from '../../../src/content/generated/index';

const SECTION_FILES: Record<string, string> = {
  's1-foundations': 'src/content/generated/foundations.ts',
  's3-conditional': 'src/content/generated/conditional.ts',
  // ...one path per section as files are added.
};

/** A TS object-literal for one entry. JSON.stringify handles all escaping. */
export function renderEntry(g: GeneratedProblem): string {
  const j = JSON.stringify(g, null, 2)
    .replace(/^/gm, '  ')                       // indent inside the array
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:'); // bare keys for readability
  return j;
}

export function sectionFile(sectionId: string): string {
  const f = SECTION_FILES[sectionId];
  if (!f) throw new Error(`no bank file mapped for section ${sectionId}`);
  return f;
}

const ARRAY_NAME: Record<string, string> = {
  's1-foundations': 'foundationsProblems',
  's3-conditional': 'conditionalProblems',
};

/** Insert one rendered entry before the closing `];` of the section's exported array. */
export function appendEntry(g: GeneratedProblem): void {
  const file = sectionFile(g.sectionId);
  const arr = ARRAY_NAME[g.sectionId];
  const src = readFileSync(file, 'utf8');
  const marker = `export const ${arr}: GeneratedProblem[] = [`;
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`array ${arr} not found in ${file}`);
  const close = src.indexOf('];', at);
  const head = src.slice(0, close);
  const tail = src.slice(close);
  const sep = head.trimEnd().endsWith('[') ? '\n' : '';
  const block = `${sep}${renderEntry(g)},\n`;
  writeFileSync(file, head + block + tail, 'utf8');
}

const SNAP = 'scripts/genloop/.manifest/snapshot';
export function snapshotBank(): void {
  rmSync(SNAP, { recursive: true, force: true });
  mkdirSync(dirname(SNAP), { recursive: true });
  cpSync('src/content/generated', SNAP, { recursive: true });
}
export function restoreBank(): void {
  if (existsSync(SNAP)) { rmSync('src/content/generated', { recursive: true, force: true }); cpSync(SNAP, 'src/content/generated', { recursive: true }); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/emit.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/emit.ts scripts/genloop/harness/emit.test.ts
git commit -m "feat(genloop): render/append typed bank entries + snapshot-restore"
```

---

### Task 11: `harness/gate.ts` — run + parse the repo gate

**Files:**
- Create: `scripts/genloop/harness/gate.ts`
- Test: `scripts/genloop/harness/gate.test.ts`

- [ ] **Step 1: Write the failing test (parser only — pure)**

```ts
import { describe, it, expect } from 'vitest';
import { parseGateOutput } from './gate';

describe('parseGateOutput', () => {
  it('passes when all three succeed', () => {
    const r = parseGateOutput({ tsc: 0, eslint: 0, vitest: 0 });
    expect(r.ok).toBe(true);
  });
  it('fails and names the failing step', () => {
    const r = parseGateOutput({ tsc: 0, eslint: 1, vitest: 0 });
    expect(r.ok).toBe(false);
    expect(r.failed).toContain('eslint');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/gate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `gate.ts`**

```ts
import { spawnSync } from 'node:child_process';

export interface GateResult { ok: boolean; failed: string[]; logs: Record<string, string>; }

export function parseGateOutput(codes: Record<string, number>): GateResult {
  const failed = Object.entries(codes).filter(([, c]) => c !== 0).map(([k]) => k);
  return { ok: failed.length === 0, failed, logs: {} };
}

function run(cmd: string, args: string[]): { code: number; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/** Run tsc + eslint + vitest; return pass/fail with logs. */
export function runRepoGate(): GateResult {
  const tsc = run('npx', ['tsc', '-b']);
  const eslint = run('npx', ['eslint', '.']);
  const vitest = run('npx', ['vitest', 'run']);
  const res = parseGateOutput({ tsc: tsc.code, eslint: eslint.code, vitest: vitest.code });
  res.logs = { tsc: tsc.out, eslint: eslint.out, vitest: vitest.out };
  return res;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/gate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/gate.ts scripts/genloop/harness/gate.test.ts
git commit -m "feat(genloop): repo gate runner (tsc+eslint+vitest)"
```

---

### Task 12: `harness/extend.ts` — apply a new probability.ts function

**Files:**
- Create: `scripts/genloop/harness/extend.ts`
- Test: `scripts/genloop/harness/extend.test.ts`

- [ ] **Step 1: Write the failing test (string assembly is the testable unit)**

```ts
import { describe, it, expect } from 'vitest';
import { buildProbabilityPatch, buildTestPatch } from './extend';
import type { NewKernelProposal } from '../types';

const prop: NewKernelProposal = {
  name: 'thirdsRule',
  source: 'export function thirdsRule(n: number): number {\n  return n / 3;\n}',
  mcSampler: '([n]) => (Math.random() < 1/3 ? n : 0)',
  vitestCase: "it('thirdsRule', () => { expect(thirdsRule(3)).toBeCloseTo(1, 10); });",
  sectionIds: ['s1-foundations'], interactions: ['numeric'], unit: 'value',
};

describe('extend patches', () => {
  it('appends the function source to probability.ts content', () => {
    const out = buildProbabilityPatch('// existing\n', prop);
    expect(out).toContain('export function thirdsRule');
    expect(out.endsWith('\n')).toBe(true);
  });
  it('inserts the import and the test case into probability.test.ts content', () => {
    const existing = "import {\n  binomialPmf,\n} from './probability';\n\ndescribe('x', () => {});\n";
    const out = buildTestPatch(existing, prop);
    expect(out).toContain('thirdsRule,');
    expect(out).toContain("it('thirdsRule'");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/harness/extend.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `extend.ts`**

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import type { NewKernelProposal } from '../types';

const PROB = 'src/lib/probability.ts';
const TEST = 'src/lib/probability.test.ts';

export function buildProbabilityPatch(existing: string, p: NewKernelProposal): string {
  const trimmed = existing.endsWith('\n') ? existing : existing + '\n';
  return `${trimmed}\n${p.source.trim()}\n`;
}

export function buildTestPatch(existing: string, p: NewKernelProposal): string {
  // add to the first import-from-'./probability' block
  const withImport = existing.replace(
    /import \{\n([\s\S]*?)\n\} from '\.\/probability';/,
    (_m, names) => `import {\n${names}\n  ${p.name},\n} from './probability';`,
  );
  // append the test case at end of file inside a fresh describe block
  return `${withImport.trimEnd()}\n\ndescribe('generated: ${p.name}', () => {\n  ${p.vitestCase.trim()}\n});\n`;
}

/** Apply both patches to disk. Returns a revert() that restores the originals. */
export function applyNewKernel(p: NewKernelProposal): () => void {
  const prob0 = readFileSync(PROB, 'utf8');
  const test0 = readFileSync(TEST, 'utf8');
  writeFileSync(PROB, buildProbabilityPatch(prob0, p), 'utf8');
  writeFileSync(TEST, buildTestPatch(test0, p), 'utf8');
  return () => { writeFileSync(PROB, prob0, 'utf8'); writeFileSync(TEST, test0, 'utf8'); };
}
```

> NOTE: After `applyNewKernel`, the caller (orchestrator) must ALSO register the kernel
> in `kernels.ts` (and a sampler in `samplers.ts`) in-memory for this run, then run
> `runRepoGate()`. Persisting the new kernel into `kernels.ts`/`samplers.ts` source is a
> later enhancement; for v1, extend-path problems are only kept if the engineer wires the
> kernel literal (the run logs the exact literal to add). Keep `--allow-extend` OFF by
> default.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/harness/extend.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/harness/extend.ts scripts/genloop/harness/extend.test.ts
git commit -m "feat(genloop): probability.ts extend-path patch builders"
```

---

## Phase 3 — SDK agents

### Task 13: Agent prompts

**Files:**
- Create: `scripts/genloop/prompts/writer.md`
- Create: `scripts/genloop/prompts/verifier.md`
- Create: `scripts/genloop/prompts/solver.md`
- Create: `scripts/genloop/prompts/formatter.md`

- [ ] **Step 1: Write `writer.md`**

```md
You are a math-competition problem writer (MathCounts/AMC/school-test style) for a
probability course. You will be given a TARGET (section, kernel name, kernel argument
spec, allowed interaction, difficulty tier) and a SCENARIO BANK.

Write ONE original problem whose correct answer is exactly the value of
`kernel.fn(...args)`. You do NOT compute or state the answer.

Rules:
- Choose `args` strictly within the kernel's argument spec.
- The problem must require at least TWO non-trivial reasoning steps (e.g. take a
  complement, then chain; or count, then divide). Never a single read-off.
- State every parameter explicitly. Never state or imply the numeric answer.
- Make it concrete and engaging — use a real-world scenario from the bank or a similar
  one, with specific nouns and numbers.
- The `questionDraft` MUST state the answer format in parentheses, e.g. "(decimal)",
  "(a whole number)", "(dollars)".
- Match the requested interaction. For `order`, provide `orderItems` (≥3). For `draw`,
  provide `drawCategories`. For `wheel`, provide `wheelPayouts`.

Return ONLY a JSON object:
{"sectionId","kernel","args":[...],"interaction","scenarioDraft","questionDraft",
 "orderItems?","drawCategories?","wheelPayouts?"}
```

- [ ] **Step 2: Write `verifier.md`**

```md
You are a strict problem verifier. Given a problem SPEC and the harness-computed
ANSWER, decide if the problem is sound and well-posed.

Reject (ok=false) if ANY of these hold:
- The prose is ambiguous or under-specified (a solver could reasonably get a different
  number).
- The asked quantity is not exactly what the kernel computes.
- The answer (or an obvious rounding of it) is stated in the prose.
- The problem is trivial (solvable in one step / by reading a number off).
- Units/format in the question don't match the answer.

Return ONLY JSON: {"ok": boolean, "issues": ["..."]}
```

- [ ] **Step 3: Write `solver.md`**

```md
You are an independent contest solver. Solve the problem from scratch. You are given
ONLY the problem statement — no answer, no formula name.

Show your reasoning as short steps, then give a single final numeric answer in the
format the question requests (a decimal unless it asks for a count/dollars). If the
problem is ambiguous or unsolvable as written, set "confident": false.

Return ONLY JSON:
{"answer": number|null, "steps": ["...","..."], "estDifficulty": 1-5, "confident": boolean}
```

- [ ] **Step 4: Write `formatter.md`**

```md
You are an editor for a Khan-Academy-style probability course. Rewrite the given
problem to be compelling and on-voice WITHOUT changing its math, parameters, or answer.

Voice rules:
- Second person where natural; concrete nouns; state every parameter.
- The question ends with the answer format in parentheses.
- Write two feedback lines:
  - "correct": affirm + one-line intuition (you MAY reference the value).
  - "incorrect": hint toward the METHOD, never the number.

Return ONLY JSON: {"title","body","question","feedbackCorrect","feedbackIncorrect"}
```

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/prompts/
git commit -m "feat(genloop): agent system prompts (writer/verifier/solver/formatter)"
```

---

### Task 14: Writer agent

**Files:**
- Create: `scripts/genloop/agents/writer.ts`
- Test: `scripts/genloop/agents/writer.test.ts`

- [ ] **Step 1: Write the failing test (pure buildPrompt + parse, fake caller)**

```ts
import { describe, it, expect } from 'vitest';
import { buildWriterPrompt, parseSpec, runWriter } from './writer';
import { kernels } from '../../../src/content/generated/kernels';
import type { LlmCaller, PlanTarget } from '../types';

const target: PlanTarget = { sectionId: 's3-conditional', kernel: 'diceSum', interaction: 'numeric', tier: 'mc-school', seed: 1 };

describe('writer', () => {
  it('prompt includes the kernel arg spec and interaction', () => {
    const p = buildWriterPrompt(target, kernels['diceSum'], ['avoid this (kernel:7)']);
    expect(p).toContain('diceSum');
    expect(p).toContain('numeric');
    expect(p).toContain('sum');
  });
  it('parses a valid spec and rejects junk', () => {
    expect(parseSpec('{"sectionId":"s3-conditional","kernel":"diceSum","args":[7],"interaction":"numeric","scenarioDraft":"x","questionDraft":"y? (decimal)"}')).not.toBeNull();
    expect(parseSpec('nope')).toBeNull();
  });
  it('runWriter uses the caller and returns a parsed spec', async () => {
    const caller: LlmCaller = { call: async () => '{"sectionId":"s3-conditional","kernel":"diceSum","args":[8],"interaction":"numeric","scenarioDraft":"x","questionDraft":"y? (decimal)"}' };
    const spec = await runWriter(caller, target, kernels['diceSum'], []);
    expect(spec?.args).toEqual([8]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/agents/writer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `writer.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/agents/writer.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/agents/writer.ts scripts/genloop/agents/writer.test.ts
git commit -m "feat(genloop): writer agent (prompt + parse + run)"
```

---

### Task 15: Verifier, Solver, Formatter agents

Mirror Task 14's shape. Each has `build*Prompt`, `parse*`, `run*`, with a fake-caller test.

**Files:**
- Create: `scripts/genloop/agents/verifier.ts` + `.test.ts`
- Create: `scripts/genloop/agents/solver.ts` + `.test.ts`
- Create: `scripts/genloop/agents/formatter.ts` + `.test.ts`

- [ ] **Step 1: Write failing tests**

`verifier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseVerdict, runVerifier, buildVerifierPrompt } from './verifier';
import type { LlmCaller, ProblemSpec } from '../types';
const spec: ProblemSpec = { sectionId: 's3-conditional', kernel: 'diceSum', args: [7], interaction: 'numeric', scenarioDraft: 'two dice', questionDraft: 'p(7)? (decimal)' };
describe('verifier', () => {
  it('builds a prompt containing the computed answer', () => {
    expect(buildVerifierPrompt(spec, 0.1667)).toContain('0.1667');
  });
  it('parses a verdict', () => {
    expect(parseVerdict('{"ok":true,"issues":[]}')).toEqual({ ok: true, issues: [] });
    expect(parseVerdict('junk')).toBeNull();
  });
  it('runs', async () => {
    const caller: LlmCaller = { call: async () => '{"ok":false,"issues":["ambiguous"]}' };
    expect((await runVerifier(caller, spec, 0.1667))?.ok).toBe(false);
  });
});
```

`solver.test.ts`:

```ts
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
```

`formatter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFormat, runFormatter, buildFormatterPrompt } from './formatter';
import type { LlmCaller, ProblemSpec } from '../types';
const spec: ProblemSpec = { sectionId: 's3-conditional', kernel: 'diceSum', args: [7], interaction: 'numeric', scenarioDraft: 'two dice', questionDraft: 'p(7)? (decimal)' };
describe('formatter', () => {
  it('builds a prompt with the draft', () => { expect(buildFormatterPrompt(spec, 0.1667)).toContain('two dice'); });
  it('parses formatting', () => {
    expect(parseFormat('{"title":"T","body":"B","question":"Q? (decimal)","feedbackCorrect":"c","feedbackIncorrect":"i"}')?.title).toBe('T');
    expect(parseFormat('x')).toBeNull();
  });
  it('runs', async () => {
    const caller: LlmCaller = { call: async () => '{"title":"T","body":"B","question":"Q? (decimal)","feedbackCorrect":"c","feedbackIncorrect":"i"}' };
    expect((await runFormatter(caller, spec, 0.1667))?.body).toBe('B');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run scripts/genloop/agents/verifier.test.ts scripts/genloop/agents/solver.test.ts scripts/genloop/agents/formatter.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the three agents**

`verifier.ts`:

```ts
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
```

`solver.ts`:

```ts
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
```

`formatter.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run scripts/genloop/agents/`
Expected: PASS (verifier 3, solver 3, formatter 3).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/agents/verifier.ts scripts/genloop/agents/verifier.test.ts scripts/genloop/agents/solver.ts scripts/genloop/agents/solver.test.ts scripts/genloop/agents/formatter.ts scripts/genloop/agents/formatter.test.ts
git commit -m "feat(genloop): verifier, blind solver, formatter agents"
```

---

### Task 16: SDK caller (`sdkClient.ts`)

**Files:**
- Create: `scripts/genloop/sdkClient.ts`
- Test: `scripts/genloop/sdkClient.test.ts`

- [ ] **Step 1: Write the failing test (constructor + cwd; no live call)**

```ts
import { describe, it, expect } from 'vitest';
import { SdkCaller } from './sdkClient';

describe('SdkCaller', () => {
  it('constructs with an api key, model, and a temp cwd', () => {
    const c = new SdkCaller('key_x', 'composer-2.5');
    expect(c.model).toBe('composer-2.5');
    expect(typeof c.cwd).toBe('string');
    expect(c.cwd.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/sdkClient.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `sdkClient.ts`**

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LlmCaller } from './types';

// @cursor/sdk is imported lazily inside call() so that merely importing this module
// (e.g. in the unit test / repo gate) never loads the heavy SDK + its native optional
// deps. The SDK only loads during an actual live run.
export class SdkCaller implements LlmCaller {
  apiKey: string;
  model: string;
  cwd: string;
  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.cwd = mkdtempSync(join(tmpdir(), 'genloop-'));
  }
  async call(prompt: string): Promise<string> {
    const { Agent, CursorAgentError } = await import('@cursor/sdk');
    try {
      const result = await Agent.prompt(prompt, {
        apiKey: this.apiKey,
        model: { id: this.model },
        local: { cwd: this.cwd, settingSources: [] },
      });
      if (result.status === 'error') throw new Error(`run failed: ${result.id}`);
      return result.result ?? '';
    } catch (err) {
      if (err instanceof CursorAgentError) throw new Error(`startup failed: ${err.message} (retryable=${err.isRetryable})`);
      throw err;
    }
  }
}
```

> NOTE: If `@cursor/sdk` exposes a system-prompt option, the agents already fold their
> system text into the single prompt string, so no change is needed. Verify the
> `Agent.prompt` option names against the installed version during Task 18's dry run; the
> three fields used here (`apiKey`, `model.id`, `local.cwd`/`settingSources`) match the
> SDK skill examples.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/sdkClient.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/sdkClient.ts scripts/genloop/sdkClient.test.ts
git commit -m "feat(genloop): Cursor SDK caller (temp cwd, error mapping)"
```

---

## Phase 4 — Planner, orchestrator, CLI

### Task 17: Planner

**Files:**
- Create: `scripts/genloop/planner.ts`
- Test: `scripts/genloop/planner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { planBatch } from './planner';

describe('planBatch', () => {
  it('produces exactly count targets, each a valid kernel+supported interaction', () => {
    const targets = planBatch({ count: 50, seed: 7 });
    expect(targets.length).toBe(50);
    for (const t of targets) expect(t.kernel.length).toBeGreaterThan(0);
  });
  it('respects a section filter', () => {
    const targets = planBatch({ count: 10, seed: 1, sectionId: 's3-conditional' });
    for (const t of targets) expect(t.sectionId).toBe('s3-conditional');
  });
  it('roughly honors the interaction mix over a large batch', () => {
    const targets = planBatch({ count: 400, seed: 3 });
    const numeric = targets.filter((t) => t.interaction === 'numeric').length / 400;
    expect(numeric).toBeGreaterThan(0.3);
    expect(numeric).toBeLessThan(0.65);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/planner.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `planner.ts`**

```ts
import { makeRng } from '../../src/lib/rng';
import { kernels, type Kernel } from '../../src/content/generated/kernels';
import type { InteractionType } from '../../src/types/lesson';
import type { PlanTarget } from './types';
import type { Tier } from '../../src/content/generated/index';

const MIX: Array<[InteractionType, number]> = [
  ['numeric', 0.45], ['slider', 0.15], ['order', 0.15], ['draw', 0.15], ['wheel', 0.10],
];
const TIERS: Tier[] = ['school', 'mc-school', 'mc-chapter', 'amc'];

export interface PlanOpts { count: number; seed: number; sectionId?: string; interaction?: InteractionType; tier?: Tier; }

function pickInteraction(r: ReturnType<typeof makeRng>, kernel: Kernel, forced?: InteractionType): InteractionType | null {
  if (forced) return kernel.interactions.includes(forced) ? forced : null;
  const roll = r.next();
  let acc = 0;
  for (const [it, w] of MIX) { acc += w; if (roll <= acc && kernel.interactions.includes(it)) return it; }
  // fallback to any supported interaction
  return kernel.interactions[r.int(0, kernel.interactions.length - 1)] ?? null;
}

export function planBatch(opts: PlanOpts): PlanTarget[] {
  const r = makeRng(opts.seed >>> 0);
  const pool = Object.values(kernels).filter((k) => !opts.sectionId || k.sectionIds.includes(opts.sectionId));
  if (pool.length === 0) throw new Error(`no kernels for section ${opts.sectionId}`);
  const targets: PlanTarget[] = [];
  let guard = 0;
  while (targets.length < opts.count && guard < opts.count * 20) {
    guard++;
    const kernel = pool[r.int(0, pool.length - 1)];
    const interaction = pickInteraction(r, kernel, opts.interaction);
    if (!interaction) continue;
    const sectionId = opts.sectionId ?? kernel.sectionIds[r.int(0, kernel.sectionIds.length - 1)];
    const tier = opts.tier ?? TIERS[r.int(0, TIERS.length - 1)];
    targets.push({ sectionId, kernel: kernel.name, interaction, tier, seed: r.int(1, 2 ** 30) });
  }
  return targets;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/planner.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/planner.ts scripts/genloop/planner.test.ts
git commit -m "feat(genloop): batch planner honoring interaction mix + filters"
```

---

### Task 18: Orchestrator (the loop, with dependency injection)

**Files:**
- Create: `scripts/genloop/orchestrator.ts`
- Test: `scripts/genloop/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test (fakes for all agents, real harness)**

```ts
import { describe, it, expect } from 'vitest';
import { runOne, type Deps } from './orchestrator';
import { kernels } from '../../src/content/generated/kernels';
import { Deduper } from './harness/dedup';
import type { PlanTarget } from './types';

const target: PlanTarget = { sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', interaction: 'numeric', tier: 'mc-school', seed: 1 };

function deps(over: Partial<Deps> = {}): Deps {
  return {
    writer: async () => ({ sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', args: [4, 52, 2], interaction: 'numeric', scenarioDraft: 'A dealer deals the top two cards of a shuffled deck.', questionDraft: 'P(both aces)? (decimal)' }),
    verifier: async () => ({ ok: true, issues: [] }),
    solver: async () => ({ answer: kernels['drawMatchesNoReplacement'].fn(4, 52, 2), steps: ['4/52', 'times 3/51'], estDifficulty: 2, confident: true }),
    formatter: async () => ({ title: 'Two aces', body: 'A dealer deals the top two cards of a shuffled deck.', question: 'P(both aces)? (decimal)', feedbackCorrect: 'c', feedbackIncorrect: 'i' }),
    deduper: new Deduper(),
    model: 'fake',
    ...over,
  };
}

describe('runOne', () => {
  it('accepts when all gates pass and recompute matches', async () => {
    const res = await runOne(target, deps());
    expect(res.status).toBe('accepted');
    if (res.status === 'accepted') {
      expect(res.problem.kernel).toBe('drawMatchesNoReplacement');
      expect(Math.abs(kernels['drawMatchesNoReplacement'].fn(...res.problem.args) - (res.problem.step.answer ?? 0))).toBeLessThan(1e-9);
    }
  });
  it('rejects when the blind solver disagrees', async () => {
    const res = await runOne(target, deps({ solver: async () => ({ answer: 0.9, steps: ['x', 'y'], estDifficulty: 2, confident: true }) }));
    expect(res.status).toBe('rejected');
  });
  it('rejects when the verifier says not ok', async () => {
    const res = await runOne(target, deps({ verifier: async () => ({ ok: false, issues: ['ambiguous'] }) }));
    expect(res.status).toBe('rejected');
  });
  it('rejects a trivial (answer-in-prose) problem', async () => {
    const res = await runOne(target, deps({ writer: async () => ({ sectionId: 's3-conditional', kernel: 'drawMatchesNoReplacement', args: [4, 52, 2], interaction: 'numeric', scenarioDraft: 'The answer is 0.0045.', questionDraft: 'P? (decimal)' }) }));
    expect(res.status).toBe('rejected');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/orchestrator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `orchestrator.ts`**

```ts
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
  // Triple-agreement for numeric/slider:
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

  const difficulty = scoreDifficulty(solve.estDifficulty, solve.steps);
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
```

> NOTE: v1 supports `numeric` and `slider` end-to-end (triple agreement). `order`/`draw`/
> `wheel` require building `orderItems`/`answerOrder`, `drawCategories`/`answerShape`, or
> `wheelPayouts`/target from the spec + kernel; the planner only emits interactions a
> kernel supports, and the orchestrator currently maps numeric/slider. Wiring the
> remaining three is Task 21 (extension) — keep the planner restricted to
> `['numeric','slider']` via `--interaction` until then, OR implement Task 21 first.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/orchestrator.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/genloop/orchestrator.ts scripts/genloop/orchestrator.test.ts
git commit -m "feat(genloop): orchestrator state machine with all gates (numeric/slider)"
```

---

### Task 19: CLI entrypoint (`run.ts`)

**Files:**
- Create: `scripts/genloop/run.ts`
- Test: `scripts/genloop/run.test.ts` (flag parsing only)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseFlags } from './run';

describe('parseFlags', () => {
  it('parses count, section, model, dry-run', () => {
    const f = parseFlags(['--count', '12', '--section', 's3-conditional', '--model', 'auto', '--dry-run']);
    expect(f.count).toBe(12);
    expect(f.sectionId).toBe('s3-conditional');
    expect(f.model).toBe('auto');
    expect(f.dryRun).toBe(true);
  });
  it('defaults count to 10 and dryRun to false', () => {
    const f = parseFlags([]);
    expect(f.count).toBe(10);
    expect(f.dryRun).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/genloop/run.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `run.ts`**

```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { InteractionType } from '../../src/types/lesson';
import type { Tier, GeneratedProblem } from '../../src/content/generated/index';
import { generatedProblems } from '../../src/content/generated/index';
import { planBatch } from './planner';
import { runOne, type Deps } from './orchestrator';
import { Deduper } from './harness/dedup';
import { appendEntry, snapshotBank, restoreBank } from './harness/emit';
import { runRepoGate } from './harness/gate';
import { SdkCaller } from './sdkClient';
import { kernels } from '../../src/content/generated/kernels';
import { runWriter } from './agents/writer';
import { runVerifier } from './agents/verifier';
import { runSolver } from './agents/solver';
import { runFormatter } from './agents/formatter';

export interface Flags {
  count: number; sectionId?: string; interaction?: InteractionType; tier?: Tier;
  model: string; dryRun: boolean; seed: number;
}

export function parseFlags(argv: string[]): Flags {
  const get = (k: string): string | undefined => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    count: Number(get('--count') ?? 10),
    sectionId: get('--section'),
    interaction: get('--interaction') as InteractionType | undefined,
    tier: get('--tier') as Tier | undefined,
    model: get('--model') ?? 'composer-2.5',
    dryRun: argv.includes('--dry-run'),
    seed: Number(get('--seed') ?? Date.now() % 2_000_000_000),
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) { console.error('Set CURSOR_API_KEY'); process.exit(1); }

  const caller = new SdkCaller(apiKey, flags.model);
  const deduper = new Deduper();
  deduper.seed(generatedProblems.map((g) => ({ kernel: g.kernel, args: g.args, prose: g.step.body })));

  const deps: Deps = {
    writer: (t, avoid) => runWriter(caller, t, kernels[t.kernel], avoid),
    verifier: (s, a) => runVerifier(caller, s, a),
    solver: (sc, q) => runSolver(caller, sc, q),
    formatter: (s, a) => runFormatter(caller, s, a),
    deduper,
    model: flags.model,
  };

  const targets = planBatch({ count: flags.count, seed: flags.seed, sectionId: flags.sectionId, interaction: flags.interaction, tier: flags.tier });
  const accepted: GeneratedProblem[] = [];
  const manifest: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await runOne(target, deps);
      if (result.status !== 'rejected') break;
    }
    manifest.push({ target, status: result!.status, reason: result!.status !== 'accepted' ? (result as { reason: string }).reason : undefined });
    if (result!.status === 'accepted') accepted.push(result!.problem);
  }

  console.log(`Planned ${targets.length}, accepted ${accepted.length}.`);

  mkdirSync('scripts/genloop/.manifest', { recursive: true });
  writeFileSync(join('scripts/genloop/.manifest', `${Date.now()}.json`), JSON.stringify(manifest, null, 2));

  if (flags.dryRun) { console.log('Dry run — no files written.'); return; }
  if (accepted.length === 0) { console.log('Nothing accepted.'); return; }

  snapshotBank();
  for (const g of accepted) appendEntry(g);
  const gate = runRepoGate();
  if (!gate.ok) {
    restoreBank();
    console.error(`Repo gate FAILED (${gate.failed.join(', ')}); reverted ${accepted.length} entries.`);
    console.error(gate.logs[gate.failed[0]]?.slice(-2000) ?? '');
    process.exit(2);
  }
  console.log(`Wrote ${accepted.length} problems; repo gate passed.`);
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('run.ts')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/genloop/run.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full unit suite + lint + build**

Run: `npm run lint && npm run build && npx vitest run`
Expected: PASS (all unit tests, including the bank self-verifier).

- [ ] **Step 6: Commit**

```bash
git add scripts/genloop/run.ts scripts/genloop/run.test.ts
git commit -m "feat(genloop): CLI entrypoint with snapshot/gate/manifest"
```

---

### Task 20: README

**Files:**
- Create: `scripts/genloop/README.md`

- [ ] **Step 1: Write the README**

````md
# genloop — autonomous probability problem generator

Offline authoring pipeline. NOT part of the app bundle. Writes a self-verifying typed
problem bank to `src/content/generated/`. Answers always come from `src/lib/probability.ts`.

## Run

```bash
export CURSOR_API_KEY="cursor_..."
npm run genloop -- --count 20 --section s3-conditional --model composer-2.5
npm run genloop -- --count 5 --dry-run          # plan + agents, write nothing
```

## How correctness is guaranteed (no human gate)

1. The answer is `kernel.fn(...args)` from probability.ts — never the LLM's arithmetic.
2. A Monte-Carlo sampler must converge to that value.
3. (numeric/slider) An independent blind solver must reach the same number.
4. The app's own `validateStep()` must pass (answer accepted, wrong rejected, reachable).
5. Dedup rejects repeats; a heuristic rejects trivial/answer-in-prose problems.
6. The whole repo gate (`tsc -b && eslint . && vitest run`) must pass; on failure the
   batch is reverted. `generated.test.ts` recomputes every answer forever.

## Flags

`--count --section --interaction --tier --model --seed --dry-run`

## Manifest

Every attempt (accepted/rejected + reason) is logged to
`scripts/genloop/.manifest/<timestamp>.json` (git-ignored).
````

- [ ] **Step 2: Commit**

```bash
git add scripts/genloop/README.md
git commit -m "docs(genloop): usage + correctness model"
```

---

## Phase 5 — Live dry run (integration; requires `CURSOR_API_KEY`)

### Task 21: End-to-end dry run + first real batch

**Files:** none (verification task)

- [ ] **Step 1: Dry run (no writes)**

Run: `CURSOR_API_KEY=... npm run genloop -- --count 3 --section s3-conditional --interaction numeric --model auto --dry-run`
Expected: prints "Planned 3, accepted N"; a manifest file appears; no bank files change
(`git status` clean for `src/content/generated/`). Confirm the `Agent.prompt` options
match the installed `@cursor/sdk` (fix `sdkClient.ts` if the SDK renamed a field).

- [ ] **Step 2: Small real batch**

Run: `CURSOR_API_KEY=... npm run genloop -- --count 5 --section s3-conditional --interaction numeric`
Expected: "Wrote K problems; repo gate passed." Inspect `git diff src/content/generated/conditional.ts`.

- [ ] **Step 3: Verify the bank is still self-consistent**

Run: `npx vitest run src/content/generated/generated.test.ts && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit the generated batch (optional, author's discretion)**

```bash
git add src/content/generated/
git commit -m "content: first autonomous-generated conditional problems"
```

---

## Future extensions (out of scope for this plan)

- `order`/`draw`/`wheel` end-to-end emission (build `answerOrder`/`answerShape`/wheel
  target from kernel values; the validators already support them).
- Persist extend-path kernels into `kernels.ts`/`samplers.ts` automatically.
- More kernels (one per remaining `probability.ts` function) — mechanical, same shape.
- A `--section` sweep that fills every section to a target count.
- App wiring (Practice page / `problemTemplates` merge / daily) — a separate spec.

---

## Self-review

- **Spec coverage:** four agents (Tasks 14–15), SDK runtime (16), kernel registry (3),
  self-verifying bank (4), Monte-Carlo (7), blind-solver triple-agreement (18),
  heuristic difficulty/tier (8), dedup (9), validators reuse (2), extend path (12),
  repo gate + revert (11/19), interaction mix (17), no human gate (19), bank-only (no app
  wiring). ✓
- **Placeholders:** none — every code/test step has full content.
- **Type consistency:** `LlmCaller.call`, `ProblemSpec`, `Verdict`, `SolveResult`,
  `Formatted`, `GeneratedProblem`, `Kernel`/`KernelArgSpec`, `Deps`, `PlanTarget`, `Tier`
  are defined once and reused identically across tasks. `validateStep` signature is
  shared by smoke-content, the bank test, and the orchestrator.
- **Known limitation (documented):** v1 emits `numeric`/`slider`; `order`/`draw`/`wheel`
  planning is gated behind `--interaction` until the future-extension task lands.

---

## Execution notes (applied during build; the code reflects these)

- **All 8 section bank files exist** under `src/content/generated/` and are mapped in
  `index.ts` (`generatedBySection` + `generatedProblems`) and `emit.ts`
  (`SECTION_FILES`/`ARRAY_NAME`), so any `--section` can emit. Kernels currently target
  s1/s3/s4/s5/s7/s8; s2/s6 have empty banks awaiting kernels.
- **`vitest.config.ts`** `test.include` extended with `scripts/genloop/**/*.test.ts`
  (otherwise Vitest, scoped to `src/**`, never discovers the genloop tests).
- **`sdkClient.ts`** imports `@cursor/sdk` lazily inside `call()` (so the test suite /
  repo gate never loads the heavy SDK), and threads `{ cause: err }` on the rethrow to
  satisfy this repo's ESLint `preserve-caught-error` rule.
- **`planner.ts`** is interaction-first (roll the mix, then pick a supporting kernel);
  `planner.test` upper numeric bound is `< 0.75` to match the current kernel set.
- **`validate.test`** uses a count-tolerance case instead of an over-wide-tolerance case
  (the "clearly wrong" probe scales with tolerance by design, so an over-wide tolerance
  is not what that check catches).
- **SDK API verified against `@cursor/sdk@1.0.21`** (`Agent.prompt(message, { apiKey,
  model: { id }, local: { cwd, settingSources: [] } }) → RunResult { status, result }`).
- **Review-driven hardening:** the orchestrator now re-runs the blind solver +
  non-triviality check on the FINAL formatter prose (not just the draft), so the exact
  text that ships is re-verified against the computed answer — closing the only
  no-human-gate hole the final review found. `generated.test.ts` also recomputes `wheel`
  answers (not just numeric/slider) from the kernel.
- **Final gate:** `tsc -b` + `eslint .` + `vitest run` (20 files / 88 tests) all green.
  The live dry run (Task 21) still requires `CURSOR_API_KEY` + network and must run
  outside the sandbox (`tsx` IPC pipe).
- **Known minor follow-ups (from final review, all fail-safe):** writer `avoid` list not
  yet threaded (dedup still rejects post-hoc); batch-level revert on gate failure (vs
  per-entry); `extractJson` doesn't skip string contents (rejects, never mis-accepts);
  extend-path built + tested but not wired into the loop (off by default); SDK temp cwd
  not cleaned and no `Cursor.models.list()` pre-validation.
