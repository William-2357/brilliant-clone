/**
 * Owned probability functions. These are the single source of truth for every
 * gradable answer in the app. The simulations animate toward these values, and
 * in Phase 2 the same functions (not the model) will compute AI-templated answers.
 */

/** n choose k, computed multiplicatively to avoid overflow for the n we use. */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** Probability of exactly k successes in n independent trials each with prob p. */
export function binomialPmf(n: number, k: number, p = 0.5): number {
  return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/**
 * Galton board: fraction of balls expected to land in the central bins.
 * A board with `rows` rows produces rows+1 bins (k = 0..rows). `centerBins`
 * counts how many of the middle bins to include.
 */
export function galtonCenterFraction(rows: number, centerBins = 2): number {
  const totalBins = rows + 1;
  const start = Math.floor((totalBins - centerBins) / 2);
  let sum = 0;
  for (let k = start; k < start + centerBins; k++) {
    sum += binomialPmf(rows, k, 0.5);
  }
  return sum;
}

/** Long-run frequency of a fair process — the value a coin frequency converges to. */
export function longRunFrequency(p = 0.5): number {
  return p;
}

/** Exact distribution of the sum of two fair six-sided dice (sums 2..12). */
export function diceSumDistribution(): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const sum = a + b;
      dist[sum] = (dist[sum] ?? 0) + 1;
    }
  }
  for (const key of Object.keys(dist)) {
    dist[Number(key)] /= 36;
  }
  return dist;
}

/** Probability of the single most likely two-dice sum (7, at 6/36). */
export function mostLikelyDiceSumProbability(): number {
  return 6 / 36;
}

/** |guess - answer| <= tolerance. The one correctness check used everywhere. */
export function isCorrect(guess: number, answer: number, tolerance: number): boolean {
  return Math.abs(guess - answer) <= tolerance + 1e-9;
}

/** Expected value of one spin of a weighted wheel. */
export interface WheelSegment {
  value: number;
  p: number;
}
export function expectedValue(segments: WheelSegment[]): number {
  return segments.reduce((sum, s) => sum + s.value * s.p, 0);
}

/** Monty Hall: probability of winning if you always switch (n doors, host opens all but one goat). */
export function montyHallSwitchWin(doors = 3): number {
  return (doors - 1) / doors;
}

/**
 * Probability that a single draw from a `deckSize`-card deck is one of the
 * `matches` qualifying cards (e.g. 4 aces in 52, or 3 aces in a 51-card deck after
 * one was removed). The atomic card probability the conditional lesson and final
 * test build on, so no card answer is ever hand-typed.
 */
export function drawProbability(matches: number, deckSize = 52): number {
  return matches / deckSize;
}

/**
 * Probability of drawing a qualifying card `draws` times in a row WITHOUT
 * replacement, starting from `matches` qualifiers in a `deckSize` deck. Each draw
 * removes one qualifier and one card, so the chance chains:
 * (matches/deckSize)·((matches−1)/(deckSize−1))·…  e.g. two aces = (4/52)(3/51).
 */
export function drawMatchesNoReplacement(matches: number, deckSize = 52, draws = 2): number {
  let p = 1;
  for (let i = 0; i < draws; i++) p *= (matches - i) / (deckSize - i);
  return p;
}

/**
 * Order a set of two-dice sums from most to least likely (ties broken by the
 * smaller sum). Powers the drag-to-rank dice problem; the correct ranking is
 * computed, never hand-typed.
 */
export function sumsByLikelihood(sums: number[]): number[] {
  const dist = diceSumDistribution();
  return [...sums].sort((a, b) => (dist[b] ?? 0) - (dist[a] ?? 0) || a - b);
}

/**
 * Expected (signed) displacement of an n-step ±1 random walk where each step is
 * +1 with probability p. Equals n·(2p − 1); for a fair walk this is 0.
 */
export function randomWalkDrift(n: number, p = 0.5): number {
  return n * (2 * p - 1);
}

/**
 * Typical distance from the start after n steps — the standard deviation of the
 * walk's position. Each ±1 step has variance 4p(1−p), so after n steps the SD is
 * 2·√(p(1−p)·n). For a fair walk this reduces to the famous √n.
 */
export function randomWalkRMS(n: number, p = 0.5): number {
  return 2 * Math.sqrt(p * (1 - p) * n);
}

/** Mean of one fair six-sided die: (1+…+6)/6 = 3.5. */
export function dieMean(): number {
  return 3.5;
}

/** Variance of one fair six-sided die: E[X²] − E[X]² = 91/6 − 3.5² = 35/12. */
function dieVariance(): number {
  return 35 / 12;
}

/** Standard deviation of one fair die ≈ 1.7078. */
export function dieSD(): number {
  return Math.sqrt(dieVariance());
}

/**
 * Standard error of the mean: the standard deviation of the average of m
 * independent draws from a population with standard deviation `sd`. The √m in
 * the denominator is the engine of the Central Limit Theorem's shrinking spread.
 */
export function standardError(sd: number, m: number): number {
  return sd / Math.sqrt(m);
}

/**
 * Rank a set of numeric item ids by a score (descending by default), ties broken
 * by the smaller id. Used by the drag-to-rank problems so the correct ordering is
 * computed from the score, never hand-typed.
 */
export function rankBy(
  items: number[],
  score: (item: number) => number,
  dir: 'asc' | 'desc' = 'desc',
): number[] {
  return [...items].sort((a, b) => (dir === 'desc' ? score(b) - score(a) : score(a) - score(b)) || a - b);
}

/** Exact pmf of the sum of `m` fair six-sided dice, as a { sum -> probability } map. */
function diceSumPmf(m: number): Map<number, number> {
  let dist = new Map<number, number>();
  for (let f = 1; f <= 6; f++) dist.set(f, 1 / 6);
  for (let i = 1; i < m; i++) {
    const next = new Map<number, number>();
    for (const [s, ps] of dist) {
      for (let f = 1; f <= 6; f++) next.set(s + f, (next.get(s + f) ?? 0) + ps / 6);
    }
    dist = next;
  }
  return dist;
}

/**
 * Bin (value, probability) pairs into `bins` equal buckets over [lo, hi] and
 * normalize. Returns bar centers (for labels) and the normalized shape (sums to 1),
 * ready to feed a draw-the-distribution problem.
 */
function binDistribution(
  pairs: Array<[number, number]>,
  lo: number,
  hi: number,
  bins: number,
  decimals = 1,
): { categories: number[]; shape: number[] } {
  const width = (hi - lo) / bins;
  const probs = new Array(bins).fill(0);
  for (const [x, p] of pairs) {
    let idx = Math.floor((x - lo) / width);
    idx = Math.max(0, Math.min(bins - 1, idx));
    probs[idx] += p;
  }
  const total = probs.reduce((a, b) => a + b, 0) || 1;
  const shape = probs.map((v) => v / total);
  const f = Math.pow(10, decimals);
  const categories = Array.from({ length: bins }, (_, i) => Math.round((lo + width * (i + 0.5)) * f) / f);
  return { categories, shape };
}

/** Distribution of the mean of `m` fair dice, binned over [1, 6] (a bell by the CLT). */
export function diceSampleMeanDistribution(m: number, bins = 10): { categories: number[]; shape: number[] } {
  const pairs: Array<[number, number]> = [];
  for (const [s, p] of diceSumPmf(m)) pairs.push([s / m, p]);
  return binDistribution(pairs, 1, 6, bins, 1);
}

/** Distribution of an n-step ±1 walk's end position, binned around its drift (a bell). */
export function randomWalkEndDistribution(
  n: number,
  p = 0.5,
  bins = 11,
): { categories: number[]; shape: number[] } {
  const sd = randomWalkRMS(n, p);
  const drift = randomWalkDrift(n, p);
  const pairs: Array<[number, number]> = [];
  for (let k = 0; k <= n; k++) pairs.push([2 * k - n, binomialPmf(n, k, p)]);
  return binDistribution(pairs, drift - 3 * sd - 1, drift + 3 * sd + 1, bins, 0);
}

// ---------------------------------------------------------------------------
// Section 1 — Foundations & sample space
// ---------------------------------------------------------------------------

/** The four disjoint regions of a two-event Venn diagram, as outcome counts. */
export interface VennCounts {
  aOnly: number;
  bOnly: number;
  both: number;
  neither: number;
}

export type VennRegion = 'a' | 'b' | 'and' | 'or' | 'aOnly' | 'bOnly' | 'notA' | 'neither';

/** Canonical region order, shared by the Venn sim's numeric `region` config. */
export const VENN_REGION_ORDER: VennRegion[] = [
  'a',
  'b',
  'and',
  'or',
  'aOnly',
  'bOnly',
  'notA',
  'neither',
];

function vennTotal(v: VennCounts): number {
  return v.aOnly + v.bOnly + v.both + v.neither;
}

/** Number of equally-likely outcomes in a Venn region. */
function vennRegionCount(v: VennCounts, region: VennRegion): number {
  switch (region) {
    case 'a':
      return v.aOnly + v.both;
    case 'b':
      return v.bOnly + v.both;
    case 'and':
      return v.both;
    case 'or':
      return v.aOnly + v.bOnly + v.both;
    case 'aOnly':
      return v.aOnly;
    case 'bOnly':
      return v.bOnly;
    case 'notA':
      return v.bOnly + v.neither;
    case 'neither':
      return v.neither;
  }
}

/** Probability of a Venn region under equally-likely outcomes (count / total). */
export function vennProb(v: VennCounts, region: VennRegion): number {
  const total = vennTotal(v);
  return total === 0 ? 0 : vennRegionCount(v, region) / total;
}

/** Addition rule: P(A ∪ B) = P(A) + P(B) − P(A ∩ B). */
export function additionRule(pA: number, pB: number, pAnd: number): number {
  return pA + pB - pAnd;
}

/**
 * Three-set inclusion–exclusion for |A ∪ B ∪ C| (works for counts or probabilities):
 * a + b + c − ab − ac − bc + abc.
 */
export function inclusionExclusion3(
  a: number,
  b: number,
  c: number,
  ab: number,
  ac: number,
  bc: number,
  abc: number,
): number {
  return a + b + c - ab - ac - bc + abc;
}

// ---------------------------------------------------------------------------
// Section 2 — Combinatorics (counting)
// ---------------------------------------------------------------------------

/** Product of a list of choice-counts — the multiplication principle. */
export function countProduct(choices: number[]): number {
  return choices.reduce((a, b) => a * b, 1);
}

/** n! (exact for the small n used in lessons). */
function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Ordered arrangements: nPr = n! / (n − r)!. */
export function permutations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let result = 1;
  for (let i = 0; i < r; i++) result *= n - i;
  return result;
}

/** Unordered selections: n choose k. */
export function combinations(n: number, k: number): number {
  return choose(n, k);
}

/** Distinct arrangements of a multiset: (Σ counts)! / Π (countᵢ!). */
export function multinomialArrangements(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  let r = factorial(total);
  for (const c of counts) r /= factorial(c);
  return r;
}

/**
 * Stars and bars: number of nonnegative integer solutions to x₁+…+x_k = n,
 * i.e. ways to drop n identical items into k distinct boxes = C(n+k−1, k−1).
 */
export function starsAndBars(n: number, k: number): number {
  return combinations(n + k - 1, k - 1);
}

/**
 * Probability that a random permutation of n items has NO fixed point (a
 * derangement): Σ_{i=0}^{n} (−1)^i / i!, which tends to 1/e.
 */
export function derangementProbability(n: number): number {
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += (i % 2 === 0 ? 1 : -1) / factorial(i);
  return sum;
}

/**
 * Expected number of fixed points when n items are returned at random. Each item
 * is matched with probability 1/n, and by linearity the expected count is exactly
 * 1 for every n ≥ 1.
 */
export function expectedFixedPoints(n: number): number {
  return n >= 1 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Section 3 — Conditional probability & independence
// ---------------------------------------------------------------------------

/** A branch of a partition: its probability `weight` and the conditional `p` of the event. */
export interface Branch {
  weight: number;
  p: number;
}

/**
 * Law of total probability: P(E) = Σ P(branch) · P(E | branch). Weights are
 * normalized in case they are given as raw counts.
 */
export function totalProbability(branches: Branch[]): number {
  const w = branches.reduce((a, b) => a + b.weight, 0) || 1;
  return branches.reduce((acc, b) => acc + (b.weight / w) * b.p, 0);
}

/**
 * Bayes' theorem for a binary test: posterior probability of the condition given
 * a positive result, from the prior (base rate), sensitivity P(+|D) and
 * specificity P(−|¬D).
 */
export function bayesPosterior(prior: number, sensitivity: number, specificity: number): number {
  const tp = prior * sensitivity;
  const fp = (1 - prior) * (1 - specificity);
  return tp + fp === 0 ? 0 : tp / (tp + fp);
}

// ---------------------------------------------------------------------------
// Section 4 — Random variables & expectation
// ---------------------------------------------------------------------------

/** Variance of a discrete distribution given as (value, probability) pairs: E[X²] − E[X]². */
export function variance(segments: WheelSegment[]): number {
  const mean = segments.reduce((s, x) => s + x.value * x.p, 0);
  const ex2 = segments.reduce((s, x) => s + x.value * x.value * x.p, 0);
  return ex2 - mean * mean;
}

/** Standard deviation of a discrete distribution. */
export function stddev(segments: WheelSegment[]): number {
  return Math.sqrt(variance(segments));
}

/** Expected number of trials to the first success of a probability-p event: 1/p. */
export function expectedTrialsGeometric(p: number): number {
  return p > 0 ? 1 / p : Infinity;
}

/** Expected rolls of a fair `faces`-sided die until a specific face appears: `faces`. */
export function expectedRollsUntilFace(faces: number): number {
  return faces;
}

/**
 * Expected rolls of a fair `faces`-sided die until `run` copies of a specific face
 * appear in a row: faces + faces² + … + faces^run (first-step recursion).
 */
export function expectedConsecutive(faces: number, run: number): number {
  let sum = 0;
  for (let i = 1; i <= run; i++) sum += Math.pow(faces, i);
  return sum;
}

/**
 * Expected value of a sum of indicator variables = the sum of their event
 * probabilities (linearity of expectation, true even when they are dependent).
 */
export function expectedIndicatorSum(probs: number[]): number {
  return probs.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Section 5 — Named distributions
// ---------------------------------------------------------------------------

/** Geometric PMF: probability the first success is on trial k (k ≥ 1). */
export function geometricPmf(k: number, p: number): number {
  return k < 1 ? 0 : Math.pow(1 - p, k - 1) * p;
}

/** Geometric mean: expected trials to the first success = 1/p. */
export function geometricMean(p: number): number {
  return p > 0 ? 1 / p : Infinity;
}

/** Geometric tail: probability the first success takes more than k trials = (1−p)^k. */
export function geometricTail(k: number, p: number): number {
  return Math.pow(1 - p, k);
}

/** Poisson PMF: probability of exactly k events when the mean rate is λ. */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Poisson mean: the expected number of events per interval equals the rate λ. */
export function poissonMean(lambda: number): number {
  return lambda;
}

/**
 * Hypergeometric PMF: probability of exactly k successes when drawing n items
 * without replacement from a population of N with K successes.
 */
export function hypergeometricPmf(N: number, K: number, n: number, k: number): number {
  return (combinations(K, k) * combinations(N - K, n - k)) / combinations(N, n);
}

/** Fraction of a whole occupied by a part — a length/area/measure ratio. */
export function measureRatio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

/** Mean of a continuous uniform on [a, b]: the midpoint (a + b) / 2. */
export function uniformMean(a: number, b: number): number {
  return (a + b) / 2;
}

// ---------------------------------------------------------------------------
// Section 6 — Limit theorems & approximation
// ---------------------------------------------------------------------------

/** Error function (Abramowitz & Stegun 7.1.26 approximation). */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Standard normal CDF Φ(z). */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Two-tailed standard-normal probability P(|Z| ≥ k). */
export function normalTwoTail(k: number): number {
  return 2 * (1 - normalCdf(k));
}

/** z-score: how many standard deviations x is from the mean. */
export function zScore(x: number, mu: number, sigma: number): number {
  return (x - mu) / sigma;
}

/** Chebyshev's bound on P(|X − μ| ≥ kσ): at most 1/k². */
export function chebyshevBound(k: number): number {
  return k > 0 ? 1 / (k * k) : 1;
}

/**
 * Normal approximation to a Binomial(n, p) CDF with continuity correction:
 * P(X ≤ k) ≈ Φ((k + 0.5 − np) / √(np(1−p))).
 */
export function normalApproxBinomialAtMost(n: number, p: number, k: number): number {
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return normalCdf((k + 0.5 - mu) / sd);
}

/** Normal approximation to P(a ≤ X ≤ b) for a Binomial(n, p), with continuity correction. */
export function normalApproxBinomialBetween(n: number, p: number, a: number, b: number): number {
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return normalCdf((b + 0.5 - mu) / sd) - normalCdf((a - 0.5 - mu) / sd);
}

// ---------------------------------------------------------------------------
// Section 7 — Stochastic processes
// ---------------------------------------------------------------------------

/**
 * Gambler's ruin: probability of reaching N before 0, starting at i, when each
 * step is +1 with probability p. Fair walks give i/N; biased walks use the ratio
 * r = (1−p)/p.
 */
export function reachTargetProbability(i: number, N: number, p: number): number {
  if (p === 0.5) return i / N;
  const r = (1 - p) / p;
  return (1 - Math.pow(r, i)) / (1 - Math.pow(r, N));
}

/** Probability of ruin (hitting 0 before N), starting at i with step-up prob p. */
export function ruinProbability(i: number, N: number, p: number): number {
  return 1 - reachTargetProbability(i, N, p);
}

/**
 * Stationary distribution of a Markov chain via power iteration: the long-run
 * fraction of time spent in each state. `P[i][j]` is the probability of moving
 * from state i to state j (rows sum to 1).
 */
export function markovStationary(P: number[][], iters = 2000): number[] {
  const n = P.length;
  let pi = new Array(n).fill(1 / n);
  for (let t = 0; t < iters; t++) {
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) next[j] += pi[i] * P[i][j];
    pi = next;
  }
  return pi;
}

/** Mean number of offspring for a branching process given its offspring PMF. */
export function offspringMean(probs: number[]): number {
  return probs.reduce((s, p, i) => s + i * p, 0);
}

/**
 * Extinction probability of a branching process: the smallest fixed point of the
 * offspring generating function, found by iterating q ← Σ pᵢ qⁱ from q = 0.
 */
export function extinctionProbability(probs: number[]): number {
  let q = 0;
  for (let t = 0; t < 1000; t++) {
    let nq = 0;
    for (let i = 0; i < probs.length; i++) nq += probs[i] * Math.pow(q, i);
    if (Math.abs(nq - q) < 1e-12) return nq;
    q = nq;
  }
  return q;
}

// ---------------------------------------------------------------------------
// Section 8 — Geometric & continuous probability
// ---------------------------------------------------------------------------

/** Buffon's needle: probability a length-L needle crosses lines spaced d apart (L ≤ d): 2L/(πd). */
export function buffonProbability(L: number, d: number): number {
  return (2 * L) / (Math.PI * d);
}

/** Mean of the r-th order statistic of n iid Uniform(0,1) draws: r/(n+1). */
export function uniformOrderMean(n: number, r: number): number {
  return r / (n + 1);
}

/** Expected distance between two independent Uniform(0,1) points: 1/3. */
export function expectedAbsDifferenceUniform(): number {
  return 1 / 3;
}

/** Probability three pieces of a randomly broken unit stick form a triangle: 1/4. */
export function brokenStickTriangleProbability(): number {
  return 0.25;
}

/**
 * Bertrand paradox: probability a "random" chord is longer than the inscribed
 * equilateral triangle's side, by method 0 (random endpoints) = 1/3, method 1
 * (random radius) = 1/2, method 2 (random midpoint) = 1/4.
 */
export function bertrandLongerThanSide(method: number): number {
  return [1 / 3, 1 / 2, 1 / 4][Math.max(0, Math.min(2, Math.round(method)))];
}

/** Pearson correlation of paired samples (used to verify the scatter sim). */
export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}
