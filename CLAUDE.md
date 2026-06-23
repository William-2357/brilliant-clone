# CLAUDE.md

Guidance for AI assistants working in this repo. Read this before making changes.

## What this is

**The Long Run** — a learn-by-doing web app that teaches **Probability & Statistics**,
modeled on Brilliant.org. One subject, taught deeply. The core interaction is a
**predict-then-verify** loop: on every gradable problem the learner commits a numeric
prediction *before* a Canvas simulation runs, so the simulation is the answer key
rather than decoration.

- **Persona:** "The Curious Adult Learner" — short (3–5 min) mobile sessions, feedback
  that explains rather than grades, a clear sense of mastery and what's next.
- **Status:** Phase 1 (MVP) complete; all 7 lessons built. Phases 2 (AI) and 3
  (learning science) are specced in `PRD.md` but not yet built.

## Hard rules

- **No AI in the app (Phase 1).** No model calls, generated content, or chatbot. This
  is a graded constraint. AI features come later as *additions*, never replacements.
- **`src/lib/probability.ts` is the single source of truth for every answer.** Lesson
  answers are computed by these functions, never hand-typed. Simulations animate
  *toward* these same values. If you add a problem, compute its answer from a function.
- **The app must work with no backend config** (localStorage fallback). Don't make
  Firebase a hard dependency of the core experience.

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
    lessons.ts        # all 7 lessons as typed data; answers computed from probability.ts
    simData.ts        # prize-wheel definitions shared by content + ExpectedValue sim
  lib/
    probability.ts    # owned probability fns — SOURCE OF TRUTH for answers
    storage.ts        # Backend / Auth / Progress / UserStats interfaces
    localBackend.ts   # localStorage adapter (fallback, demo-grade auth)
    firebaseBackend.ts# Firestore + Firebase Auth adapter (lazy init, side-effect-free import)
    backend.ts        # auto-selects firebase vs local from VITE_FIREBASE_* env
    router.ts         # tiny custom hash router (NOTE: react-router-dom is in
                      #   package.json but UNUSED — do not reintroduce it)
  simulations/        # one Canvas component per SimulationType + index.ts registry
  components/         # LessonPlayer (core flow), FeedbackBanner, CompletionScreen, ...
  hooks/              # useAuth, useProgress (incl. streaks), useUnlockAll
  store/progress.ts   # pure logic: mastery, unlock state, next-step, streak math
  pages/              # LoginPage, CoursePage, LessonPage
  types/lesson.ts     # content model types
```

### Content model (`types/lesson.ts`)
A `Lesson` is an ordered list of `LessonStep`s. Steps are either `concept` (explore a
sim freely via sliders) or `problem` (predict-then-verify, gradable). Problem steps
carry a computed `answer`, a `tolerance`, a `unit` label, and hand-written `feedback`
(correct/incorrect). Numeric correctness is the single `isCorrect(guess, answer, tol)`.

### Backend abstraction (`lib/storage.ts`)
Everything persists behind the `Backend` interface (`auth` + `progress` adapters).
Two implementations: `localBackend` (per-device) and `firebaseBackend` (cross-device).
`backend.ts` picks Firebase when all `VITE_FIREBASE_*` vars are present, else local.
`firebaseBackend.ts` initializes lazily inside `createFirebaseBackend()` so merely
importing it has no side effects.

Firestore layout: `users/{uid}/progress/{lessonId}` and `users/{uid}/meta/stats`.
Rules in `firestore.rules` restrict each user to their own `users/{uid}/**`.

### Mastery & progress (`store/progress.ts`)
- A lesson is **mastered** when every gradable problem has been answered correctly.
- Lessons unlock sequentially (prerequisite must be mastered) unless the **Free
  navigation** toggle (`useUnlockAll`, persisted in localStorage) is on.
- `currentStepId` enables exact-step resume.
- 2 wrong answers in a row re-surfaces the *current* lesson's own concept material.
- **Streaks:** `recordActiveDay` advances a daily streak (same day = no-op, next day =
  +1, gap = reset). Recorded on lesson start and on each answer. Stored in `UserStats`.

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
  (bar/histogram/curve) to hold ~60 FPS. Cap concurrent sprites (e.g. Galton balls).
- Use `setupCanvas` (handles devicePixelRatio) and `cssVar` from `canvasUtils.ts`.
- `LessonPlayer` keys the sim by `step.id` and the player by `lesson.id` so navigation
  remounts with fresh state. Don't remove these keys.

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

## Styling

- Theme lives in `src/index.css` (CSS variables) and `src/App.css` (components).
- Current skin is a dark neon/arcade theme. Design-refresh mockups explored in chat;
  any reskin should be CSS-variable-driven so component structure stays intact.
- Mobile-first (≤ ~390px), single 560px-max column, touch-friendly controls.

## Docs

- `PRD.md` — the living product spec (all three phases). Source of intent.
- `Build_Brilliant_PRD.md` — original assignment brief (historical; don't edit).
- `README.md` — setup, architecture, deploy steps.
