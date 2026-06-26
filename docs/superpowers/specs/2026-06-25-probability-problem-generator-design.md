# Autonomous Probability Problem Generator — Design Spec

**Date:** 2026-06-25
**Status:** Approved (design); ready for implementation plan
**Scope:** Offline authoring pipeline + self-verifying problem bank. **No app wiring.**

---

## 1. Goal

A systematic, **fully autonomous** way to generate new probability problems for *The
Long Run*, modeled on how human problem writers for math competitions (MathCounts
school/chapter, AMC) and school tests work: a **writer**, a **verifier**, an
**independent test solver**, and a **formatter**, running in a loop.

The loop emits problems that:

- align with the topics already on the site (the 8 course sections, computed by
  `src/lib/probability.ts`),
- are interesting/engaging and **not trivially solvable**,
- and where a **decent portion are compatible with the interactive problem variants**
  used in lessons (`numeric`, `slider`, `order`, `draw`, `wheel`).

## 2. Hard constraints (inherited from the repo)

1. **No AI at runtime.** The pipeline is an *authoring tool*; nothing in it ships in
   the app bundle. The app stays AI-free (`CLAUDE.md`). The pipeline lives under
   `scripts/` and is never imported by `src/`.
2. **`probability.ts` is the single source of truth for every answer.** The LLM never
   decides an answer; answers are computed by `probability.ts` functions. The pipeline
   may *extend* `probability.ts` with new pure functions (each with a vitest
   cross-check), but the displayed truth is always a function value.
3. **Bank-only output.** The pipeline writes a typed problem bank under
   `src/content/generated/`. It is **not** wired into lessons, the daily pool, or any
   page (surfacing is a later, separate decision).
4. **Fully autonomous.** There is **no human validation step inside the pipeline.**
   Correctness is guaranteed by automated, code-based gates (below). The pipeline does
   not auto-commit; emitted files are left for normal `git diff` review.
5. **Toolchain.** `erasableSyntaxOnly` (no `enum`s, no parameter properties),
   `noUnusedLocals`/`noUnusedParameters`, strict React-19 ESLint. New `VITE_*` keys
   (none expected) would go in `src/vite-env.d.ts`.

## 3. The correctness model (what replaces the human)

The LLM only decides a problem's **form** (scenario, parameters, which kernel computes
the answer, interaction). Correctness comes from **independent sources that must agree**,
all enforced by plain-Node harness code using the *same graders the app uses*:

- **Numeric / slider answers — triple agreement:**
  1. **Closed form:** `kernel.fn(...args)` from `probability.ts`.
  2. **Monte-Carlo:** a per-kernel sampler converges to the same value.
  3. **Blind solver agent:** an independent LLM solves from the *prose only* (no
     kernel, no args, no answer) and returns a number that matches.
- **`order` / `draw` / `wheel` answers — double agreement + soundness review:**
  the "answer" is a ranking / normalized shape / target EV, so these rely on
  **closed-form + Monte-Carlo agreement** (two independent code sources), graded by the
  app's own checks (exact-rank match, total-variation distance ≤ tol, EV ± tol), plus
  the LLM verifier's soundness review. (A blind solver returning a full ranking/shape is
  high-variance, so it is used as an *optional* soundness signal here, not a hard gate.)

If the required sources agree within tolerance, the problem is provably correct **and**
its prose matches the math (catching mis-specification — the main unattended risk).

The rejected alternative — letting an LLM grade its own arithmetic — violates
constraint #2 and is not trustworthy unattended.

## 4. Architecture

Two cleanly separated halves:

- **Agents (LLM, via `@cursor/sdk`)** are *pure-ish*: they receive text and return
  **JSON/text only**. They run with `local: { cwd }` pointed at a **throwaway temp
  dir** and `settingSources: []`, so they cannot read project settings or mutate the
  repo. They never compute the final answer and never write bank files.
- **Harness (plain Node/TS)** owns *all* side effects: evaluating kernels, running
  Monte-Carlo, schema/dedup/difficulty checks, writing bank files, and running the repo
  gate (`tsc` + `eslint` + `vitest`). The harness is deterministic and testable.

```
scripts/genloop/                  # offline pipeline (devDependency on @cursor/sdk)
  run.ts                          # CLI entrypoint: parse flags, plan batch, drive loop, report
  orchestrator.ts                 # per-problem state machine (write→verify→solve→cross-check→format→emit→gate)
  planner.ts                      # choose (section, kernel, interaction, tier) targets honoring the mix
  sdkClient.ts                    # SDK setup: apiKey, model, temp cwd, settingSources:[], dispose
  types.ts                        # ProblemSpec, Verdict, SolveResult, GeneratedProblem, RunManifest
  agents/
    writer.ts                     # ProblemSpec drafter (+ optional new-kernel proposal)
    verifier.ts                   # soundness reviewer (pass / revise+reasons)
    solver.ts                     # blind independent solver (fresh one-shot agent every call)
    formatter.ts                  # final on-voice prose + feedback + typed LessonStep literal
  harness/
    evaluate.ts                   # compute kernel closed form from {kernel,args}; finite/range checks
    montecarlo.ts                 # run a kernel sampler N times; compare to closed form
    samplers.ts                   # per-kernel Monte-Carlo samplers (harness-only; NOT shipped)
    difficulty.ts                 # heuristic score + tier tag {school|mc-school|mc-chapter|amc}
    dedup.ts                      # (kernel,args) + prose-hash near-duplicate rejection
    emit.ts                       # render a GeneratedProblem to a typed bank entry + provenance
    extend.ts                     # apply a proposed probability.ts fn + its vitest, run the test
    gate.ts                       # run `tsc -b` + `eslint .` + `vitest run`; parse pass/fail
  prompts/                        # writer.md, verifier.md, solver.md, formatter.md (system prompts)
  README.md

src/content/
  validate.ts                     # SHARED validators (extracted from smoke-content.ts)
  generated/
    kernels.ts                    # answer-kernel registry (app-safe: name -> probability.ts fn + metadata)
    foundations.ts ... geometric.ts   # GeneratedProblem[] per section (typed, with provenance)
    index.ts                      # aggregate the pool (+ helpers); NO page wiring
    generated.test.ts             # recompute kernel(...args) === stored answer for EVERY entry
```

## 5. Answer-kernel registry (`src/content/generated/kernels.ts`)

The contract the writer must target so generation can never drift from the source of
truth. App-safe (no randomness), imported by the app, the bank, and the recompute test:

```ts
export interface KernelArgSpec {
  name: string;
  kind: 'int' | 'number' | 'prob' | 'enum';
  min?: number; max?: number; step?: number; values?: number[];
}

export interface Kernel {
  name: string;                                  // stable id, e.g. 'binomialPmf'
  fn: (...args: number[]) => number;             // a probability.ts function
  args: KernelArgSpec[];                          // ranges the writer must respect
  sectionIds: string[];                           // course sections this kernel teaches
  interactions: InteractionType[];                // which interactive variants it supports
  unit: 'fraction' | 'probability' | 'dollars' | 'count' | 'value' | 'distance' | 'position' | 'standard error';
  defaultTolerance: number;
  simulation?: SimulationType;                     // optional; only if a sim animates toward fn
}

export const kernels: Record<string, Kernel> = { /* one entry per supported fn */ };
```

- Harness-only Monte-Carlo samplers live in `scripts/genloop/harness/samplers.ts`
  keyed by kernel name (so no Monte-Carlo code ships in the app bundle).
- Initial kernel coverage targets the existing functions across all 8 sections
  (binomial/Galton, dice, conditional draws, total probability, Bayes, expected value,
  variance, geometric/Poisson/hypergeometric, normal/Chebyshev, gambler's ruin/Markov,
  Buffon/order-stats, etc.). Kernels declare interaction support, e.g. distribution
  kernels support `draw`, comparable-family kernels support `order`, EV kernels support
  `wheel`.

## 6. The four agents

Each agent has a fixed **I/O contract** (validated by the harness on receipt; malformed
JSON ⇒ bounded retry). System prompts live in `scripts/genloop/prompts/`.

1. **Writer** (`agents/writer.ts`) — input: a planner target `(sectionId, kernelName,
   interaction, tier)` + the kernel's `argSpec` + a section scenario bank + the list of
   recent (kernel,args) to avoid. Output `ProblemSpec`:
   ```ts
   interface ProblemSpec {
     sectionId: string; kernel: string; args: number[];
     interaction: InteractionType;
     scenarioDraft: string;     // setup prose (will be polished by the formatter)
     questionDraft: string;     // the ask, including the answer format
     // interaction extras the writer proposes (validated/normalized by harness):
     orderItems?: number[]; drawCategories?: (number|string)[]; wheelPayouts?: number[];
     newKernel?: NewKernelProposal;  // present only when extending probability.ts
   }
   ```
   The writer is instructed to compose ≥2 non-trivial steps (e.g. complement → chain →
   count) and to never state the answer in the prose.
2. **Verifier** (`agents/verifier.ts`) — input: the `ProblemSpec` + the harness-computed
   answer. Output `Verdict { ok: boolean; issues: string[]; severity }`. Checks
   *soundness*: prose unambiguous, every parameter stated, the asked quantity is exactly
   what the kernel returns, the problem is well-posed and non-trivial. Shares a durable
   `Agent.create` session with the writer for cheap revision rounds.
3. **Solver** (`agents/solver.ts`) — input: **only** `scenarioDraft + questionDraft`
   (no kernel/args/answer). A **brand-new one-shot `Agent.prompt`** every call to
   guarantee independence. Output `SolveResult { answer: number | null; steps: string[];
   estDifficulty: 1..5; confident: boolean }`. Used as a hard cross-check for
   numeric/slider; as a soundness signal for order/draw/wheel.
4. **Formatter** (`agents/formatter.ts`) — input: the validated spec + computed answer +
   the repo voice rules. Output the final, compelling prose and the two feedback strings,
   assembled by the harness (not the LLM) into a typed `LessonStep`.

SDK usage (`sdkClient.ts`): `apiKey` from `CURSOR_API_KEY` passed explicitly; `model`
default `composer-2.5` (overridable `--model`, validated against `Cursor.models.list()`
on startup); always `await using` / dispose; distinguish thrown `CursorAgentError`
(startup) from `result.status === 'error'` (run failed) with distinct exit handling;
respect `isRetryable`.

## 7. Harness gates (the autonomous guarantee)

Per candidate, in order; any failure ⇒ feed reason back, bounded retry (≤3), else
skip + log:

1. **Schema/precheck** (`evaluate.ts` + shared `validate.ts`): args satisfy `argSpec`;
   `kernel.fn(...args)` is finite; interaction is supported by the kernel; the assembled
   `LessonStep` passes the **same `validate()` checks as `smoke-content.ts`** (true
   answer accepted, clearly-wrong rejected, slider grid reachable, ranking is a
   permutation + reversed rejected, draw shape sums to 1/non-negative/spike rejected,
   wheel target reachable under the 5%-min-segment rule).
2. **Monte-Carlo agreement** (`montecarlo.ts` + `samplers.ts`): the kernel sampler over
   N trials is within tolerance of the closed form.
3. **Solver agreement** (numeric/slider): `|solver.answer − closedForm| ≤ tolerance`.
4. **Non-triviality heuristic** (`difficulty.ts`): reject if the answer string appears
   in the prose, if it is an identity read-off, or if `solver.steps.length < 2`. Compute
   a difficulty score (kernel base difficulty + arg "entropy" + solver step count +
   complement/chain flags) → tier tag.
5. **Dedup** (`dedup.ts`): reject duplicate `(kernel, rounded-args)` and near-duplicate
   prose (normalized hash / shingle similarity) against the existing bank + this run.
6. **Emit** (`emit.ts`): append a `GeneratedProblem` typed literal to the section file
   with full provenance.
7. **Repo gate** (`gate.ts`): run `tsc -b`, `eslint .`, `vitest run`. On failure, revert
   the just-emitted entry and retry/skip. This is the final safety net: the bank only
   grows with entries that compile, lint, and pass the self-verifying test.

## 8. Data model: the bank

```ts
// src/content/generated/index.ts
export interface GeneratedProblem {
  step: LessonStep;            // the playable, app-shaped problem (answer is a literal number)
  sectionId: string;
  kernel: string;              // kernels[kernel].fn(...args) MUST equal step.answer
  args: number[];
  tier: 'school' | 'mc-school' | 'mc-chapter' | 'amc';
  difficulty: number;          // 1..5 heuristic
  provenance: {
    model: string; seed: number; createdAt: string;
    writerRunId?: string; solverRunId?: string;   // SDK run ids for audit
  };
}
```

`generated.test.ts` iterates every `GeneratedProblem` and asserts
`kernels[g.kernel].fn(...g.args)` equals `g.step.answer` (numeric/slider) or recomputes
`answerOrder`/`answerShape`/wheel target, **plus** re-runs the shared `validate()` on
`g.step`. This makes the bank self-verifying forever: it can never drift, even if
`probability.ts` changes, because CI recomputes from the kernel.

## 9. The extend path (`harness/extend.ts`)

When a compelling problem needs math not in `probability.ts`:

1. Writer returns a `NewKernelProposal { name, source, signature, mcSampler,
   vitestCase, sectionIds, interactions, unit }`.
2. Harness appends `source` to `probability.ts`, the sampler to `samplers.ts`, registers
   the kernel in `kernels.ts`, and adds `vitestCase` to `probability.test.ts`.
3. Harness runs `vitest run`. Pass ⇒ kernel usable. Fail ⇒ revert all three edits, drop
   the candidate. (New-kernel additions are rate-limited per run and logged prominently
   so they remain easy to audit in `git diff`.)

## 10. Targeting & quality knobs

- **Interaction mix** (`planner.ts`): default ≈ **45% numeric / 15% slider / 15% order /
  15% draw / 10% wheel**, constrained to kernels that declare support; overridable via
  `--interaction`. Satisfies "a decent portion compatible with interactive variants."
- **Tier mix:** spread across `school → amc`; `--tier` to bias a run.
- **Scenarios:** per-section scenario banks (real-world contexts) seed engagement and
  variety; the formatter enforces the repo's voice rules (second person, state every
  parameter, hint-don't-reveal feedback).
- **Non-triviality:** the heuristic in §7.4.

## 11. CLI, config, observability

- Run: `npx -y tsx scripts/genloop/run.ts --count 20 --section s3-conditional --model composer-2.5`
- Flags: `--count --section --tier --interaction --model --dry-run --seed --concurrency`.
- `--dry-run`: execute the loop and report, write **no** files.
- **Run manifest** (`scripts/genloop/.manifest/<timestamp>.json`, git-ignored): every
  attempt with accept/reject + reason + agent run ids + cost-relevant counts.
- Bounded retries (≤3/slot), a per-run concurrency cap, and `run.id`/`agentId` logged
  immediately after each `send()` for auditing.

## 12. Repo touch-ups (small, justified)

- Export `InteractionType` from `src/types/lesson.ts` (currently unexported) so the
  kernel registry and bank can reference it.
- Extract the graders + `validate()` from `scripts/smoke-content.ts` into
  `src/content/validate.ts`; re-point `smoke-content.ts` at it (DRY; both the smoke test
  and the genloop harness use one validator).
- Add an ESLint override block for `scripts/**/*.ts` (Node globals; turn off
  `react-refresh/only-export-components`), mirroring the existing `e2e/**` block.
- Add `@cursor/sdk` + `tsx` (if not transitive) as **devDependencies**.
- Add a `scripts/genloop/tsconfig.json` for editor/type safety (not part of `tsc -b`).
- `.gitignore`: `scripts/genloop/.manifest/`.

## 13. Failure modes & how the autonomous gates handle them

| Risk | Gate that catches it |
|---|---|
| LLM arithmetic wrong | Answer is never the LLM's; it's `kernel.fn(...args)`. |
| Prose doesn't match chosen kernel | Blind solver disagreement (numeric/slider) + verifier soundness. |
| Closed form wrong / mis-typed kernel | Monte-Carlo disagreement + (for new kernels) vitest. |
| Trivial / answer-in-prose | Non-triviality heuristic. |
| Duplicate/near-duplicate spam | Dedup (kernel,args) + prose-hash. |
| Unreachable interaction config | Shared `validate()` reachability checks. |
| Bank drift over time | `generated.test.ts` recompute in CI. |
| Broken emit (types/lint) | Repo gate reverts the entry. |
| Agent edits the repo | Agents run in a temp `cwd`, return JSON only; harness owns writes. |

## 14. Out of scope (explicitly)

- Any app wiring: no Practice page, no `problemTemplates` merge, no `daily.ts`
  integration. The bank + its test are the deliverable.
- Auto-commit / auto-PR.
- New Canvas simulations (the pipeline reuses existing `SimulationType`s only; a kernel
  without a sim simply omits `simulation`).

## 15. Decisions locked

Runtime = Cursor SDK (TypeScript, local). Output = typed bank under
`src/content/generated/`. May extend `probability.ts` (with vitest). Difficulty =
heuristic (solver informs it but is not a hard difficulty gate). **No human validation
step** anywhere in the pipeline.
