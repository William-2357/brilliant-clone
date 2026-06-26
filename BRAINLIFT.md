# BrainLift — The Long Run

> A learn-by-doing **Probability & Statistics** app modeled on Brilliant.org, built
> in three ordered phases (MVP → AI → learning science). This BrainLift documents the
> point of view behind it and serves as structured context for AI conversations about
> the project. Template: Nessie "BrainLift: The Complete Template."

## Owners

- William Wang (`wwang18388@gmail.com` · GitHub `@William-2357`) — solo build
- Build window: 2026-06-23 → 2026-06-26 · 17 commits · deployed at
  https://brilliant-clone-69be8.web.app

## Purpose

### Purpose

The purpose of this BrainLift is to develop and defend a clear point of view on
**where AI belongs in a learn-by-doing education product** — and to prove it by
building one. The North Star: *an app should teach a hard subject before any AI is
turned on, and when AI is added it must never become the source of truth.* The
subject chosen to go deep on is **probability & statistics**, because the gap between
human intuition and mathematical reality is unusually wide (Monty Hall, the birthday
problem), and because the math is naturally simulatable — which makes a
**predict-then-verify** loop possible, where the learner commits a numeric prediction
*before* a simulation runs and the simulation becomes the answer key.

### In Scope

- One subject taught deeply: probability & statistics for "The Curious Adult Learner."
- The **predict-then-verify** interaction as the core gradable unit, with a Canvas
  simulation as the answer key rather than decoration.
- A **deterministic engine** (`src/lib/probability.ts`, `src/lib/blackjack.ts`) that
  owns every answer, EV, and grade.
- AI used as an **additive layer** in two grounded, verifiable ways: an *offline*
  problem generator and a *live* dealer-coach that only narrates engine output.
- Evidence-based learning science layered on top: retrieval practice, mastery
  learning, interleaving, scaffolding, desirable difficulty.

### Out of Scope

- **AI computing any answer, EV, or grade.** This is a hard rule, not a preference.
- A generic chatbot tutor bolted onto the side.
- Live runtime LLM calls as the *source of truth* (the model never decides numbers;
  problem generation is done offline and engine-verified before shipping).
- Multi-subject breadth, video lectures, multiple-choice as the primary interaction.
- RAG pipelines / external knowledge retrieval — the engine and content model *are*
  the ground truth.

---

## DOK 4: Spiky Points of View (SPOVs)

> The strong, defensible, somewhat-contrarian stances this project was built to prove.
> These double as the assignment's "key learnings / spiky opinions."

- **SPOV 1 — In an education product, AI must never be the source of truth; it should
  narrate a deterministic engine, not compute.**
  - **Elaboration:** The instinct in 2026 is to let the model answer. That is exactly
    wrong for teaching, where a single confidently-wrong number destroys trust and
    mis-teaches. The architecture inverts the usual flow: hand-written functions in
    `probability.ts` and a recursive-DP blackjack engine in `blackjack.ts` compute the
    truth, and the LLM is constrained — by system prompt and by a hard separation of
    concerns — to *only re-word numbers it was handed*. The dealer-coach's prompt
    literally states "A deterministic engine has ALREADY computed every number... You
    MUST NOT recompute, change, round differently, or contradict them." This makes AI
    safe to add without making the lesson depend on it.

- **SPOV 2 — The simulation should be the answer key, not decoration. Predict-then-verify
  beats grade-then-explain.**
  - **Elaboration:** Most apps show a visual *after* grading, as reward. Here the order
    is reversed: the learner is forced to commit a numeric prediction *before* the
    Galton board drops or the coin run completes. The simulation then converges to the
    true value in front of them. This converts a passive animation into genuine
    retrieval practice and makes the "aha" land emotionally, because the learner has
    skin in the game before the truth appears.

- **SPOV 3 — The highest-leverage place for AI in a teaching app is generation-time,
  not runtime.**
  - **Elaboration:** A live "generate a problem" call is a liability: latency, cost,
    and a non-zero chance of a wrong answer reaching a learner. Moving generation
    *offline* (`scripts/genloop/`) removes all three. The model authors a large pool
    of problems against a fixed set of math "kernels"; everything is verified before it
    is committed; the shipped app then serves a static, typed, self-verifying bank with
    **zero runtime AI dependency** for its core loop. "Course never runs dry" is
    delivered without ever gambling on a live model call.

- **SPOV 4 — You can trust AI-authored content with no human gate — if the content has
  to survive a self-verifying gauntlet.**
  - **Elaboration:** Instead of a person eyeballing each generated problem, every
    candidate must: (1) have its answer computed by the engine (`kernel.fn(...args)`,
    never the model), (2) be confirmed by a Monte-Carlo sampler, (3) be re-solved from
    scratch by an *independent blind solver* agent that must reach the same number,
    (4) pass the app's own `validateStep()`, (5) survive a triviality / answer-in-prose
    heuristic and a deduper, and (6) leave the whole repo green (`tsc + eslint +
    vitest`). Trust comes from the gauntlet, not from the generator.

- **SPOV 5 — "Depth over breadth" plus "must teach with AI off" forces a deliberately
  small AI roadmap — and that's a feature.**
  - **Elaboration:** The temptation is to ship five AI features. The discipline is to
    ship the two that are genuinely additive and verifiable, and to *deliberately skip*
    the rest (an AI path-adapter, live hints, AI-written wrong-answer explanations) when
    they'd either duplicate deterministic behavior or risk un-grounded output. A small,
    bulletproof AI surface beats a broad, fragile one.

---

## Experts

> The thinkers and sources whose work grounds the pedagogy, the domain, and the
> learning science. Following these built the foundation for the SPOVs above.

- **Brilliant.org (product / pedagogy)**
  - **Who:** The interactive-learning company the whole assignment is modeled on.
  - **Focus:** Active, problem-first learning — drop the learner into a problem, let
    them manipulate it, give instant feedback, *then* show the idea.
  - **Why Follow:** It defines the bar this project aims at: lessons you learn by doing,
    not by watching. Directly shaped the predict-then-verify loop.
  - **Where:** https://brilliant.org

- **Sal Khan / Khan Academy (mastery learning + UI)**
  - **Who:** Founder of Khan Academy; long-time advocate of mastery-based progression.
  - **Focus:** Don't advance until the current concept is genuinely mastered; calm,
    legible course UI.
  - **Why Follow:** Grounds the mastery-gated unlock model and inspired the Khan-style
    full-page layout (sticky topbar + sidebar, per-lesson icons, segmented grading).
  - **Where:** https://www.khanacademy.org

- **Robert A. Bjork (cognitive science of learning)**
  - **Who:** Director of the UCLA Bjork Learning and Forgetting Lab.
  - **Focus:** "Desirable difficulties" — making learning harder in the right ways
    (spacing, interleaving, retrieval) produces more durable learning.
  - **Why Follow:** The theoretical backbone for Phase 3 — why withholding the answer
    on a first wrong attempt and cycling to a *different* generated problem is a feature,
    not friction.
  - **Where:** https://bjorklab.psych.ucla.edu/

- **Henry L. Roediger III & Jeffrey D. Karpicke (retrieval practice)**
  - **Who:** Memory researchers; authors of "Test-Enhanced Learning" (*Psychological
    Science*, 2006).
  - **Focus:** The testing effect — recalling information strengthens memory far more
    than re-reading it.
  - **Why Follow:** Justifies designing problems that force recall/prediction from
    memory rather than recognition from options.
  - **Where:** Roediger & Karpicke, *Psychological Science* 17(3), 2006 (test-enhanced learning).

- **Charles M. Grinstead & J. Laurie Snell (domain)**
  - **Who:** Authors of *Introduction to Probability* (free, GNU FDL).
  - **Focus:** Rigorous but approachable treatment of the exact archetypes used here —
    coins, dice, binomial, gambler's fallacy, cards without replacement, random walks,
    expected value.
  - **Why Follow:** The canonical, openly-licensed source for the problem *archetypes*
    (see `SOURCES.md`); every answer is re-derived through this app's own engine.
  - **Where:** https://math.dartmouth.edu/~prob/prob/prob.pdf

- **OpenStax & NIST/SEMATECH (domain, applied framings)**
  - **Who:** OpenStax *Introductory Statistics* (CC BY 4.0); NIST/SEMATECH *e-Handbook
    of Statistical Methods* (public domain).
  - **Focus:** Real-world framings — process/defect rates, sampling distributions, the
    CLT and standard error, actuarial expected value.
  - **Why Follow:** Source of the applied scenario archetypes (manufacturing QA,
    polling, insurance, ecology) that make abstract probability concrete.
  - **Where:** https://openstax.org/details/books/introductory-statistics ·
    https://www.itl.nist.gov/div898/handbook/

---

## DOK 3: Insights

> Original conclusions formed while building, grouped thematically. These are the
> bridge between the source material (DOK 2) and the SPOVs (DOK 4).

**On architecture (engine-as-truth):**

- **Insight 1:** Separating "who computes the answer" from "who phrases the answer"
  is the single decision that makes AI safe in an education app. Once the engine owns
  every number, AI becomes a presentation layer you can disable, swap, or let fail —
  and nothing about correctness changes.
- **Insight 2:** A content model where each step carries a *computed* `answer`,
  `tolerance`, and `unit` (not hand-typed) means the same `isCorrect(guess, answer,
  tol)` check validates a hand-written lesson, a generated problem, and an AI feature.
  One correctness primitive, reused everywhere, is what keeps the system honest as it
  grows to 36 lessons.

**On pedagogy (predict-then-verify, retrieval):**

- **Insight 3:** Withholding the simulation until *after* the prediction is what turns
  a visualization into a test. The sim is emotionally powerful precisely because the
  learner has already committed.
- **Insight 4:** A two-attempt model (first-try = green, second-try = yellow, two
  misses = red) plus *cycling to a different generated problem on retry* is scaffolding
  and desirable difficulty in one mechanic: the learner can't pattern-match the exact
  question, so they must re-derive it.

**On the AI build process:**

- **Insight 5:** Multi-agent decomposition (writer → independent solver → verifier →
  formatter) beats a single "write a good problem" prompt, because each agent has a
  narrow, checkable job and the *disagreement between agents* is the quality signal.
- **Insight 6:** The most valuable agent is the one that's deliberately kept ignorant —
  the blind solver, which never sees the formula name or the answer, so its agreement
  is real evidence rather than confirmation bias.

**On phase decisions:**

- **Insight 7:** The brief's phase order (teach first, then AI, then learning science)
  is itself a design constraint that improves the product: because the MVP had to teach
  with zero AI, the AI layer could only ever be additive, which kept it small and
  verifiable.
- **Insight 8:** "Explain a wrong answer with AI" sounds compelling but was *skipped*
  for lessons — hand-written feedback is already specific and instant, and an LLM there
  would add latency and risk for little gain. The same idea was instead spent where it's
  genuinely additive and safe: narrating *why* an EV-optimal blackjack play wins.

---

## DOK 2: Knowledge Tree

> The structured foundation: the organized facts and summaries that fuel the insights
> and SPOVs above. Categories 1–3 are domain/pedagogy; Category 4 is the build itself
> (and covers the assignment's required brainlift elements: tools & workflow, prompting
> strategies, phase decisions, and code analysis).

- **Category 1: The Brilliant / active-learning model**
  - **Subcategory 1.1: Learn-by-doing vs. passive content**
    - **Source:** The assignment brief — *Build Brilliant: A Learn-by-Doing App*
      - **DOK 1 — Facts:**
        - Passive content doesn't stick; active problem-solving does.
        - Required: real interactions (beyond multiple choice), interactive visuals,
          instant specific feedback, mastery tracking, persistence, a habit loop.
        - Hard rule: no AI in the MVP; AI must be additive in Phase 2.
      - **DOK 2 — Summary:**
        - Build the app so it teaches *before* AI exists; depth in one subject beats a
          shallow tour of many.
      - **Link to source:** project brief (`Build Brilliant_…pdf`)

- **Category 2: Probability pedagogy & domain archetypes**
  - **Subcategory 2.1: Open, attributable problem archetypes**
    - **Source:** Grinstead & Snell; OpenStax; NIST e-Handbook; MIT OCW 18.05 (see
      `SOURCES.md`)
      - **DOK 1 — Facts:**
        - Coin/dice/binomial/cards/random-walk/EV/CLT archetypes are standard and
          openly licensed.
        - Monty Hall generalizes to n doors: switching wins (n−1)/n.
        - Fair die: μ = 3.5, σ = √(35/12) ≈ 1.71; standard error = σ/√m.
      - **DOK 2 — Summary:**
        - Only the *archetype* (the kind of situation) is borrowed; all prose is
          original and every answer is re-derived through `probability.ts`.
      - **Link to source:** `SOURCES.md` · https://math.dartmouth.edu/~prob/prob/prob.pdf

- **Category 3: Learning science (Phase 3)**
  - **Subcategory 3.1: Durable-learning techniques**
    - **Source:** Bjork (desirable difficulties); Roediger & Karpicke (retrieval); Khan
      (mastery)
      - **DOK 1 — Facts:**
        - Retrieval practice > re-reading for retention.
        - Spacing and interleaving improve transfer and discrimination.
        - Mastery learning gates advancement on demonstrated competence.
      - **DOK 2 — Summary (as implemented / planned):**
        - **Retrieval practice:** every gradable step is predict-from-memory, not
          recognize-from-options. *(built)*
        - **Mastery learning:** a lesson clears only when all 5 problems are green/yellow
          and is "mastered" only at all-green; the next lesson unlocks on clear. *(built)*
        - **Interleaving:** the 10-question Final Test mixes problem types across the
          whole course. *(built)*
        - **Scaffolding:** a free-explore concept step + auto-resurfacing the lesson's
          own lecture after two wrong answers. *(built)*
        - **Desirable difficulty:** retries cycle to a *different* generated problem;
          questions alternate between asking a fraction and a count; the sim is withheld
          on a first wrong attempt. *(built)*
        - **Spaced repetition:** per-concept review intervals (1d→3d→7d→14d) via a
          dedicated Mixed Practice mode. *(specced in `PRD.md`; in progress)*
      - **Link to source:** `PRD.md` (Phase 3) · https://bjorklab.psych.ucla.edu/

- **Category 4: The build — tools, workflow, prompting, and code analysis**
  - **Subcategory 4.1: Tools & workflow**
    - **DOK 1 — Facts:**
      - Stack: React 19 + TypeScript + Vite; HTML5 Canvas sims (manual math, no physics
        engine); Firebase Auth + Firestore (with a localStorage fallback so the app runs
        with no backend config); KaTeX lectures.
      - Primary AI coding tool: **Cursor** with Claude/agent models, driven by a
        standing rules file (`CLAUDE.md`) that encodes the hard constraints (engine =
        source of truth; AI optional/additive; predict-then-verify; canvas conventions).
      - Phase-2 AI backend: a free **Cloudflare Worker** (`worker/coach.mjs`) holds the
        OpenAI key server-side (no key in the client bundle, no Firebase Blaze plan).
      - Offline generation pipeline: `scripts/genloop/` uses the **Cursor Agent SDK**
        (`@cursor/sdk`) to run writer/solver/verifier/formatter agents.
    - **DOK 2 — Summary:**
      - The workflow was "rules-as-guardrails": encode the non-negotiables once in
        `CLAUDE.md`, then let AI agents do the heavy lifting inside those rails, with the
        test suite + repo gate as the backstop.
    - **Link to source:** `CLAUDE.md` · `README.md` · `worker/README.md` ·
      `scripts/genloop/README.md`

  - **Subcategory 4.2: Prompting strategies (prompts that worked)**
    - **DOK 1 — Facts (5 prompts that worked):**
      1. **Standing guardrail prompt (whole build, in `CLAUDE.md`):** *"`probability.ts`
         and `blackjack.ts` are the single source of truth for every answer. Answers/EVs
         are computed by these functions, never hand-typed; simulations animate toward
         those values. AI is optional and additive — never the source of truth."* This
         one instruction shaped every subsequent change.
      2. **Generator — writer agent:** *"Write ONE original problem whose correct answer
         is exactly the value of `kernel.fn(...args)`. You do NOT compute or state the
         answer... require at least TWO non-trivial reasoning steps... never state or
         imply the numeric answer."*
      3. **Generator — independent blind solver:** *"You are an independent contest
         solver. Solve the problem from scratch. You are given ONLY the problem
         statement — no answer, no formula name... If ambiguous or unsolvable, set
         confident=false."* (Its agreement with the engine is the acceptance test.)
      4. **Generator — strict verifier:** *"Reject if: the prose is ambiguous/
         under-specified; the asked quantity isn't exactly what the kernel computes; the
         answer is stated in the prose; the problem is trivial; units/format don't
         match."*
      5. **Live dealer-coach (runtime):** *"A deterministic engine has ALREADY computed
         every number you are given... You MUST NOT recompute, change, round differently,
         or contradict them. Explain in 2–3 sentences WHY the optimal action has the best
         expected value, citing the numbers you were given."*
    - **DOK 2 — Summary:**
      - The throughline of every prompt is **"the model phrases, the engine decides."**
        Generation prompts forbid stating the answer; the coach prompt forbids computing
        it. Quality is enforced by *adversarial decomposition* (a writer, an ignorant
        solver, a strict verifier) rather than by trusting one prompt.
    - **Link to source:** `scripts/genloop/prompts/{writer,solver,verifier,formatter}.md`
      · `worker/coach.mjs`

  - **Subcategory 4.3: Phase decisions — chosen vs. skipped**
    - **DOK 1 — Facts:**
      - **Phase 2 — shipped:** (a) offline AI **problem generation** grounded in the
        engine and gated by Monte-Carlo + blind-solver + `validateStep` + repo gate;
        (b) a **live dealer-coach** in the Arcade that narrates EV-optimal blackjack
        play, server-side key, with a deterministic offline fallback and an AI on/off
        toggle.
      - **Phase 2 — deliberately skipped:** AI-written wrong-answer explanations *in
        lessons* (hand-written feedback already covers this safely), an AI path-adapter
        (deterministic sequential mastery-gating is clearer and honest), and live
        runtime problem generation (offline generation is safer and removes latency).
      - **Phase 3 — chosen principles:** retrieval practice, mastery learning,
        interleaving, scaffolding, desirable difficulty (spaced repetition specced).
    - **DOK 2 — Summary:**
      - Every "yes" is a feature that is *additive and engine-verifiable*; every "no"
        is something that would either duplicate a deterministic behavior or put
        un-grounded model output in front of a learner.
    - **Link to source:** `PRD.md` (Phase 2 & 3) · `README.md` (Arcade section)

  - **Subcategory 4.4: Code analysis (rough AI vs. hand-written split)**
    - **DOK 1 — Facts (estimate):**
      - **~85–90% of the code was AI-generated** under human direction (Cursor agents):
        React components, the ~30 Canvas simulations, page/layout/routing, the Firebase
        and localStorage backends, the genloop harness, and the test suite.
      - The **generated problem bank** (`src/content/generated/**`) is AI-*authored* but
        **engine-verified** — answers are recomputed by `probability.ts`, never trusted
        from the model.
      - **Human-owned (the high-leverage ~10–15%):** the core architecture and the hard
        rules (engine-as-truth, predict-then-verify); the math invariants in
        `probability.ts` / `blackjack.ts`; the verification design (Monte-Carlo + blind
        solver + repo gate); lesson *prose* and hand-written feedback strings; and all
        product/phase decisions.
      - Verification at time of writing: `eslint` clean, `tsc -b` clean, **118/118
        tests pass** across 22 files; the deployed coach Worker responds live.
    - **DOK 2 — Summary:**
      - AI wrote most of the *lines*; humans owned the *invariants*. The split that
        matters isn't AI-vs-human by volume — it's "who guarantees correctness," and
        that stayed firmly with the engine and the gauntlet.
    - **Link to source:** `src/lib/probability.ts` · `src/lib/blackjack.ts` ·
      `src/content/generated/generated.test.ts` · `scripts/genloop/orchestrator.ts`
