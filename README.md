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
number, some problems are a **slider** prediction, **drag-to-rank**, or
**sketch-the-distribution**.

### Beyond the lessons

- **Home dashboard** (`/`) — a personal landing page: a time-of-day greeting, a
  "continue/start next lesson" hero, stat tiles (streak, course %, lessons mastered,
  problems solved), a per-lesson course-progress bar, quick-nav cards, the daily
  widgets, and the activity heatmap.
- **Problem of the Day** (`/problem`) — one date-seeded problem, the same all day and
  fresh tomorrow. Solve it or reveal the answer; a solve fires confetti and counts
  toward your streak and activity heatmap. The answer is generated (never hand-typed)
  and withheld on a wrong guess.
- **Simulation of the Day** (`/simulation`) — a rotating sandbox simulation spotlighted
  in free-play `explore` mode, linking out to the full Sandbox.
- **Final Test** (`/test`) — a **10-question capstone** spanning every lesson,
  unlocked once all eight lessons are cleared. Unlike a lesson it uses **deferred
  feedback**: every result is withheld until all ten questions are answered, then it
  scores you (≥ 70% to pass) and celebrates. Questions are generated from the same
  templates, and an in-progress attempt survives a refresh without leaking correctness.
- **Sandbox** (`/sandbox`) — play any simulation freely, no grading.
- **Profile** (`/profile`) — every stat in one place (streak, best streak, days
  active, course %, lessons mastered/cleared, problems solved, first-try rate,
  questions answered), a cumulative **mastery curve**, per-lesson status, the activity
  heatmap, and preferences (light/dark theme, Free navigation, sign out).

### Habit loop

A **daily streak** counts consecutive calendar days on which you solve the **Problem
of the Day** — that daily solve is what advances the streak (a same-day re-solve never
double-counts). Separately, an **activity heatmap** (a month calendar, darker greens
for more problems resolved) tallies *every* problem you resolve — lessons, the final
test, and the daily problem — and shows on Home and the profile. Mastering a lesson
triggers a milestone, and finishing the course is celebrated.

## Tech stack

- **React 19 + TypeScript + Vite**
- **HTML5 Canvas** simulations (manual math, no physics engine; animate-small /
  batch-large, with a global **speed control** so runs can be slowed or sped up
  in real time)
- **KaTeX** lecture math; **Chakra Petch** display font for the wordmark + titles,
  self-hosted via `@fontsource` (no CDN) with the body in the system sans stack
- **Persistence/auth behind a `Backend` interface** (`src/lib/storage.ts`):
  - **Firebase Auth + Firestore** — real accounts (email/password **and Google
    sign-in**) with cross-device progress/streak sync. Used automatically when
    `VITE_FIREBASE_*` env vars are present.
  - **localStorage** — zero-setup single-device fallback when no Firebase config is
    present (demo-grade auth; "Continue with Google" signs into a local demo account).
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

## Routes

The app is a single-page hash router (`src/lib/router.ts`); everything except the
login screen is wrapped in an auth guard.

| Path           | Screen                                              |
| -------------- | --------------------------------------------------- |
| `/login`       | Sign up / sign in (email-password or Google)        |
| `/`            | Home dashboard                                      |
| `/learn`       | Course catalog (all lessons)                        |
| `/learn/:id`   | A lesson (concept + 5 problems)                     |
| `/sandbox`     | Free-play simulations                               |
| `/problem`     | Problem of the Day                                  |
| `/simulation`  | Simulation of the Day                               |
| `/test`        | Final Test (unlocks after all lessons cleared)      |
| `/profile`     | Profile, stats, and preferences                     |

## Cross-device persistence & real auth (Firebase)

The Firebase backend is fully implemented and selected automatically when config
is present — no code changes needed:

1. Create a Firebase project, enable **Cloud Firestore**, and under Authentication
   enable both the **Email/Password** and **Google** sign-in providers.
2. Copy `.env.example` → `.env` and fill in the `VITE_FIREBASE_*` values from your
   Firebase web app config (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`).
3. Restart `npm run dev`. The login screen will show "Cloud sync on," accounts are
   real Firebase Auth users, and progress + streaks sync across devices.

Firestore data layout:

```
users/{uid}/progress/{lessonId}   -> LessonProgress
users/{uid}/meta/stats            -> UserStats (streaks + daily activity)
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
    lessons.ts              # all 8 lessons as typed data + the 10-question finalTest;
                            #   the per-lesson problems are the slot defs + fallback content
    problemTemplates.ts     # per-slot question generators — vary numbers/objects,
                            #   answers recomputed from probability.ts, cycle on retry/replay
    daily.ts                # date-seeded Problem/Simulation of the Day picks + POTD status
    sandboxSims.ts          # free-play simulation catalog (Sandbox + daily spotlight)
    simData.ts              # prize-wheel definitions shared by content + sim
  lib/
    probability.ts          # owned probability functions (single source of truth for answers)
    rng.ts                  # seeded PRNG (mulberry32) + hashString for question generation
    answer.ts               # parse typed answers (decimals/fractions) + per-unit hints
    simSpeed.ts             # global animation-speed multiplier (read inside rAF loops)
    storage.ts              # Backend / Auth / Progress / UserStats interfaces
    localBackend.ts         # localStorage adapter (fallback, demo-grade auth)
    firebaseBackend.ts      # Firestore + Firebase Auth adapter (email + Google, lazy init)
    backend.ts              # auto-selects firebase vs local from env
    router.ts               # tiny hash router
    confetti.ts             # dependency-free canvas confetti
  simulations/              # CoinFlip, DiceRoll, GaltonBoard, ExpectedValue, Conditional,
                            #   MontyHall, RandomWalk, CLT — Canvas + index.ts registry
  components/               # AppLayout, LessonPlayer, TestPlayer, FeedbackBanner,
                            #   CompletionScreen, MilestoneBanner, LectureContent (KaTeX),
                            #   OrderItems, DrawDistribution, PredictScale, WheelSegments,
                            #   QuestionBar, ProgressRing, MasteryCurve, ActivityHeatmap,
                            #   ProblemOfTheDay, SandboxSpotlight, SpeedControl, LessonIcon,
                            #   ProfileMenu (avatar → profile), AuthGuard, ThemeToggle, ...
  hooks/                    # useAuth, useProgress (incl. streaks + daily activity),
                            #   useUnlockAll, useTheme
  store/progress.ts         # mastery / clear / next-lesson / streak / course-stats logic (pure)
  pages/                    # LoginPage, HomePage, CoursePage, LessonPage, SandboxPage,
                            #   ProblemPage, SimulationPage, TestPage, ProfilePage
```

`PRD.md` contains the full product requirements for all three phases.
