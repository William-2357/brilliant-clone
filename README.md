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

### Course path (36 lessons across 8 sections, all built)

1. **Foundations** — what probability means; set algebra; the addition rule
2. **Counting & Combinatorics** — multiplication, permutations, combinations,
   anagrams, stars & bars, derangements
3. **Conditional Probability** — dependence, total probability, Bayes, Monty Hall
4. **Random Variables & Expectation** — expected value, variance, indicators,
   first-step analysis, correlation
5. **Named Distributions** — binomial (Galton board), geometric, Poisson,
   hypergeometric, continuous uniform
6. **Limit Theorems** — the CLT, the empirical rule, normal approximation, Chebyshev
7. **Stochastic Processes** — random walks, gambler's ruin, Markov chains, branching
8. **Geometric Probability** — area ratios, Buffon's needle, Bertrand, order statistics

Lessons are grouped into **sections (units)** and unlock in sequence. Each lesson is
one **concept** step (explore the simulation freely, with a short KaTeX lecture)
followed by **five gradable problems** (`predict → run → feedback`).
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
- **Final Test** (`/test`) — a **10-question capstone** spanning the course,
  unlocked once **every lesson is cleared**. Unlike a lesson it uses **deferred
  feedback**: every result is withheld until all ten questions are answered, then it
  scores you (≥ 70% to pass) and celebrates. Questions are generated from the same
  templates, and an in-progress attempt survives a refresh without leaking correctness.
- **Sandbox** (`/sandbox`) — play any simulation freely, no grading.
- **Arcade / Apply** (`/arcade`) — put the math to work in a game. v1 is a **Blackjack
  trainer** (play chips only) built around expected value, variance, and the house edge
  "in the long run." A live **dealer-coach** explains the EV-optimal play at every
  decision. See [Arcade / Apply](#arcade--apply--blackjack-trainer-phase-2-ai) below.
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

## Arcade / Apply — Blackjack trainer (Phase 2 AI)

The **Arcade** (`/arcade`) is where probability gets *applied* in a game instead of a
graded problem. v1 ships one game — **Blackjack** — played with **play chips only (no
real money, no purchases, resettable bankroll)** and framed entirely around expected
value, variance, and the inescapable house edge "in the long run."

**The math is the source of truth, never an LLM.** A deterministic engine
(`src/lib/blackjack.ts`, peer to `probability.ts`) computes everything: hand values,
legal actions, dealer behavior (6-deck shoe, **S17**, blackjack pays **3:2**), the
**exact EV of hit / stand / double** from the current shoe composition (recursive DP),
the **optimal action** (`argmax EV`), bust chances, and the Hi-Lo running/true count.
Because the EV is computed from the live shoe, it genuinely shifts as the shoe depletes —
that's how counting earns its edge. The engine is covered by unit tests **and** a
**Monte-Carlo cross-check** (`src/lib/blackjack.test.ts`): simulated EVs converge to the
engine's EVs, and the optimal actions reproduce textbook basic strategy.

**Predict-then-verify, for decisions.** You choose an action; the engine then reveals
the EV-optimal action and the EV gap, and a running **decision accuracy** grades your
*play quality*, not your luck. A small chart plots cumulative net vs. hands played, and a
companion sim (**Blackjack Edge**, also in the Sandbox) auto-plays tens of thousands of
perfect hands so the negative house edge (~1% under v1's no-split rules) becomes visible
as the cumulative net steadily drifts below zero.

**The live dealer-coach is the Phase-2 AI feature** — and it's an *addition*, not a
dependency:

- The coach **narrates** the numbers the engine already produced ("standing is +0.02 EV
  vs −0.05 for hitting because the dealer's 6 busts ~42% of the time"). It never computes
  or contradicts them.
- The model call runs **server-side** — the browser never sees the OpenAI key. The
  client (`src/lib/coachClient.ts`) POSTs the game state to the HTTPS endpoint in
  `VITE_COACH_ENDPOINT` — the free **Cloudflare Worker** in `worker/` (**no Blaze
  plan**). With no endpoint configured, the coach simply uses no AI.
- **Works with AI off / offline.** A settings toggle disables the AI coach, and whenever
  the AI is unreachable (no endpoint configured, network/timeout, or any error) the
  client falls back to a **deterministic templated explanation** built from the same
  engine numbers (`src/lib/coach.ts`). The game and its coaching are fully functional with
  AI disabled (PRD NFR-7 / FR-10.3). With the AI on, the coach shows a brief "thinking"
  state and reveals the GPT narration when it arrives; the templated explanation appears
  only as the fallback (or immediately when the AI toggle is off). The coach never blocks
  input — you can play on while it resolves.

Bankroll + lifetime decision-accuracy persist through the existing `Backend`/progress
abstraction (on `UserStats.arcade`), so they ride the same localStorage / Firestore sync
as the rest of the app.

**Enabling the AI coach** (optional — the app runs without it). The OpenAI key lives in
a Cloudflare Worker secret (free, no Blaze plan); the client calls it via
`VITE_COACH_ENDPOINT` (full guide in `worker/README.md`):

```bash
npm install                                            # installs wrangler
npx wrangler login                                     # free Cloudflare account
npm run coach:deploy                                   # deploys worker/coach.mjs
npx wrangler secret put OPENAI_API_KEY -c worker/wrangler.jsonc   # paste sk-...
#   then set VITE_COACH_ENDPOINT to the printed workers.dev URL and `npm run build`

# Or run it locally while developing:
cp worker/.dev.vars.example worker/.dev.vars          # paste your key, then:
npm run coach:dev                                      # wrangler dev on :8787
#   then add to .env:  VITE_COACH_ENDPOINT=http://localhost:8787  and restart `npm run dev`
```

See `worker/README.md` for the full setup and the `{ input } → { text }` contract. Out of scope for v1 (hooks left in
place): poker and other games, real money/purchases, multiplayer, and split / insurance /
surrender. The Arcade never offers "how to beat the casino" advice beyond explaining EV.

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
| `/learn`       | Course catalog (8 sections)                         |
| `/learn/section/:sectionId` | A section / unit (its lessons)         |
| `/learn/:id`   | A lesson (concept + 5 problems)                     |
| `/sandbox`     | Free-play simulations                               |
| `/arcade`      | Arcade / Apply — Blackjack trainer + dealer-coach   |
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
users/{uid}/meta/stats            -> UserStats (streaks + daily activity + arcade)
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
    sections.ts             # canonical 8-section ("unit") structure — order + lesson ids
    lessons.ts              # assembles the course (36 lessons) from sections + the topic
                            #   modules below; also authors the 10-question finalTest
    foundations.ts … geometric.ts  # the lessons by section (foundations, combinatorics,
                            #   conditional, rv, distributions, limit, stochastic, geometric)
    problemTemplates.ts     # per-slot question generators — vary numbers/objects,
                            #   answers recomputed from probability.ts, cycle on retry/replay
    generated/              # large pre-generated problem pool (authored by scripts/genloop)
    validate.ts             # content-shape validator (structure invariants)
    daily.ts                # date-seeded Problem/Simulation of the Day picks + POTD status
    sandboxSims.ts          # free-play simulation catalog (Sandbox + daily spotlight)
    simData.ts              # prize-wheel definitions shared by content + sim
  lib/
    probability.ts          # owned probability functions (single source of truth for answers)
    blackjack.ts            # deterministic blackjack engine (EV/optimal/count) — Arcade's truth
    coach.ts                # dealer-coach templated explanation (offline fallback + AI grounding)
    coachClient.ts          # timeout-guarded coach call → the Cloudflare Worker endpoint
    rng.ts                  # seeded PRNG (mulberry32) + hashString for question generation
    answer.ts               # parse typed answers (decimals/fractions) + per-unit hints
    simSpeed.ts             # global animation-speed multiplier (read inside rAF loops)
    storage.ts              # Backend / Auth / Progress / UserStats (+ ArcadeStats) interfaces
    localBackend.ts         # localStorage adapter (fallback, demo-grade auth)
    firebaseBackend.ts      # Firestore + Firebase Auth adapter (email + Google, lazy init)
    backend.ts              # auto-selects firebase vs local from env
    router.ts               # tiny hash router
    confetti.ts             # dependency-free canvas confetti
  simulations/              # ~30 lazy-loaded Canvas sims (CoinFlip, GaltonBoard, MontyHall,
                            #   CLT, BlackjackEdge, …) + index.ts registry + canvasUtils
  components/               # AppLayout, LessonPlayer, TestPlayer, FeedbackBanner,
                            #   CompletionScreen, MilestoneBanner, LectureContent (KaTeX),
                            #   OrderItems, DrawDistribution, PredictScale, WheelSegments,
                            #   QuestionBar, ProgressRing, MasteryCurve, ActivityHeatmap,
                            #   ProblemOfTheDay, SandboxSpotlight, SpeedControl, LessonIcon,
                            #   BlackjackTable (the Arcade game), ProfileMenu, AuthGuard, ...
  hooks/                    # useAuth, useProgress (incl. streaks + daily activity + arcade),
                            #   useUnlockAll, useTheme, useCoachAI
  store/progress.ts         # mastery / clear / next-lesson / streak / course-stats logic (pure)
  pages/                    # LoginPage, HomePage, CoursePage, UnitPage, LessonPage,
                            #   SandboxPage, ArcadePage, ProblemPage, SimulationPage,
                            #   TestPage, ProfilePage

worker/                     # Phase-2 AI backend — Cloudflare Worker (free, no Blaze); holds the key
  coach.mjs                 #   POST {input}→{text}: narrates the engine's numbers, never recomputes
  wrangler.jsonc            #   Worker config (name, model, allowed origins)
scripts/genloop/            # offline generator that authors src/content/generated/**
```

`PRD.md` contains the full product requirements for all three phases.
