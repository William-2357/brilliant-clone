# BrainLift — The Long Run

## Owners

- **William** — primary owner / author

---

## Purpose

**Core goal:** prove that the most effective way to teach probability is to make the
learner **commit to an answer before seeing the right one**, then run a **simulation that
grades the guess** — turning the decorative animation into the answer key. In competition
and high-school math I did in high school, probability was the least intuitive topic to learn from a textbook,
precisely because it is so abstract. Using hands-on simulations closes that gap between intuition and
math.

**In scope:** the pedagogy of predict-then-verify and what flows from it (withholding the
answer, two-attempt grading, generated-not-fixed problems, "grade the decision, not the
luck"); the learning science that justifies the deliberate friction (retrieval, desirable
difficulties, productive failure, generation, mastery, spaced + interleaved review, fading
scaffolds, pretesting); *why probability* is the ideal subject; motivation that resists
vanity metrics.

**Out of scope:** a general theory of education or multi-subject breadth (deliberately one
subject); K-12 / classroom, teacher dashboards, real-money
gambling, multiplayer; and using this document to have an AI *generate* its own insights (a
BrainLift passes through a human brain first).

---

## DOK 4 — Spiky Points of View

### SPOV 1 — The simulation must be the *answer key*, not the illustration.

Almost every "interactive" product shows you the concept, then animates it to *illustrate*
— decoration that arrives after you already know the answer, so it teaches nothing. The
Long Run inverts the order: you **commit a numeric prediction first**, and only then does
the simulation run and *grade* you. The decorative animation becomes a live assessment, and
the moment of being wrong — watching 1,000 flips refuse to match your guess — is the
instruction. A prediction you generate yourself is encoded far more durably than a fact you
read, so every problem is a generation event *and* a retrieval event at once.

**In the build:** `LessonPlayer` runs `predict → run → feedback` on every gradable step;
target lines/curves stay hidden until the run starts (`mode === 'explore' || processed > 0`)
so they can't leak the answer (PRD **FR-1.6**).
**Grounding:** the [generation effect](https://en.wikipedia.org/wiki/Generation_effect)
(Slamecka & Graf, 1978); **Predict–Observe–Explain** (White & Gunstone, 1992); the
[hypercorrection effect](https://en.wikipedia.org/wiki/Hypercorrection_effect) (Butterfield
& Metcalfe, 2001).

### SPOV 2 — Withholding the answer *and the simulation* after a wrong first guess is a feature, not cruelty.

Conventional UX says never frustrate the user — reveal help immediately. For *learning*,
that instinct is harmful. A wrong **first** attempt reveals *nothing* — not the answer, not
the explanation, and crucially **not even the simulation** — and silently deals a
*different* generated version for the second try. The answer and the sim appear only once
you've earned them (a correct answer) or exhausted your attempts (the second miss).
Immediate reveal short-circuits retrieval, the single strongest lever for durable memory;
this is *desirable difficulty* — friction placed exactly where slowing down builds memory.

**In the build:** two-attempt grading (`green` first-try, `yellow` second, `red` twice
wrong) in `store/progress.ts`; "answer withheld until resolved" is a hard rule; the second
try pulls a freshly generated problem via the `retry` cycle.
**Grounding:** the [testing effect](https://en.wikipedia.org/wiki/Testing_effect) —
[Roediger & Karpicke (2006)](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)
found tested learners recalled ~56% after a week vs ~42% for re-readers;
[desirable difficulties](https://en.wikipedia.org/wiki/Desirable_difficulty) (Bjork &
Bjork); [productive failure](https://www.tandfonline.com/doi/abs/10.1080/07370000802212669)
(Kapur, 2008).

### SPOV 3 — In a game of chance, grade the *decision*, not the *outcome*.

Casino games — and most of life — mix skill with luck, and humans are terrible at
separating them: we praise the player who hit on 16 and caught a 5. The Arcade refuses to
grade luck. It grades whether your action was **EV-optimal given the shoe**, tracking a
lifetime *decision accuracy* invariant to whether any single hand won. This is
predict-then-verify for *decisions* — over one hand, optimal play can lose; that's variance,
and it's the point. The "Blackjack Edge" sim auto-plays perfect strategy for tens of
thousands of hands so skill (decision accuracy) and luck (a noisy hand) visibly pull apart
and the house edge emerges only "in the long run." Separating signal from noise is arguably
the most valuable thing a probability course can teach.

**In the build:** `blackjack.ts` computes exact hit/stand/double EV from live shoe
composition (recursive DP), the `argmax` optimal action, and the Hi-Lo count;
`BlackjackTable` shows decision accuracy + a cumulative-net chart; play-chips only, "for
learning, not gambling" (PRD **FR-9.3**).
**Grounding:** the [law of large numbers](https://en.wikipedia.org/wiki/Law_of_large_numbers)
made experiential; outcome bias and the
[gambler's fallacy](https://en.wikipedia.org/wiki/Gambler%27s_fallacy) (Tversky & Kahneman,
1974).

### SPOV 4 — Review the *concept*, not the *lesson* — spaced, interleaved, and graded in one engine-checked shot so the schedule can't be faked.

Most apps "review" by replaying the lesson you just finished — massed, blocked, and instant,
the single worst schedule. **Mixed Practice** inverts all three: once a lesson is *cleared*,
its concept joins a rotation that **interleaves** across *all* cleared lessons (no two
neighbors from one topic) and **spaces** each concept on an expanding 1 → 3 → 7 → 14-day
ladder. And because a review you can retry — or self-grade after peeking — is one you can
fake, each concept gets **one engine-graded shot**: you commit a single answer, the
deterministic engine (never a self-report) decides, and there is no second try. Interleaving
forces the learner to first decide *which* approach a problem needs — the transferable skill.
(A deliberate departure from Anki's self-rating: the same integrity goal, reached by
objective grading rather than the honor system.)

**In the build:** `/practice` (`MixedPracticePage`; `content/mixedPractice.ts`) builds a
six-problem, due-prioritized, interleaved session; `store/review.ts` is the pure ladder on
`UserStats.review`; `PracticeProblem` in `'single'` mode is one-shot engine grading; a
**due badge** + memory-strength readout surface on Home/Profile (PRD **FR-11.1 / FR-11.2**).
**Grounding:** the [spacing effect](https://en.wikipedia.org/wiki/Spacing_effect) —
[Cepeda et al. (2006)](https://pubmed.ncbi.nlm.nih.gov/16719566/), 839 assessments;
interleaving — [Rohrer & Taylor (2007)](https://link.springer.com/article/10.1007/s11251-007-9015-8);
the testing effect as why objective retrieval beats re-reading.

### SPOV 5 — Start with a fully worked example and a guess you're *allowed to fail* — then fade the help fast.

Two failure modes haunt practice apps: drop novices into cold problems (working memory
overloads) or coddle everyone with hints forever (experts disengage). The Long Run threads
both. A new lesson opens with a **pretest** — one cold guess *before any teaching*,
ungraded, that you're *encouraged* to get wrong — then teaches against that gap. The fully
worked example lives in the **lecture** itself (permanent study material), and the lesson's
**first calculation problem** is a **completion** — your own instance with the final line
blanked. Every later problem is cold, and the completion disappears the moment you've
cleared the lesson once. The non-obvious part is the *fade itself*: the worked-example
advantage **reverses** as competence grows (expertise reversal), so support that rescues a
beginner actively wastes an expert's effort.

**In the build:** a first-visit `PretestCard` writes `LessonProgress.preTest`, revealed as
an intuition-vs-reality panel on the completion screen (**FR-11.6**); `lib/worked.ts` builds
the term-by-term breakdown from the `probability.ts` kernel threaded onto each step
(`workedByKernel`), so `canonicalWorked` (lecture) and `deriveWorked` (completion) always
match the graded answer; `supportLevelFor` returns `completion` only for the first
calculation problem of a guided run, then drops it once `timesCleared > 0` (**FR-11.4**).
**Grounding:** the pretesting effect —
[Richland, Kornell & Kao (2009)](https://psycnet.apa.org/doi/10.1037/a0015872); the
[worked-example effect](https://en.wikipedia.org/wiki/Worked-example_effect) (Sweller &
Cooper, 1985) with completion + guidance-fading (Renkl & Atkinson, 2003); and the
[expertise-reversal effect](https://en.wikipedia.org/wiki/Expertise_reversal_effect)
(Kalyuga et al., 2003).

---

## Expert — Carl Hendrick

Professor of Learning Science (Amsterdam); PhD from King's College London; taught in London
classrooms for 18 years before turning to research; co-author of *How Learning Happens* and
*How Teaching Happens* (with Paul Kirschner). He is the best synthesizer of the exact
research this thesis rests on — Bjork's desirable difficulties, Roediger & Karpicke's
testing effect, Sweller's cognitive load, Kahneman's biases — translated into design you can
actually ship. His central warning is the throughline of nearly every SPOV here: **fluency,
engagement, and enjoyment are poor proxies for learning.** Predict-then-verify and
withholding the answer are attempts to optimize for real learning over the *illusion* of it.
· https://www.carlhendrick.com/

---

## DOK 3 — Insights

**1 — The reveal is the reward, so spend it carefully.** The instant you show the answer
(or the sim), the retrieval opportunity is gone forever — which reframes "show the
simulation" from a generous UX gift into *scarce pedagogical currency*, spent only at the
two moments it can't be wasted: a correct answer (reinforcement) or a second miss
(resolution). *(testing effect → SPOV 1, 2)*

**2 — A simulation only teaches if it can contradict you.** A sim that plays *after* you
know the answer can only confirm; one that plays after a *prediction* can *surprise*. The
teaching power is entirely in the possibility of being proven wrong — which is why the
predict step is non-negotiable and the target lines stay hidden until the run.
*(PhET; Predict–Observe–Explain → SPOV 1)*

**3 — The subject was chosen *because* intuition fails here.** Probability has the widest,
most reliable gap between gut and math (Monty Hall, the birthday problem, the gambler's
fallacy). Pick a domain where people are usually *right* and the predict-then-verify loop
has nothing to teach. *(heuristics & biases → SPOV 1, 3)*

**4 — Separating skill from luck is the highest-value lesson in the course.** Most
real-world "probability" failures are outcome bias — judging a decision by its result. So
"grade the decision, not the luck" is not a gimmick bolted onto a game; it may be the most
transferable thing the app teaches. *(law of large numbers; outcome bias → SPOV 3)*

**5 — Scaffolding is only good if it *leaves*.** Help that never fades becomes a crutch and
then an insult — the same worked example that rescues a novice wastes an expert's attention.
The valuable design move isn't "add scaffolding," it's "schedule its removal."
*(worked-example & expertise reversal → SPOV 5)*

---

## DOK 2 — Knowledge Tree

**1. Retrieval, generation & desirable difficulty**
- **Testing effect** — Roediger & Karpicke (2006): after a week, tested learners recalled
  ~56% vs ~42% for re-readers — testing *changes* memory, it doesn't just measure it (and
  short-term re-reading looks better, which is the trap).
- **Desirable difficulties** — Bjork & Bjork: conditions that slow acquisition (spacing,
  interleaving, testing, reduced feedback) often *improve* long-term retention; subjective
  fluency is a poor, often inverted guide to learning.
- **Generation effect** — Slamecka & Graf (1978): information you *generate* is retained
  better than identical information you *read* — so a typed prediction earns retention
  before the sim even runs.
- **Productive failure** — Kapur (2008): students who struggle on a problem *before*
  instruction beat directly-taught peers on later transfer tests.
- **Hypercorrection** — Butterfield & Metcalfe (2001): high-confidence errors are corrected
  best — so sharpen the commitment, don't soften it.

**2. Simulations & cognitive load**
- **PhET research** (Wieman, Perkins): well-designed sims with *implicit* scaffolding match
  or exceed traditional instruction — but only when affordances (including *hiding* the
  answer until the right moment) are designed.
- **Cognitive Load Theory** — Sweller; Kirschner, Sweller & Clark (2006): working memory is
  sharply limited and pure discovery loses to *guided* discovery — the license for computed
  answers, lectures, scaffolds, and animate-small / batch-large.
- **Active learning** — Freeman et al. (2014): meta-analysis of 225 studies — active
  learning raised exam scores ~0.47 SD and lecture courses had ~1.5× the failure rate. The
  empirical mandate for learn-by-doing over video.

**3. Probabilistic reasoning & representation**
- **Heuristics & biases** — Tversky & Kahneman (1974): people systematically misjudge
  probability — the precondition that makes predict-then-verify teach.
- **Natural frequencies** — Gigerenzer & Hoffrage (1995): reframing Bayesian problems as
  counts raised correct inferences from ~16% to ~46% with no teaching — so alternating
  "P(…)" with "about how many of N…" is pedagogy, not variety.
- **Law of large numbers, experienced**: averages converge as trials grow; making the long
  run *visible* is the product's name and spine.

**4. Motivation & mastery**
- **Overjustification** — Deci, Koestner & Ryan (1999): expected, performance-independent
  rewards undermine intrinsic motivation — so the streak rides one honest daily rep and
  feedback explains rather than scores.
- **Mastery learning** — Bloom (1984): mastery plus tutoring moved the average student ~2 SD;
  clear-before-unlock is its scalable echo and the gate the review layer can trust.

**5. Spacing, interleaving, worked examples & pretesting**
- **Spacing** — Cepeda et al. (2006): meta-analysis of 839 assessments; the gap producing
  maximal retention grows with the retention interval — the basis for the 1 → 3 → 7 → 14-day
  ladder.
- **Interleaving** — Rohrer & Taylor (2007): shuffled practice raised later test scores
  despite feeling harder — it trains choosing the *approach*, not just executing it.
- **Worked examples & expertise reversal** — Sweller & Cooper (1985); Kalyuga et al. (2003):
  studying worked examples beats solving for novices, with backward fading easing transfer —
  and the advantage *reverses* as expertise grows, so the help must leave.
- **Pretesting** — Richland, Kornell & Kao (2009): a failed guess *before* study improves
  later retention — the basis for the ungraded pretest and its intuition-vs-reality reveal.

---

## DOK 1 — Facts

> The raw, checkable findings behind the Knowledge Tree above.

- **Testing effect** (Roediger & Karpicke 2006): one week out, ~56% recall (tested) vs ~42% (re-read), no feedback.
- **Spacing** (Cepeda et al. 2006): 839 assessments across 317 experiments; the optimal gap grows with the retention interval.
- **Interleaving** (Rohrer & Taylor 2007): shuffled practice beat blocked on later tests, despite feeling harder.
- **Productive failure** (Kapur 2008): struggle-before-instruction beat direct teaching on transfer (replicated 2010).
- **Pretesting** (Richland, Kornell & Kao 2009): a failed guess before study beats equal study time — even when wrong.
- **Cognitive load** (Kirschner, Sweller & Clark 2006): working memory is limited; minimal guidance loses to guided instruction.
- **Heuristics & biases** (Tversky & Kahneman 1974): probability is systematically misjudged (incl. the gambler's fallacy).
- **PhET** (Wieman, Perkins): sims with implicit scaffolding can match or exceed instruction when affordances are designed.