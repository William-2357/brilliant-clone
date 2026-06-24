# BACKLOG — scenarios that need new math and/or a new sim

During scenario harvesting (see `SOURCES.md`) we found many compelling archetypes
that **cannot** be honored under the current hard constraints, because the answer
is not yet computable by a function in `src/lib/probability.ts` and/or no existing
`SimulationType` faithfully verifies it. Per the rules, we did **not** fake these
— they are parked here.

For each: the **archetype**, the **`probability.ts` function signature** we'd add,
and **which sim** could act as the answer key (extend an existing one, or build a
new Canvas component + register it in `simulations/index.ts` and `SimulationType`).

Roughly ordered by effort / payoff. The first group reuses existing sims; the
second group needs new sims.

---

## A. New primitive, existing sim can verify (low risk)

### A1. Binomial counts with general p (exactly / at least k successes)
- **Archetype:** "A line runs 8% defectives; in a box of 20, what's P(exactly 2
  defective)? P(at least 1)?" (NIST process control; OpenStax Ch. 4.)
- **Functions:**
  ```ts
  export function binomialCdf(n: number, k: number, p: number): number; // P(X ≤ k)
  export function binomialAtLeast(n: number, k: number, p: number): number; // 1 − cdf(k−1)
  ```
  (`binomialPmf` already exists.)
- **Verify with:** `galtonBoard` already reads `config.p`, so a **biased** board
  (rows = n) makes bin k = #right-bounces ~ Binomial(n, p). A "fraction of drops in
  bins ≥ k" question would match. Alternatively `coinFlip` count framing. Mostly a
  math add; minor wiring to ask bin-range questions on a biased board.

### A2. Variance / SD of an arbitrary payout distribution
- **Archetype:** "Two bets have the same expected value but different risk — rank by
  variance." (Grinstead & Snell Ch. 6; OpenStax.)
- **Functions:**
  ```ts
  export function variance(segments: WheelSegment[]): number;
  export function stdDev(segments: WheelSegment[]): number;
  ```
- **Verify with:** `expectedValue` (the wheel sim) — it already tracks a running
  average; would need to also show/observe spread of payouts to be a true answer
  key, so a small sim extension (overlay ±SD band) plus the math.

### A3. Geometric waiting time (first success on trial k; expected wait)
- **Archetype:** "Keep flipping until the first head — how many flips on average?
  P(first success on trial 5)?" (Grinstead & Snell; MIT OCW 18.05.)
- **Functions:**
  ```ts
  export function geometricPmf(k: number, p: number): number;   // (1−p)^(k−1)·p
  export function geometricMean(p: number): number;             // 1/p
  export function geometricAtMost(k: number, p: number): number; // 1 − (1−p)^k
  ```
- **Verify with:** a **new** "repeat until first success" sim (cleanest), or an
  extended `coinFlip` that stops at the first head and histograms the wait. Listed
  in group A because the math reuses Bernoulli, but it really wants its own sim.

---

## B. New primitive AND new sim (higher effort)

### B1. Poisson (rare events / arrivals in an interval)
- **Archetype:** call-center calls per minute, typos per page, decays per second,
  goals per match. (NIST e-Handbook; OpenStax.)
- **Functions:**
  ```ts
  export function poissonPmf(k: number, lambda: number): number; // e^−λ λ^k / k!
  export function poissonCdf(k: number, lambda: number): number;
  ```
- **Verify with:** a **new** `poisson` sim — events dropping onto a timeline /
  grid over many intervals, histogramming the per-interval count against the
  Poisson pmf (visually a right-skewed bar chart converging to e^−λ λ^k/k!).

### B2. Bayes' theorem / medical screening (posterior after a positive test)
- **Archetype:** "Disease prevalence 1%, test sensitivity 99%, specificity 95% —
  given a positive test, P(disease)?" The classic base-rate problem. (OpenStax Ch.
  3; MIT OCW 18.05; Cross Validated.)
- **Functions:**
  ```ts
  export function bayesPosterior(prior: number, sensitivity: number, specificity: number): number;
  // = (sens·prior) / (sens·prior + (1−spec)·(1−prior))
  ```
- **Verify with:** a **new** `bayes` sim — a natural-frequency grid (e.g. 10,000
  icons split into TP/FP/FN/TN) or a probability tree, so the simulated share of
  "truly sick among all positives" converges to the posterior. The current
  `conditional` sim is hard-wired to a 52-card ace/face deck and can't express this.

### B3. Normal distribution: z-scores and tail areas (68–95–99.7)
- **Archetype:** "Heights are normal with μ, σ — P(taller than x)? What z cuts off
  the top 5%?" (NIST e-Handbook; OpenStax Ch. 6.)
- **Functions:**
  ```ts
  export function zScore(x: number, mean: number, sd: number): number;
  export function normalCdf(z: number): number;   // Φ(z) via erf approximation
  export function normalTail(z: number): number;  // 1 − Φ(z)
  ```
- **Verify with:** a **new** `normal` sim (shade the area under a normal curve and
  count samples in the region). The `clt` sim draws a normal overlay but only as a
  reference for sample means — it doesn't grade arbitrary tail areas, and its σ is
  not exposed via `simConfig`.

### B4. Hypergeometric (draws without replacement, general counts)
- **Archetype:** "5 defectives in a batch of 50; draw 10 without replacement —
  P(exactly 1 defective)?"; lottery "match 6 of 49"; capture–recapture. (Grinstead
  & Snell Ch. 4; OpenStax.)
- **Functions:**
  ```ts
  export function hypergeometricPmf(N: number, K: number, n: number, k: number): number;
  // = C(K,k)·C(N−K, n−k) / C(N,n)   (uses existing choose())
  ```
- **Verify with:** a **new** `urn` sim (draw a handful from a labeled urn over many
  trials, histogram the count of "marked" items). The `conditional` sim only deals
  the fixed 52-card ace/face deck, so it can't express a general urn.

### B5. Gambler's ruin (absorbing barriers)
- **Archetype:** "Start with $i, bet $1 on a p-coin, quit at $0 or $N — P(reach N
  before 0)? Expected duration?" (Grinstead & Snell Ch. 12; MIT OCW.)
- **Functions:**
  ```ts
  export function ruinProbability(p: number, i: number, N: number): number;
  export function ruinDuration(p: number, i: number, N: number): number;
  ```
- **Verify with:** an **extended `randomWalk`** that adds absorbing barriers at 0
  and N and reports the fraction of paths absorbed at N (and mean steps to
  absorption). Today's `randomWalk` is barrier-free, so it can't grade this.

### B6. Confidence interval / margin of error for a proportion or mean
- **Archetype:** "A poll of n with σ (or p̂) — 95% margin of error? Is 50% inside
  the interval?" (OpenStax Ch. 8; NIST.)
- **Functions:**
  ```ts
  export function marginOfError(sd: number, n: number, z?: number): number; // z·sd/√n
  export function proportionSE(pHat: number, n: number): number;            // √(p̂(1−p̂)/n)
  ```
- **Verify with:** an **extended `clt`** that exposes σ via `simConfig` and draws
  many intervals, showing the ~95% capture rate. Needs the CLT sim to take a
  general σ (today its verify parent is locked to the fair die).

### B7. Exponential / continuous waiting times (memorylessness)
- **Archetype:** "Bus arrivals are exponential with rate λ — P(wait > t)? Mean
  wait? Memorylessness." (Grinstead & Snell; NIST.)
- **Functions:**
  ```ts
  export function exponentialMean(lambda: number): number;        // 1/λ
  export function exponentialTail(t: number, lambda: number): number; // e^(−λt)
  ```
- **Verify with:** a **new** `waiting` sim (event timeline; histogram of inter-arrival
  times against the exponential density). Pairs naturally with B1 (Poisson).

---

## Notes
- All proposed functions are pure and unit-testable, matching the existing
  `probability.ts` style (no DOM, no state).
- New sims must follow `CLAUDE.md`'s Canvas conventions (no auto-run on mount via
  `lastRunRef`, hide the answer during predict, animate-small / batch-large,
  cache `setupCanvas`, read CSS vars on paint).
- Recommended sequencing: **A1 → A2 → A3** (math-only or light sim tweaks) first,
  then the new-sim projects **B2 (Bayes)** and **B1 (Poisson)** for the biggest
  conceptual payoff, then **B3/B4/B5/B6/B7** as a "distributions & inference" wave.
