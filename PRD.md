# Product Requirements Document

**Product:** The Long Run
**Domain:** Probability & Statistics
**Stack:** React 19 + TypeScript + Vite + Firebase (Firestore + Auth) + HTML5 Canvas
**Last Updated:** June 2026
**Status:** Active Development

---

## Overview

The Long Run is a learn-by-doing educational app modeled on Brilliant.org, focused exclusively on **Probability & Statistics**. Learners are dropped into interactive simulations before the concept is explained. They play with an idea — flip coins, drop balls through a Galton board, pick doors — until the math reveals itself through experimentation.

The app teaches in three ordered phases: a hand-crafted MVP, AI-powered enhancements, and evidence-based learning science layered on top.

---

## Domain: Probability & Statistics

Probability is ideal for this format because:
- The gap between human intuition and mathematical reality is large (Monty Hall, birthday problem)
- Simulations produce surprising results that compel learners to experiment further
- Canvas-based visuals (coin flips, falling balls, spinning wheels) are naturally interactive
- Concepts build sequentially and can be mastered one at a time

---

## User Persona

**The Curious Adult Learner** — a self-motivated person who knows probability exists but has never deeply understood it. They've heard of the Monty Hall problem but couldn't explain it. They learn on their phone during commutes. They need short, satisfying sessions that build genuine understanding, not test-prep tricks.

**Needs:**
- Lessons completable in 3–5 minutes
- Immediate feedback that explains, not just grades
- A clear sense of what they've mastered and what comes next
- Something that hooks them and brings them back tomorrow

---

## Course Path (7 Lessons)

Lessons are ordered by conceptual dependency. Each unlocks the next.

**MVP core (built and playable for Wednesday): Lessons 1–3.** Lessons 4–7 ship in the course path as `locked` / "Coming soon" — the full intended depth is visible, but only the contiguous L1 → L2 → L3 arc is built. This keeps mastery-gated sequential unlock (FR-5.4) honest, since each built lesson genuinely precedes the next.

| # | Lesson | Core Concept | Primary Interaction | MVP Status |
|---|--------|-------------|---------------------|------------|
| 1 | What is Probability? | Long-run frequency | Slider (# of coin flips), watch frequency converge to 0.5 | **Built** |
| 2 | Independent Events | Two events don't affect each other | Roll two dice, observe sum distribution histogram | **Built** |
| 3 | The Galton Board | Binomial distribution emerges from repeated independent choices | Drop balls through pegs, watch bell curve form in bins | **Built (showpiece)** |
| 4 | The Birthday Problem | Counterintuitive probability with many events | Slider for room size, simulation shows shared-birthday probability curve | Coming soon |
| 5 | Expected Value | Weighted average of outcomes | Drag spinner segments to set probabilities, run spins, track running EV | Coming soon |
| 6 | Conditional Probability | Probability changes as information is revealed | Draw cards without replacement, fractions update live | Coming soon |
| 7 | The Monty Hall Problem | Switching doors doubles your win rate | Pick door → host reveals goat → switch or stay → run 1000 trials | Coming soon |

---

## Phase 1 — MVP (Due Wednesday)

> Zero AI. No model calls, no generated content. The core experience must stand entirely on its own.

### FR-1: Interactive Lessons

| ID | Requirement |
|----|-------------|
| FR-1.1 | Lessons 1–3 are built and fully playable; Lessons 4–7 appear in the course path as `locked` / "Coming soon" |
| FR-1.2 | Each lesson is a short sequence of steps: concept → simulation → question → feedback |
| FR-1.3 | Each step requires the learner to do something (run a simulation, move a slider, make a prediction) |
| FR-1.4 | Lessons are completable in 3–5 minutes each |
| FR-1.5 | At least one interaction per lesson goes beyond multiple choice |
| FR-1.6 | **Predict-then-verify is the standard gradable interaction.** The learner commits a numeric prediction *before* running the simulation; the simulation then runs and feedback compares prediction vs. outcome. The simulation is the answer key, never decoration beside a number box. This makes the interaction teach the concept (orig. FR-2.5) and serves as genuine retrieval practice (FR-11.5) |

**MVP graded problems (predict-then-verify):**

| Lesson | Predict (before running) | Verified against | Example answer / tolerance |
|--------|--------------------------|------------------|----------------------------|
| L1 CoinFlip | "Before running 1000 flips: what fraction will come up heads?" | Simulated long-run frequency converging to true p | `0.5 ± 0.05` |
| L2 DiceRoll | "Which two-dice sum is most likely, and what is its probability?" | Computed/simulated sum distribution | sum `7`, `P ≈ 0.167 ± 0.02` |
| L3 GaltonBoard | "Before dropping the balls: what fraction land in the center two bins?" | Binomial computed for the board's row count | computed value `± 0.05` |

Each built lesson has 3–4 such problems with escalating parameters; the learner predicts first, the simulation reveals the truth, and feedback compares the two.

### FR-2: Simulations (HTML5 Canvas)

All simulations are built with HTML5 Canvas and manual math — no physics engine. **For the MVP, only FR-2.1–FR-2.3 are built.** FR-2.4–FR-2.7 are specified here for completeness and ship as "Coming soon".

| ID | Simulation | Key Behavior | MVP |
|----|-----------|--------------|-----|
| FR-2.1 | CoinFlip | Animated coin, slider for flip count (1–1000), running frequency bar converging to 0.5 | **Built** |
| FR-2.2 | DiceRoll | Two dice, histogram of sums (2–12), triangle distribution emerges over trials | **Built** |
| FR-2.3 | GaltonBoard | Balls drop through triangular peg array, accumulate in bins, bell curve forms | **Built** |
| FR-2.4 | BirthdayProblem | Room fills with people, shared birthdays highlighted, probability curve overlay | Coming soon |
| FR-2.5 | ExpectedValue | Weighted spinner with draggable segments, running EV tracker | Coming soon |
| FR-2.6 | ConditionalProbability | Card deck, drawn cards removed, probability fractions recalculate after each draw | Coming soon |
| FR-2.7 | MontyHall | Three-door sequence (pick → reveal → switch/stay), 1000-trial batch runner with win rate chart | Coming soon |

**Animation model (animate-small / batch-large):** Simulations animate *individual* trials for small counts (a coin arcs and lands, a handful of balls bounce through pegs) to build intuition. For large counts they **switch to batch computation** and animate only the *aggregate* — the frequency bar filling, the histogram/bell curve growing — rather than rendering thousands of discrete sprites. For the Galton board, cap concurrently-animated balls (≤ 50 on screen) and fast-forward the remainder directly into the bins.

**Performance:** The 60 FPS target (NFR-2) applies to **slider manipulation and aggregate animation**, not to per-event rendering of large batches (which are computed, not drawn one-by-one). Verified via Chrome DevTools.

### FR-3: Content Model

| ID | Requirement |
|----|-------------|
| FR-3.1 | All lesson content is defined as structured TypeScript data in `src/content/lessons.ts` |
| FR-3.2 | Each step contains: concept text, simulation type, question, expected answer, and hand-written feedback strings |
| FR-3.3 | The renderer reads from this model — new lessons can be added without touching rendering code |
| FR-3.4 | Schema is structured so AI can generate into it in Phase 2 |

**Step schema:**
```ts
type LessonStep = {
  id: string;
  type: 'concept' | 'problem' | 'simulation';
  title: string;
  body: string;
  simulation: SimulationType;
  question?: string;
  answer?: number;        // gradable problems are numeric
  tolerance?: number;     // correct iff |guess - answer| <= tolerance
  feedback: {
    correct: string;
    incorrect: string;
  };
};
```

Each built lesson contains **3–4 gradable problems** (`type: 'problem'`) so that "consecutive correct" is meaningful. Answers are entered as numbers and judged with tolerance — e.g. `answer: 0.5, tolerance: 0.05` accepts `0.47`–`0.53`. This numeric-with-tolerance check is the same logic engine that validates AI output in Phase 2 (FR-10.2).

### FR-4: Feedback System

| ID | Requirement |
|----|-------------|
| FR-4.1 | Every answer — correct or incorrect — receives instant, specific feedback |
| FR-4.2 | Wrong answers receive a specific explanation, not just a red X |
| FR-4.3 | All feedback text is hand-written, not AI-generated |
| FR-4.4 | Feedback latency is under 100ms (pure state, no async) |

### FR-5: Progress & Mastery

| ID | Requirement |
|----|-------------|
| FR-5.1 | App tracks mastery per lesson per user |
| FR-5.2 | Mastery is achieved when all gradable problems in the lesson are answered correctly. A wrong attempt shows feedback and re-asks the same problem; mastery requires getting each problem right (consecutive correct across the lesson's 3–4 problems) |
| FR-5.3 | If a learner gets 2 wrong answers in a row (`wrongStreak >= 2`), the app re-surfaces the **current lesson's own** concept/teaching material (a review of this lesson's content, not the previous lesson) before the learner retries. Applies uniformly to every lesson, including Lesson 1 |
| FR-5.4 | Lessons unlock sequentially — a lesson is available only when the prerequisite is mastered |
| FR-5.5 | Course path shows each lesson's state: locked / available / in-progress / mastered |

**Firestore schema:**
```
users/{uid}/progress/{lessonId}
  mastered: boolean
  attempts: number
  wrongStreak: number
  currentStepId: string      // written on every step advance; enables exact-step resume
  completedAt: timestamp
  lastVisited: timestamp
```

### FR-6: Habit Loop

> Streak/daily-activity tracking is intentionally out of scope. (Note: the source PRD lists a daily streak as a graded requirement — this is a deliberate deviation.)

| ID | Requirement |
|----|-------------|
| FR-6.1 | Milestone banners surface on: first lesson complete, all lessons mastered |
| FR-6.2 | Lesson completion shows a dedicated completion screen: lesson summary + next lesson preview |

### FR-7: Auth & Persistence

| ID | Requirement |
|----|-------------|
| FR-7.1 | Firebase Auth — email/password sign up and sign in |
| FR-7.2 | All progress and lesson history persist in Firestore across sessions |
| FR-7.3 | Progress syncs across devices (leave on desktop, resume on phone at the exact same step) |
| FR-7.4 | Returning mid-lesson resumes at the exact step of departure |

### FR-8: Mobile & Deployment

| ID | Requirement |
|----|-------------|
| FR-8.1 | Fully functional at 390px width (iPhone screen size) |
| FR-8.2 | All interactions work with touch input |
| FR-8.3 | App is publicly deployed and accessible via URL |
| FR-8.4 | Multiple concurrent learners supported with no degradation |

---

## Phase 2 — AI Features (Due Friday)

> Only begin once the MVP teaches well without AI. AI features are additions — the MVP must work with AI disabled.

### Planned AI Features

| ID | Feature | Description |
|----|---------|-------------|
| FR-9.1 | Problem generation (templated) | AI fills parameters into a fixed set of problem templates (e.g. "n flips, P(exactly k heads)"). The AI chooses parameters and writes the prose; the **answer is computed by the app's own probability functions**, never by the model. This guarantees the course never runs dry without risking incorrect answers |
| FR-9.2 | Wrong-answer explanation | AI explains a specific wrong answer in plain language based on what the learner actually did. **Implemented** for lesson problems and the Problem of the Day: on a resolved miss the client sends the problem, the learner's answer, and the **app-computed correct answer** (ground truth) to the server (`kind: 'explain'`); the model explains *why*, never asserting a different number. It only replaces the author's hand-written incorrect feedback when an AI backend is connected and the **AI explanations** toggle is on — otherwise the hand-written text stands (NFR-7 / FR-10.3) |
| FR-9.3 | **Live dealer-coach (Arcade)** | In the **Arcade / Apply** surface (a sibling to the Sandbox), the Blackjack trainer's coach explains, in plain language, *why* the mathematically optimal play wins at each decision. The coach **narrates** the numbers the deterministic engine already produced (EV per action, the optimal action, dealer bust chance, true count) and **must not compute or contradict them** — the same "AI varies wording, the app owns the numbers" contract as FR-9.1 |

### Arcade / Apply — applied games (v1: Blackjack)

The Arcade is where the probability ideas get *played*, not just predicted. v1 is a single
game — **Blackjack**, **play chips only** (no real money, no purchases, resettable
bankroll, a "for learning, not gambling" frame) — built around expected value, variance,
and the house edge "in the long run."

| ID | Requirement |
|----|-------------|
| FR-9.3a | A deterministic engine (`src/lib/blackjack.ts`, peer to `probability.ts`) is the source of truth for **every** number: hand values, legal actions, dealer behavior (6-deck shoe, S17, blackjack 3:2), the **exact EV of hit/stand/double** from the current shoe composition, the **optimal action** (`argmax EV`), bust chances, and the Hi-Lo running/true count. The LLM never decides any of these |
| FR-9.3b | **Predict-then-verify for decisions:** the learner chooses an action; the engine then reveals the EV-optimal action and the EV gap, and a lifetime **decision accuracy** grades play quality, not luck. The long-run house edge is made visible via a cumulative-net chart and a companion "Blackjack Edge" simulation |
| FR-9.3c | The engine is validated by unit tests **and** a **Monte-Carlo cross-check** (`blackjack.test.ts`): simulated EVs converge to the engine's EVs within tolerance, and the optimal actions reproduce textbook basic strategy |
| FR-9.3d | The coach call runs **server-side** in a free Cloudflare Worker (`worker/coach.mjs`) holding the OpenAI key; the browser never sees a secret (no Blaze plan needed). The client (`src/lib/coachClient.ts`) POSTs to the Worker URL in `VITE_COACH_ENDPOINT`. The same endpoint serves the wrong-answer explanations (FR-9.2), routed by `kind` |
| FR-9.3e | **AI-disabled / offline fallback (NFR-7, FR-10.3):** a settings toggle disables the AI coach, and whenever the Worker endpoint is unavailable the client renders a **deterministic templated explanation** built from the same engine numbers (`src/lib/coach.ts`). The game and its coaching remain fully functional with AI off. The coach never blocks input |
| FR-9.3f | Bankroll + lifetime decision-accuracy persist via the existing `Backend`/progress abstraction (`UserStats.arcade`) — no bespoke store |
| FR-9.3g | Out of scope for v1 (hooks left in place): poker and other games, real money/purchases, multiplayer, split / insurance / surrender, and any "how to beat the casino" advice beyond explaining EV |

### AI Implementation Standards

| ID | Requirement |
|----|-------------|
| FR-10.1 | Every AI feature is grounded in structured lesson state from the content model, not freeform prompts |
| FR-10.2 | Answers are **computed by the app's own probability functions** (the same ones powering the MVP simulations), not trusted from the model. The AI only varies parameters and wording within fixed templates; the numeric answer + tolerance are derived programmatically, so a wrong answer cannot reach the learner |
| FR-10.3 | Full MVP experience remains functional with all AI features disabled |
| FR-10.4 | AI writes into the existing content model schema — it does not replace it |

---

## Phase 3 — Learning Science (Due Sunday)

> Interleaving and spaced repetition operate **only over already-mastered lessons**, via a dedicated **Mixed Practice** mode. This keeps them compatible with sequential mastery-gating (FR-5.4) — the learner only ever reviews/mixes content they have already unlocked and mastered.

### Techniques to Implement

| ID | Technique | Status | Implementation |
|----|-----------|--------|---------------|
| FR-11.1 | Spaced repetition | **Implemented** | Mastered concepts resurface in Mixed Practice at growing intervals (1d → 3d → 7d → 14d), tracked per concept (`UserStats.review[conceptId]` = `{ intervalStep, nextReviewAt, lastReviewedAt }`). Adopts Anki's *spacing* but the **deterministic engine grades** the committed answer (never a self-report) in **one attempt** — so a pass is neither brute-forceable nor self-deceivable: correct advances one rung (capped), wrong resets to the shortest step and reveals the answer. Pure logic in `src/store/review.ts` (`scheduleAfterReview`, `dueConcepts`, `dueCount`, `reviewSummary`), persisted via `recordReview` in `useProgress` |
| FR-11.2 | Interleaving | **Implemented** | The **Mixed Practice** mode (`/practice`, `src/pages/MixedPracticePage.tsx`, engine in `src/content/mixedPractice.ts`) draws problems across all *cleared/mastered* lessons, prioritizes due concepts, and arranges them so no two consecutive picks share a lesson — mixing problem types within a session rather than blocking by lesson |
| FR-11.3 | Mastery learning | **Done (Phase 1)** | A lesson cannot unlock until its prerequisite is demonstrably cleared/mastered (per FR-5.2), gated in `src/store/progress.ts` |
| FR-11.4 | Scaffolding (lecture worked example → first-problem completion → cold) | **Implemented** | A fresh, never-cleared lesson fades support in two places. **(1)** Every lesson's **lecture** (concept step) carries a fully **worked**, term-by-term canonical example for that topic as permanent study material (`canonicalWorked` keyed by the concept simulation via `canonicalStudy`). **(2)** The **first calculation problem** (first numeric/slider gradable step, skipping any holistic order/draw lead-ins) of a guided run is a **completion** — the learner's own generated instance with the final line blanked (`deriveWorked` + `WorkedExample blankLast`). Every other problem is **cold**. The completion is removed once the lesson is cleared (`LessonProgress.timesCleared`) or on replay — expertise reversal (the lecture example remains). Both breakdowns are **derived from the `probability.ts` kernel + exact args threaded onto the step** (`kernel`/`kernelArgs` carried from the generated bank in `generateProblem`), formatted by `workedByKernel` in `src/lib/worked.ts` and recomputed from `probability.ts`, so every worked number agrees with the graded answer and never invents a value. `src/content/worked.coverage.test.ts` proves 1:1 kernel coverage, numeric agreement for every kernel, and (per built lesson) that the lecture shows a worked example and the first calc problem resolves to a completion. Stage logic is the pure `supportLevelFor` in `src/store/progress.ts`. Mixed Practice is always full |
| FR-11.5 | Retrieval practice | **Done (Phase 1)** | Predict-then-verify requires recalling a value or predicting an outcome from memory, not recognizing from options |
| FR-11.6 | Pretesting (errorful generation) | **Implemented** | On the **first-ever** visit to a lesson, the learner commits one cold guess on a representative numeric/slider problem **before any teaching** (`src/components/PretestCard.tsx`); it is **never graded** toward mastery. The guess is stored on `LessonProgress.preTest` (via `recordPreTest` in `useProgress`) and surfaced on the completion screen as an **intuition-vs-reality reveal**. "I'm not sure" is supported, and the lesson closes the gap immediately after — satisfying the "answer arrives shortly after" condition for the effect |

**Spaced-repetition schema (on `UserStats`, not a new Firestore subcollection):**
```
UserStats.review[conceptId]   // conceptId === lessonId
  intervalStep: number        // index into [1d, 3d, 7d, 14d]
  nextReviewAt: number        // epoch ms; "due" when <= Date.now()
  lastReviewedAt: number      // epoch ms
```
Both backends serialize `UserStats` generically (`{ ...emptyStats(), ...stored }`), so this needs no `ProgressAdapter`/Firestore-rules change and old records default to `review: {}` safely. A concept becomes review-eligible once its lesson is cleared/mastered. Mixed Practice surfaces concepts with no record yet (first review) or `nextReviewAt <= now`, prioritizing the most overdue.

---

## Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | Feedback appears in < 100ms |
| NFR-2 | Performance | Simulations run at 60 FPS during slider manipulation and aggregate animation. Large batches (e.g. 1000 trials) are computed, not rendered per-event; only the aggregate (bar/histogram/bell curve) is animated |
| NFR-3 | Performance | Lessons load in < 2 seconds to first interaction |
| NFR-4 | Scalability | Handles multiple concurrent learners with no degradation |
| NFR-5 | Mobile | Full functionality at 390px width with touch input |
| NFR-6 | Reliability | Progress persists 100% across sessions and devices |
| NFR-7 | Resilience | Full app functionality maintained with AI features disabled |
| NFR-8 | Deployment | Publicly deployed, accessible without setup |

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Simulations | HTML5 Canvas (manual math, no physics engine) |
| Auth | Firebase Auth (email/password) |
| Database | Firestore |
| Phase 2 AI backend | **Cloudflare Worker** (free tier, no Blaze plan) — the only place that holds the OpenAI key and calls the model |
| Phase 2 AI | OpenAI API (invoked server-side from the Worker, never the browser) |
| Deployment | Firebase Hosting (site) + Cloudflare Workers (AI endpoint) |

> **AI key handling:** The OpenAI API key lives in a Cloudflare Worker secret, never in the client bundle (anything `VITE_*` ships to the browser). The client (`src/lib/coachClient.ts`) POSTs structured state to the Worker at `VITE_COACH_ENDPOINT`, routed by `kind` (`'blackjack'` = dealer-coach, `'explain'` = wrong-answer feedback); the app's owned functions compute every answer/EV. **AI-disabled (NFR-7/FR-10.3):** with no endpoint configured (or the toggle off) the client calls nothing — the entire MVP path is client + Firestore only and is unaffected.

### File Structure

```
src/
  content/
    lessons.ts          # all 7 lessons as typed static data
  simulations/
    CoinFlip.tsx
    DiceRoll.tsx
    GaltonBoard.tsx
    BirthdayProblem.tsx
    ExpectedValue.tsx
    ConditionalProbability.tsx
    MontyHall.tsx
  components/
    LessonPlayer.tsx
    FeedbackBanner.tsx
    AuthGuard.tsx
    MilestoneBanner.tsx
    CompletionScreen.tsx
  hooks/
    useProgress.ts
    useAuth.ts
  pages/
    LoginPage.tsx
    CoursePage.tsx
    LessonPage.tsx
  store/
    progress.ts
  types/
    lesson.ts
  firebase.ts
  App.tsx
  main.tsx

worker/                   # Phase 2 only — Cloudflare Worker (free, no Blaze plan)
    coach.mjs             # endpoint: { kind, input } → { text }. kind 'blackjack' (Arcade
                          #   coach) + 'explain' (wrong-answer feedback). Narrates app
                          #   numbers only; OpenAI key in a Worker secret, never in client.
```

> **Arcade / Apply (Phase 2):** the Blackjack engine + coach add
> `src/lib/blackjack.ts` (deterministic engine + `blackjack.test.ts`),
> `src/lib/coach.ts` (templated explanation / offline fallback),
> `src/lib/coachClient.ts` (server transport), `src/pages/ArcadePage.tsx`,
> `src/components/BlackjackTable.tsx`, and the `src/simulations/BlackjackEdge.tsx` sim.
> **Wrong-answer explanations (FR-9.2)** add `src/lib/explain.ts` + the `useExplainAI`
> toggle, reusing the same Worker endpoint (`kind: 'explain'`). Bankroll + decision
> accuracy live on `UserStats.arcade`.

### Routing

```
/          → redirect to /learn (authed) or /login
/login     → LoginPage
/learn     → CoursePage (AuthGuard)
/learn/:id → LessonPage (AuthGuard)
/sandbox   → SandboxPage (AuthGuard)
/arcade    → ArcadePage — Arcade / Apply, Blackjack trainer (AuthGuard, Phase 2)
```

---

## MVP Test Scenarios

| # | Scenario | Pass Criteria |
|---|----------|---------------|
| 1 | Learner completes Lesson 1 end to end, getting some answers wrong | Feedback helps learner recover and complete |
| 2 | Learner runs the Galton Board simulation | Balls animate at 60 FPS, bell curve visibly forms |
| 3 | Learner leaves mid-lesson and returns | Resumes at exact step (`currentStepId`) |
| 4 | Learner finishes a lesson | Completion screen appears; next lesson unlocks |
| 5 | Learner gets 2 wrong answers in a row | The current lesson's own concept/teaching material is re-surfaced before retry (FR-5.3) |
| 6 | Full experience on iPhone (390px) | All interactions usable with touch; layout intact |
| 7 | Two users active simultaneously | No performance degradation for either |

---

## Out of Scope

- Multi-subject coverage — probability only
- Video content
- AI in the MVP
- Multiple choice as the primary interaction type
- Passive re-reading as a review mechanism
- AI as a replacement for any MVP feature
