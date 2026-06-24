/**
 * Owned probability functions. These are the single source of truth for every
 * gradable answer in the app. The simulations animate toward these values, and
 * in Phase 2 the same functions (not the model) will compute AI-templated answers.
 */

/** n choose k, computed multiplicatively to avoid overflow for the n we use. */
export function choose(n: number, k: number): number {
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

/** Probability that at least two people in a room of n share a birthday. */
export function birthdayProb(n: number): number {
  if (n < 2) return 0;
  let pNoMatch = 1;
  for (let i = 0; i < n; i++) pNoMatch *= (365 - i) / 365;
  return 1 - pNoMatch;
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
export function dieVariance(): number {
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
export function diceSumPmf(m: number): Map<number, number> {
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
