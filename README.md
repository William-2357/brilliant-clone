# The Long Run

**Domain: Probability & Statistics.** A learn-by-doing app modeled on Brilliant.org.
You predict an outcome, run a simulation, and watch the math reveal itself.

> **Deployed app:** _not yet deployed — add the public URL here after deploying._

## Who it's for

**The Curious Adult Learner** — a self-motivated person who knows probability
exists but never deeply understood it. They've heard of the Monty Hall problem
but couldn't explain it, and they learn on their phone in short bursts. The whole
app is designed around them:

- Lessons completable in 3–5 minutes
- Feedback that explains, not just grades
- A clear sense of what's mastered and what's next
- A daily streak that brings them back tomorrow

## What it is

A single subject (probability), taught through interactive Canvas simulations using a
**predict-then-verify** loop: every gradable problem asks you to commit a numeric
prediction *before* the simulation runs, so the simulation is the answer key rather
than decoration.

### Course path (7 lessons, all built)

1. **What is Probability?** — long-run frequency (coin flip)
2. **Independent Events** — two-dice sum distribution
3. **The Galton Board** — how the bell curve emerges
4. **The Birthday Problem** — counterintuitive collisions
5. **Expected Value** — weighted average of outcomes (prize wheel)
6. **Conditional Probability** — updating on new information (cards)
7. **The Monty Hall Problem** — why switching wins

Each lesson is a sequence of `concept → problem → feedback` steps with 3–4 gradable
problems. Mastery requires answering every problem correctly; two wrong in a row
re-surfaces the lesson's own teaching material. Lessons unlock sequentially as you
master them, or you can flip on **Free navigation** to jump to any lesson.

### Habit loop

A **daily streak** counts consecutive calendar days with at least one active
session (shown on the course screen alongside lessons mastered and best streak).
Mastering a lesson triggers a milestone, and finishing the course is celebrated.

## Tech stack

- **React 19 + TypeScript + Vite**
- **HTML5 Canvas** simulations (manual math, no physics engine; animate-small /
  batch-large with an on-screen ball cap on the Galton board)
- **Persistence/auth behind a `Backend` interface** (`src/lib/storage.ts`):
  - **Firebase Auth + Firestore** — real accounts and cross-device progress/streak
    sync. Used automatically when `VITE_FIREBASE_*` env vars are present.
  - **localStorage** — zero-setup single-device fallback when no Firebase config
    is present (demo-grade auth).
- Routing is a small custom hash router (no router dependency).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Without a `.env`, the app runs on the localStorage backend immediately — no setup.

Build and preview a production bundle:

```bash
npm run build
npm run preview
```

Lint / typecheck:

```bash
npm run lint
npx tsc -b
```

## Cross-device persistence & real auth (Firebase)

The Firebase backend is fully implemented and selected automatically when config
is present — no code changes needed:

1. Create a Firebase project, enable **Email/Password** auth and **Cloud Firestore**.
2. Copy `.env.example` → `.env` and fill in the `VITE_FIREBASE_*` values from your
   Firebase web app config.
3. Restart `npm run dev`. The login screen will show "Cloud sync on," accounts are
   real Firebase Auth users, and progress + streaks sync across devices.

Firestore data layout (lock down with security rules so each user only reads/writes
their own `users/{uid}/**`):

```
users/{uid}/progress/{lessonId}   -> LessonProgress
users/{uid}/meta/stats            -> UserStats (streaks)
```

## Architecture

```
src/
  content/
    lessons.ts              # all 7 lessons as typed data; answers computed by probability fns
    simData.ts              # prize-wheel definitions shared by content + sim
  lib/
    probability.ts          # owned probability functions (single source of truth for answers)
    storage.ts              # Backend / Auth / Progress / UserStats interfaces
    localBackend.ts         # localStorage adapter (fallback)
    firebaseBackend.ts      # Firestore + Firebase Auth adapter (cross-device, lazy init)
    backend.ts              # auto-selects firebase vs local from env
    router.ts               # tiny hash router
  simulations/              # CoinFlip, DiceRoll, GaltonBoard, Birthday, ExpectedValue,
                            #   ConditionalProbability, MontyHall (Canvas)
  components/               # LessonPlayer, FeedbackBanner, CompletionScreen, etc.
  hooks/                    # useAuth, useProgress (incl. streaks), useUnlockAll
  store/progress.ts         # mastery / unlock / next-lesson / streak logic (pure)
  pages/                    # LoginPage, CoursePage, LessonPage
```

`PRD.md` contains the full product requirements for all three phases.
