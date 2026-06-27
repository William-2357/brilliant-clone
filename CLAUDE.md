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
  call an LLM (see Hard rules). Phase 3 (learning science) is specced in `PRD.md`.

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
npm run preview  # preview the production build
```

Deploy (Firebase Hosting, project `brilliant-clone-69be8`):

```bash
npm run build && firebase deploy --only hosting      # site
firebase deploy --only firestore:rules               # security rules
```

Always run `npm run build` **and** `npm run lint` after substantive changes; both
must pass.

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
    generated/          # large pre-generated problem pool (authored by scripts/genloop)
    validate.ts         # content-shape validator (structure invariants)
    daily.ts            # date-seeded Problem/Simulation of the Day picks
    sandboxSims.ts      # free-play simulation catalog (Sandbox + daily spotlight)
    simData.ts          # prize-wheel definitions shared by content + ExpectedValue sim
  lib/
    probability.ts      # owned probability fns — SOURCE OF TRUTH for lesson answers
    blackjack.ts        # deterministic blackjack engine (EV/optimal/count) — Arcade truth
    coach.ts            # dealer-coach templated explanation (offline fallback + AI grounding)
    explain.ts          # wrong-answer explanation payload (lessons + Problem of the Day)
    coachClient.ts      # AI transport: POSTs { kind, input } to the Worker (VITE_COACH_ENDPOINT)
    answer.ts           # parse typed answers (decimals/fractions) + per-unit hints
    rng.ts              # seeded PRNG (mulberry32) + helpers for question generation
    simSpeed.ts         # global animation-speed multiplier (read inside rAF loops)
    storage.ts          # Backend / Auth / Progress / UserStats (+ ArcadeStats) interfaces
    localBackend.ts     # localStorage adapter (fallback, demo-grade auth)
    firebaseBackend.ts  # Firestore + Firebase Auth adapter (lazy init, side-effect-free import)
    backend.ts          # auto-selects firebase vs local from VITE_FIREBASE_* env
    router.ts           # tiny custom hash router (no router dependency)
    confetti.ts         # dependency-free canvas confetti burst (respects reduced-motion)
  simulations/          # ~30 lazy-loaded Canvas sims + index.ts registry + canvasUtils
  components/           # LessonPlayer (core flow), TestPlayer (deferred-feedback exam),
                        #   FeedbackBanner, CompletionScreen, AppLayout (topbar + sidebar),
                        #   QuestionBar (segmented status), LectureContent (KaTeX), OrderItems /
                        #   DrawDistribution / PredictScale (interactions), MasteryCurve,
                        #   ActivityHeatmap, ProblemOfTheDay, SpeedControl, BlackjackTable
                        #   (the Arcade game), AuthGuard, ProfileMenu, LessonIcon, ...
  hooks/              # useAuth, useProgress (streaks + daily activity + arcade),
                      #   useUnlockAll, useTheme, useCoachAI, useExplainAI
  store/progress.ts   # pure logic: cleared/mastery, unlock state, next-step, streak math
  pages/              # LoginPage, HomePage, CoursePage, UnitPage, LessonPage, SandboxPage,
                      #   ArcadePage, ProblemPage, SimulationPage, TestPage, ProfilePage
  types/lesson.ts     # content model types

worker/               # Phase-2 AI backend — Cloudflare Worker (free, no Blaze) holding the OpenAI
                      #   key; one endpoint serves the coach + wrong-answer explanations (by `kind`)
scripts/genloop/      # offline generator that authors content/generated/**
```

### Content model (`types/lesson.ts`)
A `Lesson` is an ordered list of `LessonStep`s: one `concept` step (explore a sim
freely via sliders) followed by **exactly 5 `problem` steps** (predict-then-verify,
gradable). Problem steps carry a computed `answer`, a `tolerance`, a `unit` label, and
hand-written `feedback` (correct/incorrect). Numeric correctness is the single
`isCorrect(guess, answer, tol)`. The `concept` step also carries a `lecture`
(`LectureSection[]`: heading + text + optional LaTeX `formula`) rendered by
`LectureContent`. A graded attempt produces a `ProblemResult` (`'green' | 'yellow' | 'red'`).

**Interactions:** a problem's `interaction` is `numeric` (type a value), `order`
(drag-to-rank via `OrderItems`, with optional `orderLabels`), or `draw` (sketch a
distribution via `DrawDistribution`). Numeric problems also alternate between asking a
probability/fraction and a **count** ("about how many of N…"). Within a lesson the
holistic `order`/`draw` problems are placed **first** (they're given away by the later
problems' sims) — except the Conditional ranking, which sits last.

**Generated problems (`content/problemTemplates.ts`):** each slot id maps to a
`ProblemTemplate` whose `build(rng)` returns a concrete `LessonStep` — parameterized
numbers + object/scenario banks, with the answer recomputed from `probability.ts`.
`LessonPlayer` overlays the generated problem onto the matching static slot (same id),
so `gradableSteps`, mastery, `QuestionBar`, stats, and resume are all unchanged.
Generation is keyed by `LessonProgress.seed` (stable per learner) combined with
`attempt` (advances on replay) and a per-question `retry` index (advances on the second
try): `cycle = attempt*2 + retry` seeds the RNG, so resume reproduces the same question
while a retry or replay **cycles** to a different one. The static problems in
`lessons.ts` remain the fallback when no template exists.

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
- A lesson is **cleared** (unlocks the next) when all 5 problems are green *or* yellow.
  A lesson is **mastered** (badge) only when all 5 are **green**.
- Lessons unlock sequentially (prerequisite must be **cleared**) unless the **Free
  navigation** toggle (`useUnlockAll`, persisted in localStorage) is on.
- `currentStepId` enables exact-step resume.
- 2 wrong answers in a row re-surfaces the *current* lesson's own concept material;
  the player also offers an inline "Review lecture" panel on problem steps.
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
