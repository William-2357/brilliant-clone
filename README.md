# The Long Run

**Domain: Probability & Statistics.** A learn-by-doing app modeled on Brilliant.org.
You predict an outcome, run a simulation, and watch the math reveal itself.

> **Deployed app:** https://brilliant-clone-69be8.web.app

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

### Course path (8 lessons, all built)

1. **What is Probability?** — long-run frequency (coin flip)
2. **Independent Events** — two-dice sum distribution
3. **The Galton Board** — how the bell curve emerges
4. **Expected Value** — weighted average of outcomes (prize wheel)
5. **Conditional Probability** — updating on new information (cards)
6. **The Monty Hall Problem** — why switching wins
7. **The Central Limit Theorem** — why averages go normal
8. **Random Walks** — drift and the √n spread

Each lesson is one **concept** step (explore the simulation freely, with a short
KaTeX lecture) followed by **five gradable problems** (`predict → run → feedback`).
Every problem allows two attempts — first-try correct scores **green**, a second-try
correct **yellow**, two misses **red**. A lesson **clears** (unlocking the next) once
all five are green or yellow, and is **mastered** when all five are green. A wrong
first attempt reveals nothing — not even the simulation — so the answer and
explanation appear only after the second miss. Two wrong answers in a row re-surface
the lesson's own teaching material, and you can flip on **Free navigation** to jump
to any lesson.

**Questions are generated, not fixed.** Each problem is built from a parameterized
template (`src/content/problemTemplates.ts`) that varies the numbers and objects and
recomputes the answer from `probability.ts` — and asks for either a probability /
fraction or a **count** ("about how many of N…"). Retrying or replaying a lesson
**cycles** to different questions instead of repeating the same ones. Beyond typing a
number, some problems are **drag-to-rank** or **sketch-the-distribution**.

### Habit loop

A **daily streak** counts consecutive calendar days with at least one active
session (shown on the course screen alongside lessons mastered and best streak).
Mastering a lesson triggers a milestone, and finishing the course is celebrated.

Tap your avatar for a **profile** page that gathers every stat — streak, lessons
mastered/cleared, problems solved, first-try rate — plus light/dark theme and
navigation preferences. A **Sandbox** lets you play any simulation freely, no grading.

## Tech stack

- **React 19 + TypeScript + Vite**
- **HTML5 Canvas** simulations (manual math, no physics engine; animate-small /
  batch-large with an on-screen ball cap on the Galton board)
- **KaTeX** lecture math; **Chakra Petch** display font for the wordmark + titles,
  self-hosted via `@fontsource` (no CDN) with the body in the system sans stack
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

Firestore data layout:

```
users/{uid}/progress/{lessonId}   -> LessonProgress
users/{uid}/meta/stats            -> UserStats (streaks)
```

Security rules are in `firestore.rules` and restrict every user to their own
`users/{uid}/**`.

## Deploying to Firebase Hosting

The Firebase CLI files are scaffolded (`firebase.json`, `.firebaserc`,
`firestore.rules`, `firestore.indexes.json`). To deploy:

1. Install the CLI and sign in: `npm i -g firebase-tools && firebase login`
2. Put your project id in `.firebaserc` (replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`),
   or run `firebase use --add`.
3. Build and deploy:
   ```bash
   npm run build
   firebase deploy                 # hosting + Firestore rules
   # or target one: firebase deploy --only hosting
   #                firebase deploy --only firestore:rules
   ```

`firebase.json` serves the Vite `dist/` build, rewrites all routes to
`index.html`, and long-caches hashed assets.

## Architecture

```
src/
  content/
    lessons.ts              # all 8 lessons as typed data; the 5 problems per lesson are
                            #   the slot definitions + fallback content
    problemTemplates.ts     # per-slot question generators — vary numbers/objects,
                            #   answers recomputed from probability.ts, cycle on retry/replay
    simData.ts              # prize-wheel definitions shared by content + sim
  lib/
    probability.ts          # owned probability functions (single source of truth for answers)
    rng.ts                  # seeded PRNG (mulberry32) for question generation
    storage.ts              # Backend / Auth / Progress / UserStats interfaces
    localBackend.ts         # localStorage adapter (fallback)
    firebaseBackend.ts      # Firestore + Firebase Auth adapter (cross-device, lazy init)
    backend.ts              # auto-selects firebase vs local from env
    router.ts               # tiny hash router
  simulations/              # CoinFlip, DiceRoll, GaltonBoard, ExpectedValue, Conditional,
                            #   MontyHall, RandomWalk, CLT (+ Birthday, Sandbox-only) — Canvas
  components/               # AppLayout, LessonPlayer, FeedbackBanner, CompletionScreen,
                            #   LectureContent (KaTeX), OrderItems, DrawDistribution,
                            #   ProfileMenu (avatar → profile page), QuestionBar, etc.
  hooks/                    # useAuth, useProgress (incl. streaks), useUnlockAll, useTheme
  store/progress.ts         # mastery / unlock / next-lesson / streak logic (pure)
  pages/                    # LoginPage, CoursePage, LessonPage, SandboxPage, ProfilePage
```

`PRD.md` contains the full product requirements for all three phases.
