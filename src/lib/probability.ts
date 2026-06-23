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
