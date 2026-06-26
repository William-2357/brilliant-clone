# Topic-lesson authoring reference

Detailed lookup for `create-topic-lessons`. The live files in `src/` remain the
source of truth; this captures the contracts you must honor.

## LessonStep fields (`src/types/lesson.ts`)

| Field | Applies to | Notes |
|---|---|---|
| `id` | all | `l{N}-sX`; `s1` = concept, `s2…s6` = problems |
| `type` | all | `'concept'` or `'problem'` |
| `title` | all | Short heading shown above the step |
| `body` | all | Concept: lead paragraph. Problem: setup. Supports inline `$...$` |
| `simulation` | optional | A `SimulationType`; omit for lecture-only / no-sim |
| `simConfig` | with sim | `Record<string, number>` passed to the sim |
| `lecture` | concept | `LectureSection[]` = `{ heading?, text, formula? }` |
| `question` | problem | The prompt; always state the answer format |
| `answer` | problem | Computed value from your owned module |
| `tolerance` | problem | Absolute tolerance for `isCorrect(guess, answer, tol)` |
| `unit` | problem | Input label (see units table) |
| `feedback` | problem | `{ correct, incorrect }` — both hand-written |
| `interaction` | problem | Defaults to `'numeric'` |

## Interaction cheatsheet (problem steps)

| `interaction` | Extra fields required | Sim? | How it grades |
|---|---|---|---|
| `numeric` (default) | `answer`, `tolerance`, `unit` | optional | parsed number vs `answer` ± `tolerance` |
| `slider` | `sliderMin`, `sliderMax`, `sliderStep` (+ `answer`, `tolerance`) | optional | dragged value vs `answer` ± `tolerance` |
| `order` | `orderItems` (start order), `answerOrder` (correct rank), `orderLabels?` | no | exact match of ranking |
| `draw` | `drawCategories`, `answerShape` (sums to 1), `tolerance` | no | total-variation distance ≤ `tolerance` |
| `wheel` | `wheelPayouts`, `answer` (target EV), `tolerance` | no | EV of learner's probabilities vs `answer` |

`order`, `draw`, and `wheel` resolve immediately (no sim run). `numeric`/`slider`
run the sim only if `simulation` is set.

## Source-of-truth module pattern

Answers are never literals. They come from **pure, exported functions**.

- Probability/statistics → add to `src/lib/probability.ts`.
- A new subject → create `src/lib/<topic>.ts` with pure functions and import them
  into `lessons.ts` (and `problemTemplates.ts` if you add a question pool).

Rules:
- Pure (no I/O, no globals), deterministic, typed.
- Sanity-check edge cases before wiring (n = 0/1, boundary rates, etc.).
- If a sim exists for the topic, it must animate **toward the same function value**.
- `isCorrect(guess, answer, tol)` (in `probability.ts`) is the grader — call it from
  the player/content layer, not from your answer functions.

## Canvas simulation conventions

Only build a sim when no existing one and no no-sim interaction fits. Implement
`SimulationProps` (`src/simulations/types.ts`): `{ config, mode, runSignal, onSettled }`.

Hard rules (mirrors `CLAUDE.md`):

1. **Two modes:** `explore` (concept — show sliders/controls) and `verify`
   (problem — run a batch on `runSignal`).
2. **Never auto-run on mount.** Keep `const lastRunRef = useRef(runSignal)` and run
   only when `runSignal` actually changes in `verify` mode.
3. **Hide the answer during predict.** Target lines / theoretical curves / markers
   must be gated on `mode === 'explore' || processed > 0`.
4. **Performance:** animate individual trials for small counts; for large counts
   compute in chunks per frame and animate only the aggregate. Hold ~60 FPS.
5. **Never call `setupCanvas` inside the draw loop**; cache `{ ctx, width, height }`
   and refresh only on mount, resize, and run-start. Avoid per-frame `shadowBlur`.
6. **Theme:** read every color from `simPalette()` / `cssVar()` (`canvasUtils.ts`).
   Sims read CSS vars on paint and must repaint on theme change — listen for
   `resize` (`useTheme` dispatches one after toggling).
7. **Settle:** call `onSettled?.()` when a verify run finishes; the player records
   the result and reveals feedback.
8. Set the canvas height via `data-height` and class `sim-canvas`; wrap controls in
   `.sim-controls` shown only when `mode === 'explore'`.

### Registering a new sim

1. Add the key to the `SimulationType` union in `src/types/lesson.ts`.
2. Add the component to the `simulations` record in `src/simulations/index.ts`.

`LessonPlayer` keys the sim by `` `${step.id}:${seed}:${attempt}:${retry}` `` — don't
fight that remount; it's how a freshly generated problem resets the visual.

## Theme tokens

`simPalette()` exposes (all from CSS variables, valid in light + dark):
`accent`, `accent2`, `accentStrong`, `accentBg`, `cyan`, `good`, `warn`, `bad`,
`text`, `textH`, `muted`, `border`, `borderStrong`, `surface`, `surface2`,
`surface3`, `ringTrack`, `gridLine`.

The grading-critical CSS vars that must keep working in both themes:
`--accent`, `--accent-2`, `--cyan`, `--text`, `--text-h`, `--border`, `--warn`.
Style components with these in `src/index.css` / `src/App.css` — no per-lesson hex.

## Units & typical tolerances

| `unit` | When | tolerance |
|---|---|---|
| `fraction` | long-run frequency, share | 0.03–0.05 |
| `probability` | exact probabilities | 0.02–0.04 |
| `dollars` | expected value, money | scale with size (0.3–1.0+) |
| `count` / `sum` | integer answers | 0 or 0.5 |

Verify runs use **large** trial counts so a sim visibly converges; concept explore
uses **small** counts for interactivity.

## Registration

- **Lesson:** push the `Lesson` object into the `lessons` array in
  `src/content/lessons.ts`. `AppLayout`, `getLesson`, the router, and stats pick it
  up automatically. Use `status: 'coming-soon'` to ship a locked placeholder.
- **Prerequisite chain:** set `prerequisiteId` to the previous built lesson's id so
  it unlocks sequentially (the Free-navigation toggle can override for testing).
- **Icon:** add an entry to `ICONS` in `src/components/LessonIcon.tsx`, keyed by the
  lesson `id`. Use a simple 24×24 `viewBox`, strokes via `currentColor` (the spread
  `{...S}` helper), and a `color` for the sidebar tint. A missing key falls back to
  a generic glyph, so this is recommended but not strictly required to run.

## Generated problems (optional but recommended)

To vary numbers/scenarios across retries and replays (like the existing lessons):

- Add a `ProblemTemplate[]` under your lesson id in the `problemTemplates` map in
  `src/content/problemTemplates.ts`. Each template's `id` must match a problem slot
  id; `build(rng)` returns a concrete `LessonStep` with the answer recomputed from
  your module.
- Use the seeded `Rng` from `src/lib/rng.ts` (`makeRng`, `r.int`, `r.range`,
  `r.pick`, `r.chance`) so resume is stable while retries/replays re-roll.
- `generateProblem` overlays the template onto the matching static slot; the static
  step in `lessons.ts` stays as the fallback. Keep both in sync (same `id`, `unit`,
  `interaction`).

## Final test (optional)

The capstone exam (`finalTest` in `lessons.ts`, registered under `FINAL_TEST_ID` in
`problemTemplates.ts`) is a separate `Lesson` with deferred feedback. To include a
new topic, add one `problem` slot to `finalTest.steps` and a matching
numeric/slider template under `'lf-final-test'` (the test never runs a sim, since a
sim would reveal the answer). Leave it alone if you only want to add a lesson.

## Toolchain gotchas

- TypeScript runs with `erasableSyntaxOnly`: **no `enum`s**, **no constructor
  parameter properties** — use explicit fields + assignment.
- `noUnusedLocals` / `noUnusedParameters` are on — keep imports and params clean.
- React 19 ESLint is strict; mirror existing `// eslint-disable-next-line` patterns
  rather than loosening config.
- New `VITE_*` env keys must be typed in `src/vite-env.d.ts`.
- KaTeX is already wired (`main.tsx` imports the CSS); just follow the LaTeX escape
  rules.
