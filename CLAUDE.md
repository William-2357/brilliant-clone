# CLAUDE.md

Guidance for AI assistants working in this repo. Read this before making changes.

## What this is

**The Long Run** — a learn-by-doing web app that teaches **Probability & Statistics**,
modeled on Brilliant.org. One subject, taught deeply. The core interaction is a
**predict-then-verify** loop: on every gradable problem the learner commits a numeric
prediction *before* a Canvas simulation runs, so the simulation is the answer key
rather than decoration.

- **Persona:** "The Curious Adult Learner" — short (3–5 min) sessions, feedback
  that explains rather than grades, a clear sense of mastery and what's next.
- **Status:** **36 lessons across 8 sections** (units), all built — plus a Home
  dashboard, Problem/Simulation of the Day, a 10-question **Final Test**, and an
  **Arcade** (blackjack trainer). A **Khan Academy–style UI** drives it (full-page
  layout with a sticky topbar + responsive sidebar, light/dark theme, a **Chakra
  Petch** display font for the wordmark + titles, per-lesson icons, segmented
  grading, KaTeX lectures, confetti, and a dedicated **profile page**). Problems are
  **generated from parameterized templates** that vary numbers/objects and cycle on
  retry/replay. **Phase 2 AI has begun** — the Arcade's *optional* dealer-coach can
  call an LLM (see Hard rules). **Phase 3 (learning science) is implemented** — a
  **Mixed Practice** mode (`/practice`) interleaves problems across *cleared* lessons
  and resurfaces them on a per-concept **spaced-repetition** ladder (1d→3d→7d→14d,
  stored on `UserStats.review`) using Anki's spacing but **engine-graded in one attempt**
  (no retries, no self-report — so it can't be brute-forced or self-deceived), lessons
  **fade their scaffolding** — every lecture carries a fully **worked** example and the
  **first calculation problem** of a fresh lesson is a **completion** (the learner's own
  instance with the last line blanked), then it drops after the first clear
  (`LessonProgress.timesCleared`; both breakdowns are kernel-derived in
  `src/lib/worked.ts`), a one-shot **pretest** captures a cold guess before any
  teaching on the first visit (`PretestCard` → `LessonProgress.preTest`, surfaced as an
  intuition-vs-reality reveal on the completion screen), and a memory-strength readout
  surfaces the **due count** on Home/Profile. See `PRD.md` (FR-11.x) for the full spec.

## Hard rules

- **AI is optional and additive — never the source of truth.** Two optional AI helpers
  exist: the Arcade's **dealer-coach** and **wrong-answer explanations** (lessons + the
  Problem of the Day). Both only *narrate/explain* numbers the deterministic engine
  already computed — the coach narrates the EVs/optimal play, the explainer is handed the
  app-computed correct answer as ground truth. Neither decides answers, grading, EVs, or
  game outcomes. With AI disabled or unreachable the app stays fully functional, falling
  back to the deterministic blackjack template / hand-written feedback. Never let an LLM
  compute a lesson answer, an EV, or a grade. The model call is **server-side only** — the
  OpenAI key lives in the Cloudflare Worker (`worker/`), never in the client bundle; the
  client reaches it via `VITE_COACH_ENDPOINT`, routed by `kind` (`'blackjack'`/`'explain'`).
- **`src/lib/probability.ts` (lessons) and `src/lib/blackjack.ts` (Arcade) are the
  single source of truth for every answer.** Answers/EVs are computed by these
  functions, never hand-typed, and simulations animate *toward* those same values. If
  you add a problem, compute its answer from a function — this includes the generated
  problems in `content/problemTemplates.ts`, which recompute the answer from
  `probability.ts`.
- **The app must work with no backend config** (localStorage fallback) **and with no AI
  configured**. Don't make Firebase or the coach endpoint a hard dependency of the core
  experience.

## Commands

```bash
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc -b && vite build  (run this before deploy)
npm run lint     # eslint . — must pass clean
npm test         # vitest run — unit tests for the owned answer fns + genloop harness
npm run preview  # preview the production build
```

Tests:

```bash
npm test             # vitest run (unit; src/**/*.test.ts + scripts/genloop/**/*.test.ts)
npm run test:watch   # vitest in watch mode
npm run test:e2e     # Playwright e2e — boots `dev:test` → .env.test → localStorage backend
```

Content + AI helper scripts:

```bash
npm run genloop      # offline multi-agent problem generator → src/content/generated/**
npm run smoke        # sanity-check the assembled content (scripts/smoke-content.ts)
npm run coach:dev    # wrangler dev for the AI Worker on :8787
npm run coach:deploy # deploy the AI Worker (worker/coach.mjs)
```

Deploy (Firebase Hosting, project `brilliant-clone-69be8`):

```bash
npm run build && firebase deploy --only hosting      # site
firebase deploy --only firestore:rules               # security rules
```

Always run `npm run build`, `npm run lint`, **and** `npm test` after substantive
changes; all three must pass.

## Architecture

```
src/
  content/
    sections.ts         # canonical 8-section ("unit") structure — order + lesson ids
    lessons.ts          # assembles the course (36 lessons) from sections + the topic
                        #   modules below; authors the original lessons + 10-q finalTest
    foundations.ts … geometric.ts  # the rest of the lessons, by section (combinatorics,
                        #   conditional, rv, distributions, limit, stochastic, geometric)
    problemTemplates.ts # per-slot question generators — vary numbers/objects, recompute
                        #   answers from probability.ts, cycle on retry/replay
    generated/          # large pre-generated, self-verifying problem bank (authored by
                        #   scripts/genloop, grouped by slot in generatedBySlot); generateProblem
                        #   prefers a bank variant for a slot before falling back to a template
    validate.ts         # content-shape validator (structure invariants)
    daily.ts            # date-seeded Problem/Simulation of the Day picks
    mixedPractice.ts    # Mixed Practice engine: mastered-problem pool + interleaved,
                        #   due-prioritized session builder (Phase 3)
    sandboxSims.ts      # free-play simulation catalog (Sandbox + daily spotlight)
    simData.ts          # prize-wheel definitions shared by content + ExpectedValue sim
  lib/
    probability.ts      # owned probability fns — SOURCE OF TRUTH for lesson answers
    blackjack.ts        # deterministic blackjack engine (EV/optimal/count) — Arcade truth
    coach.ts            # dealer-coach templated explanation (offline fallback + AI grounding)
    explain.ts          # wrong-answer explanation payload (lessons + Problem of the Day)
    coachClient.ts      # AI transport: POSTs { kind, input } to the Worker (VITE_COACH_ENDPOINT)
    answer.ts           # parse typed answers (decimals/fractions) + per-unit hints
    worked.ts           # per-kernel worked breakdowns (workedByKernel, keyed by kernel name)
                        #   → lecture example (canonicalWorked) + first-problem completion
                        #   (deriveWorked); recomputed from probability.ts (Phase 3)
    rng.ts              # seeded PRNG (mulberry32) + helpers for question generation
    simSpeed.ts         # global animation-speed multiplier (read inside rAF loops)
    storage.ts          # Backend / Auth / Progress / UserStats (+ ArcadeStats, ReviewState) interfaces
    localBackend.ts     # localStorage adapter (fallback, demo-grade auth)
    firebaseBackend.ts  # Firestore + Firebase Auth adapter (lazy init, side-effect-free import)
    backend.ts          # auto-selects firebase vs local from VITE_FIREBASE_* env
    router.ts           # tiny custom hash router (no router dependency)
    confetti.ts         # dependency-free canvas confetti burst (respects reduced-motion)
  simulations/          # 30 lazy-loaded Canvas sims (per-sim code split) + index.ts registry
                        #   + canvasUtils; one key per SimulationType in types/lesson.ts
  components/           # LessonPlayer (core flow), TestPlayer (deferred-feedback exam),
                        #   FeedbackBanner, CompletionScreen, MilestoneBanner, AppLayout
                        #   (topbar + sidebar), QuestionBar (segmented status), ProgressRing,
                        #   LectureContent (KaTeX), LessonReview, OrderItems / DrawDistribution /
                        #   PredictScale / WheelSegments (graded interactions), MasteryCurve,
                        #   ActivityHeatmap, ProblemOfTheDay, PracticeProblem (shared standalone
                        #   problem loop), SandboxSpotlight, WorkedExample / PretestCard (Phase 3
                        #   lecture worked example + first-problem completion + pretest), SpeedControl, ThemeToggle,
                        #   BlackjackTable (the Arcade game), AuthGuard, ProfileMenu, LessonIcon, ...
  hooks/              # useAuth, useProgress (streaks + daily activity + arcade + reviews
                      #   + pretest), useUnlockAll, useTheme, useCoachAI, useExplainAI
  store/
    progress.ts       # pure logic: cleared/mastery, unlock state, next-step, streak math,
                      #   + scaffolding stage (supportLevelFor: completion-or-full)
    review.ts         # pure spaced-repetition logic: schedule ladder + due concepts (Phase 3)
  pages/              # LoginPage, HomePage, CoursePage, UnitPage, LessonPage, SandboxPage,
                      #   ArcadePage, MixedPracticePage, ProblemPage, SimulationPage,
                      #   TestPage, ProfilePage
  types/lesson.ts     # content model types

worker/               # Phase-2 AI backend — Cloudflare Worker (free, no Blaze) holding the OpenAI
                      #   key; one endpoint serves the coach + wrong-answer explanations (by `kind`)
scripts/
  genloop/            # offline, multi-agent (writer/solver/verifier/formatter) generator built on
                      #   @cursor/sdk; self-verifies every problem (answer from probability.ts +
                      #   Monte-Carlo + blind solver + validateStep + dedup gates) → content/generated/**
  smoke-content.ts    # quick assembled-content sanity check (npm run smoke)
e2e/                  # Playwright specs (smoke / course / lesson) + fixtures, run on the
                      #   localStorage backend via `--mode test` (.env.test); see ## Testing
*.test.ts             # Vitest unit tests live beside their module (probability, blackjack,
                      #   coach, store/progress, store/review, worked, content/validate, generated)
```

### Content model (`types/lesson.ts`)
A `Lesson` is an ordered list of `LessonStep`s: one `concept` step (explore a sim
freely via sliders) followed by **four or five `problem` steps** (predict-then-verify,
gradable) — the original eight showcase lessons and the Final Test have 5; some later
lessons have 4. Problem steps carry a computed `answer`, a `tolerance`, a `unit` label, and
hand-written `feedback` (correct/incorrect). Numeric correctness is the single
`isCorrect(guess, answer, tol)`. The `concept` step also carries a `lecture`
(`LectureSection[]`: heading + text + optional LaTeX `formula`) rendered by
`LectureContent`. A graded attempt produces a `ProblemResult` (`'green' | 'yellow' | 'red'`).

**Interactions:** a problem's `interaction` is `numeric` (type a value), `slider`
(drag a marker along a labeled scale via `PredictScale`), `order` (drag-to-rank via
`OrderItems`, with optional `orderLabels`), `draw` (sketch a distribution via
`DrawDistribution`), or `wheel` (drag prize-wheel segment probabilities to a target EV
via `WheelSegments`). Numeric problems also alternate between asking a probability/
fraction and a **count** ("about how many of N…"). Within a lesson the holistic
`order`/`draw` problems are placed **first** (they're given away by the later problems'
sims) — except the Conditional ranking, which sits last.

**Generated problems (`content/problemTemplates.ts`):** each slot id maps to a
`ProblemTemplate` whose `build(rng)` returns a concrete `LessonStep` — parameterized
numbers + object/scenario banks, with the answer recomputed from `probability.ts`.
`LessonPlayer` overlays the generated problem onto the matching static slot (same id),
so `gradableSteps`, mastery, `QuestionBar`, stats, and resume are all unchanged.
Generation is keyed by `LessonProgress.seed` (stable per learner) combined with
`attempt` (advances on replay) and a per-question `retry` index (advances on the second
try): `cycle = attempt*2 + retry` seeds the RNG, so resume reproduces the same question
while a retry or replay **cycles** to a different one. `generateProblem` prefers a
**pre-generated bank** variant for a slot when one exists (`content/generated/`, grouped
by slot in `generatedBySlot`), then a parameterized template, then the static `lessons.ts`
problem as the final fallback.

**Sections (`content/sections.ts` → assembled in `lessons.ts`):** the canonical 8-unit
grouping is `sectionDefs`; `buildCourse` resolves each section's `lessonIds` into the flat,
indexed `lessons` array (with a chained `prerequisiteId`) plus the `CourseSection[]` the UI
renders. A `CourseSection` may carry an optional `checkpointId` — a hook for a per-unit
checkpoint quiz that also gates the next unit (`sectionCleared`). It is scaffolded but not
yet authored (no section sets one today).

### Backend abstraction (`lib/storage.ts`)
Everything persists behind the `Backend` interface (`auth` + `progress` adapters).
Two implementations: `localBackend` (per-device) and `firebaseBackend` (cross-device).
`backend.ts` picks Firebase when all `VITE_FIREBASE_*` vars are present, else local.
`firebaseBackend.ts` initializes lazily inside `createFirebaseBackend()` so merely
importing it has no side effects.

Firestore layout: `users/{uid}/progress/{lessonId}` and `users/{uid}/meta/stats`.
Rules in `firestore.rules` restrict each user to their own `users/{uid}/**`.

### Mastery & progress (`store/progress.ts`)
- **Grading is 2 attempts per problem.** First-try correct = **green**, second-try
  correct = **yellow**, wrong twice = **red**. Outcomes are stored per problem in a
  `results` map; `recordResult` takes the color. `resetLessonResults` clears a lesson
  and advances `attempt` so a replay deals fresh questions. Legacy
  `completedProblemIds` is read for backward-compat.
- **Answer withheld until resolved.** A wrong *first* attempt reveals nothing and does
  **not** run the simulation (grading uses the computed answer, not the sim); the
  second try pulls a *different* generated problem. The answer, explanation, and sim
  run appear only on a correct answer or the second wrong attempt.
- A lesson is **cleared** when all its problems are green *or* yellow. A lesson is
  **mastered** (badge) only when they are all **green**.
- **Gating is by unit, not per lesson.** A **section unlocks** when every prior section
  is *cleared* (all its built lessons cleared, plus its `checkpointId` checkpoint if one
  is ever authored); inside an unlocked section every lesson is freely playable **in any
  order** (`sectionState` / `lessonState` in `store/progress.ts`). The **Free navigation**
  toggle (`useUnlockAll`, persisted in localStorage) unlocks everything. `prerequisiteId`
  is still chained on each lesson but is no longer the gate. The **Final Test** unlocks
  only once *every* built lesson is cleared (`allLessonsCleared`).
- `currentStepId` enables exact-step resume.
- 2 wrong answers in a row re-surfaces the *current* lesson's own concept material;
  the player also offers an inline "Review lecture" panel on problem steps.
- **Fading scaffolding (lecture worked example → first-problem completion → cold, FR-11.4).**
  A fresh, never-cleared lesson fades support in two places: **(1)** every lesson's lecture
  (concept step) renders a fully **worked** canonical example for that topic as permanent
  study material (`canonicalWorked` keyed by the concept sim via `canonicalStudy`), and
  **(2)** the **first calculation problem** (first numeric/slider gradable step, skipping
  holistic order/draw lead-ins) of a guided run is a **completion** — the learner's own
  instance with the final line blanked (`deriveWorked` + `WorkedExample blankLast`). Every
  other problem is cold. The completion drops once `timesCleared > 0` or on replay
  (expertise reversal; the lecture example stays). Stage logic is the pure `supportLevelFor`
  in `store/progress.ts`; worked numbers are **derived from the `probability.ts` kernel +
  args threaded onto the step** (`kernel`/`kernelArgs`, carried from the bank in
  `generateProblem`), formatted by `workedByKernel` in `lib/worked.ts` and recomputed from
  `probability.ts` — so they cover templated and bank problems alike and never invent a
  value (`content/worked.coverage.test.ts` proves kernel coverage + agreement + the
  per-lesson sweep). Mixed Practice is always full.
- **Pretesting (errorful generation, FR-11.6).** On the first-ever visit to a lesson,
  `LessonPlayer` shows one cold guess (`PretestCard`) on a numeric/slider problem *before*
  the concept step. It's **never graded** — stored on `LessonProgress.preTest` via
  `recordPreTest` (and preserved across replays) and surfaced on the completion screen as
  an intuition-vs-reality reveal.
- **Streaks:** the daily streak is advanced **only by solving the Problem of the Day**
  (which calls `recordActiveDay`: same day = no-op, next day = +1, gap = reset). Other
  activity (lessons, the Final Test) counts toward the **activity heatmap** but no
  longer moves the streak. Stored in `UserStats`.
- The `QuestionBar` renders one segment per problem (green/yellow/red/neutral); it
  replaced the old single continuous progress bar.

## Canvas simulation conventions

All sims implement `SimulationProps` (`config`, `mode`, `runSignal`, `onSettled`) and
are registered in `simulations/index.ts`. When adding/maintaining one:

- **Two render modes:** `explore` (concept steps; show sliders/controls) and `verify`
  (problem steps; run a batch on `runSignal`).
- **Never auto-run on mount.** Use a `lastRunRef` initialized to `runSignal`; only run
  when `runSignal` actually changes. (This bug bit us repeatedly — keep the guard.)
- **Hide the answer during predict.** Target lines / theoretical curves must be hidden
  until the run starts (`mode === 'explore' || processed > 0`), or they reveal answers.
- **Performance (animate-small / batch-large):** animate individual trials for small
  counts; for large counts compute in chunks per frame and animate only the aggregate
  (bar/histogram/curve) to hold ~60 FPS.
- **Never call `setupCanvas` inside the per-frame draw loop.** Reassigning
  `canvas.width`/`height` reallocates and clears the backing store every frame and is
  the #1 cause of jank — cache `{ ctx, width, height }` and refresh it only on mount,
  resize, and run-start. Likewise, **avoid per-frame `shadowBlur`** (very expensive
  with many sprites); use plain fills. The `GaltonBoard` follows both rules and now
  streams *every* ball as it falls (a few spawned per frame) rather than capping
  on-screen sprites and fast-forwarding the remainder into the bins.
- Use `setupCanvas` (handles devicePixelRatio) and `cssVar` from `canvasUtils.ts`.
  Sims read CSS vars on paint, so they must repaint on theme change — `useTheme`
  dispatches a `resize` after toggling, which the sims already listen for.
- `LessonPlayer` keys the sim by `` `${step.id}:${seed}:${attempt}:${retry}` `` (so a
  freshly generated problem remounts the sim with new params) and the player by
  `lesson.id`. Don't remove these keys.

## Testing

- **Unit tests (Vitest, node env) — `npm test`.** Scoped in `vitest.config.ts` to
  `src/**/*.test.ts` + `scripts/genloop/**/*.test.ts` (so it never picks up the e2e
  specs). They lock down the owned answer functions and the pure logic:
  `probability.test.ts`, `blackjack.test.ts` (a **Monte-Carlo cross-check** — simulated
  EVs converge to the engine's, and optimal actions reproduce textbook basic strategy),
  `coach.test.ts`, `store/progress.test.ts`, `store/review.test.ts`, `worked.test.ts`,
  `content/validate.test.ts`, `content/generated/{generated,kernels}.test.ts`
  (recomputes every generated answer from `probability.ts`), and
  `content/worked.coverage.test.ts` (1:1 worked-formatter↔kernel coverage + numeric
  agreement, plus a per-lesson sweep that the lecture worked example and first-problem
  completion are present). New owned math should ship
  with a test.
- **E2E (Playwright) — `npm run test:e2e`.** Runs `e2e/*.spec.ts` against a fresh
  `npm run dev:test` server on port 53117. `--mode test` loads `.env.test`, which blanks
  the `VITE_FIREBASE_*` vars to force the **localStorage backend**, so e2e stays
  deterministic, offline, and isolated from the production Firebase project.
- **genloop gate.** A generated batch is kept only if the repo gate
  (`tsc -b && eslint . && vitest run`) passes; on failure the batch is reverted.

## Toolchain gotchas

- TypeScript runs with **`erasableSyntaxOnly`**: no `enum`s and **no constructor
  parameter properties** (`constructor(private x: T)`) — use explicit field
  declarations + assignment instead.
- `noUnusedLocals` / `noUnusedParameters` are on — keep imports/params clean.
- React 19 ESLint rules are strict (`react-hooks/*`, `react-refresh/only-export-components`).
  Existing `// eslint-disable-next-line` comments are deliberate; mirror the pattern
  rather than loosening config.
- `import.meta.env` keys are typed in `src/vite-env.d.ts` — add new `VITE_*` vars there.
- Vite bundles Firebase even in local mode (~242 KB gzip). Acceptable for now; if asked
  to slim the local path, code-split via dynamic import (would make `backend` async).
- **KaTeX** renders lecture math. `main.tsx` imports `katex/dist/katex.min.css` and
  the build ships KaTeX font files. Lecture `formula`s use display math; inline math
  uses `$...$` spans (see `LectureContent`); the Sandbox blurbs render KaTeX too.
- **Self-hosted display font:** `@fontsource/chakra-petch` (latin 600/700) is imported
  in `main.tsx`; its woff2 are bundled by Vite, so there's no runtime CDN font fetch.

## Styling

- Theme lives in `src/index.css` (CSS variables) and `src/App.css` (components).
- Current skin is a **Khan Academy–style light theme by default, with a
  `data-theme="dark"` override** on `<html>` — driven entirely by CSS variables, so
  any reskin stays CSS-variable-driven and component structure stays intact. The
  simulation-critical var names (`--accent`, `--accent-2`, `--cyan`, `--text`,
  `--text-h`, `--border`, plus `--warn` for yellow grading) must keep working in both
  themes. Preference is persisted/applied by `useTheme`; `main.tsx` applies the saved
  theme before first paint to avoid a flash.
- **Fonts:** body uses the system sans stack; the brand wordmark and all titles/
  headings use `--font-display` = **Chakra Petch**, self-hosted via
  `@fontsource/chakra-petch` (imported in `main.tsx`, latin 600/700) — no CDN fonts.
- **Full-page responsive layout** (`AppLayout`): sticky topbar + left sidebar on
  desktop; the sidebar becomes an off-canvas drawer (hamburger) on mobile. Content
  column is centered; touch-friendly controls throughout.

## Docs

- `PRD.md` — the living product spec (all three phases). Source of intent.
- `README.md` — setup, architecture, deploy steps.
- `worker/README.md` — deploy the AI Worker + the `{ kind, input } → { text }` contract.
- `scripts/genloop/README.md` — the offline problem-generator pipeline + its correctness gates.
- `SOURCES.md` / `BACKLOG.md` — scenario attribution, and archetypes parked until the math/sim exists.
- `BRAINLIFT.md` — the project thesis + learning-science rationale.
