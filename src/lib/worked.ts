/**
 * Worked-example derivation for the fading-scaffolding model (FR-11.4, revised).
 * A `WorkedExample` is a term-by-term breakdown of a computation. Each lesson's
 * lecture carries a fully worked *canonical* example (`canonicalWorked`), and the
 * first calculation problem of a fresh lesson becomes a *completion* (the learner's
 * own instance with the final line blanked, `deriveWorked` + `blankLast`).
 *
 * Both are derived from the SAME per-kernel formatters (`workedByKernel`), keyed by
 * the `probability.ts` kernel name. The breakdown's numbers are recomputed from
 * `probability.ts` here — never hand-typed and never read off a rounded line — so a
 * worked/completion value always agrees with the value the engine grades against.
 * `content/worked.coverage.test.ts` proves this for every kernel and every lesson.
 *
 * Formatters are keyed by the kernel *name string* (not by importing
 * `content/generated/kernels.ts`) so `lib/` never depends on `content/`; a test
 * cross-checks 1:1 coverage and numeric agreement against that registry.
 */
import type { LessonStep, SimulationType } from '../types/lesson';
import {
  expectedValue,
  variance,
  longRunFrequency,
  diceSumDistribution,
  binomialPmf,
  galtonCenterFraction,
  montyHallSwitchWin,
  drawProbability,
  randomWalkDrift,
  randomWalkRMS,
  dieMean,
  dieSD,
  standardError,
  vennProb,
  VENN_REGION_ORDER,
  additionRule,
  inclusionExclusion3,
  countProduct,
  permutations,
  combinations,
  multinomialArrangements,
  starsAndBars,
  derangementProbability,
  expectedFixedPoints,
  totalProbability,
  bayesPosterior,
  geometricMean,
  geometricPmf,
  geometricTail,
  poissonPmf,
  poissonMean,
  hypergeometricPmf,
  measureRatio,
  uniformMean,
  reachTargetProbability,
  ruinProbability,
  markovStationary,
  extinctionProbability,
  buffonProbability,
  bertrandLongerThanSide,
  uniformOrderMean,
  expectedAbsDifferenceUniform,
  brokenStickTriangleProbability,
  expectedTrialsGeometric,
  expectedRollsUntilFace,
  expectedConsecutive,
  expectedIndicatorSum,
  pearson,
  normalCdf,
  normalTwoTail,
  zScore,
  chebyshevBound,
  normalApproxBinomialAtMost,
  normalApproxBinomialBetween,
  type WheelSegment,
  type Branch,
} from './probability';

export interface WorkedLine {
  /** Left side of the line, e.g. "$5 × 0.40" (may contain $...$ inline math). */
  label: string;
  /** The line's value, e.g. "$2.00". Hidden when the line is blanked. */
  value: string;
}

export interface WorkedExample {
  /** Concrete scenario/question the example solves (set for the lecture study card). */
  question?: string;
  intro: string;
  lines: WorkedLine[];
  result: string;
  resultLabel: string;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const money = (x: number): string => `$${Number.isInteger(x) ? x.toFixed(0) : x.toFixed(2)}`;
const pct = (p: number): string => `${Math.round(p * 100)}%`;

/**
 * General-purpose number formatting for a worked line/result: integers verbatim,
 * a magnitude-aware number of decimals otherwise (kept tight enough that parsing
 * the string back round-trips to the true value within display tolerance).
 */
function num(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  if (Number.isInteger(x)) return String(x);
  const a = Math.abs(x);
  let s: string;
  if (a >= 100) s = x.toFixed(1);
  else if (a >= 1) s = x.toFixed(2);
  else if (a >= 0.001) s = x.toFixed(4);
  else s = x.toPrecision(2);
  if (s.includes('.') && !s.includes('e')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/** Local factorial (probability.ts keeps its own private one). */
function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Parse the numeric value back out of a formatted worked result (strips $, %,
 * commas, spaces). Exported so the coverage test reuses the exact same parser.
 */
export function parseWorkedResult(s: string): number {
  const m = s.replace(/[$,%\s]/g, '').match(/-?\d*\.?\d+(?:e-?\d+)?/i);
  return m ? Number(m[0]) : NaN;
}

/** A worked result agrees with a graded answer up to display rounding. */
function resultMatches(result: string, answer: number): boolean {
  const v = parseWorkedResult(result);
  if (!Number.isFinite(v)) return false;
  return Math.abs(v - answer) <= Math.max(5e-3, Math.abs(answer) * 0.03);
}

// ---------------------------------------------------------------------------
// Shape helpers — small constructors the per-kernel formatters delegate to.
// ---------------------------------------------------------------------------

const L = (label: string, value: string): WorkedLine => ({ label, value });

function make(
  intro: string,
  resultLabel: string,
  lines: WorkedLine[],
  resultValue: number,
  fmt: (x: number) => string = num,
): WorkedExample {
  return { intro, resultLabel, lines, result: fmt(resultValue) };
}

/** A single substituted line whose value is the result (ratios, closed forms, plug-ins). */
function plugIn(
  intro: string,
  resultLabel: string,
  label: string,
  value: number,
  fmt: (x: number) => string = num,
): WorkedExample {
  return make(intro, resultLabel, [L(label, fmt(value))], value, fmt);
}

/** Decode a flat [v0,p0,v1,p1,…] wheel into segments (mirrors the kernel encoding). */
function decodePairs(flat: number[]): WheelSegment[] {
  const segs: WheelSegment[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) segs.push({ value: flat[i], p: flat[i + 1] });
  return segs;
}

/** Expected value, worked term-by-term: each payout × its probability, summed. */
function evWorked(segs: WheelSegment[]): WorkedExample {
  return make(
    'Expected value weights each payout by its probability, then adds the pieces.',
    'Expected payout',
    segs.map((s) => L(`${money(s.value)} × ${s.p.toFixed(2)}`, money(s.value * s.p))),
    expectedValue(segs),
    money,
  );
}

/** A long-run count, worked: the rate times the number of trials. */
function longRunCountWorked(p: number, n: number): WorkedExample {
  const cnt = Math.round(p * n);
  return make(
    'A long-run count is the rate times the number of trials.',
    'Expected count',
    [L(`${pct(p)} of ${n}`, String(cnt))],
    cnt,
  );
}

// ---------------------------------------------------------------------------
// workedByKernel — one entry per kernel in content/generated/kernels.ts.
// Each computes its result from probability.ts so it agrees with the graded
// answer (the coverage test enforces both the 1:1 mapping and the agreement).
// ---------------------------------------------------------------------------

export const workedByKernel: Record<string, (args: number[]) => WorkedExample> = {
  // ---- s1 foundations ----
  longRunFrequency: ([p]) =>
    plugIn(
      'Each trial is independent with a fixed chance, so the long-run fraction equals that per-trial probability.',
      'Long-run fraction',
      'per-trial probability',
      longRunFrequency(p),
    ),
  vennProb: ([aOnly, bOnly, both, neither, regionIdx]) => {
    const region = VENN_REGION_ORDER[regionIdx] ?? VENN_REGION_ORDER[0];
    const total = aOnly + bOnly + both + neither;
    const value = vennProb({ aOnly, bOnly, both, neither }, region);
    const count = Math.round(value * total);
    return plugIn(
      'With equally likely outcomes, a region\u2019s probability is its share of the whole: favorable ÷ total.',
      'Probability',
      `${count} ÷ ${total}`,
      value,
    );
  },
  additionRule: ([pA, pB, pAnd]) =>
    make(
      'The addition rule adds the two events, then subtracts the overlap so it is not double-counted.',
      'P(A ∪ B)',
      [
        L('P(A)', num(pA)),
        L('plus P(B)', num(pB)),
        L('minus P(A ∩ B)', num(pAnd)),
      ],
      additionRule(pA, pB, pAnd),
    ),
  inclusionExclusion3: ([a, b, c, ab, ac, bc, abc]) =>
    make(
      'Inclusion–exclusion: add the singles, subtract the pairs, add back the triple.',
      'P(A ∪ B ∪ C)',
      [
        L('P(A)', num(a)),
        L('plus P(B)', num(b)),
        L('plus P(C)', num(c)),
        L('minus P(A ∩ B)', num(ab)),
        L('minus P(A ∩ C)', num(ac)),
        L('minus P(B ∩ C)', num(bc)),
        L('plus P(A ∩ B ∩ C)', num(abc)),
      ],
      inclusionExclusion3(a, b, c, ab, ac, bc, abc),
    ),

  // ---- s2 combinatorics ----
  countProduct: (choices) =>
    make(
      'The multiplication principle: multiply the number of independent choices at each stage.',
      'Total ways',
      choices.map((c, i) => L(`stage ${i + 1}`, num(c))),
      countProduct(choices),
    ),
  permutations: ([n, r]) => {
    const factors: WorkedLine[] = [];
    for (let i = 0; i < r; i++) factors.push(L(`× ${n - i}`, num(n - i)));
    return make(
      'Ordered arrangements: multiply r descending factors starting from n.',
      'Arrangements',
      factors.length ? factors : [L('1', '1')],
      permutations(n, r),
    );
  },
  combinations: ([n, k]) =>
    plugIn(
      'Unordered selections: n choose k = n! ÷ (k! · (n−k)!).',
      'Combinations',
      `C(${n}, ${k})`,
      combinations(n, k),
    ),
  multinomialArrangements: (counts) => {
    const total = counts.reduce((a, b) => a + b, 0);
    return plugIn(
      'Distinct arrangements of a multiset: the total factorial over the product of each group\u2019s factorial.',
      'Arrangements',
      `${total}! ÷ (${counts.map((c) => `${c}!`).join(' · ')})`,
      multinomialArrangements(counts),
    );
  },
  starsAndBars: ([n, k]) =>
    plugIn(
      'Stars and bars: ways to split n identical items into k groups = C(n+k−1, k−1).',
      'Ways',
      `C(${n + k - 1}, ${k - 1})`,
      starsAndBars(n, k),
    ),
  derangementProbability: ([n]) =>
    plugIn(
      'Derangements (no item in its place): the alternating series $\\sum_{i=0}^{n}\\frac{(-1)^i}{i!}$ tends to $1/e$.',
      'P(no fixed point)',
      `$\\sum_{i=0}^{${n}}\\frac{(-1)^i}{i!}$`,
      derangementProbability(n),
    ),
  expectedFixedPoints: ([n]) =>
    make(
      'By linearity each of the n items is fixed with chance 1/n, so the expected count is exactly 1.',
      'Expected fixed points',
      [L(`${n} × (1 ÷ ${n})`, num(expectedFixedPoints(n)))],
      expectedFixedPoints(n),
    ),

  // ---- s3 conditional ----
  diceSum: ([sum]) => {
    const dist = diceSumDistribution();
    const value = dist[sum] ?? 0;
    const ways = Math.round(value * 36);
    return plugIn(
      'Count the ordered pairs of two dice that make the sum, out of 36 equally likely outcomes.',
      'Probability',
      `${ways} ÷ 36`,
      value,
    );
  },
  drawProbability: ([matches, deck]) =>
    plugIn(
      'A single draw: the favorable cards over the deck size.',
      'Probability',
      `${matches} ÷ ${deck}`,
      drawProbability(matches, deck),
    ),
  drawMatchesNoReplacement: ([matches, deck, draws]) => {
    const lines: WorkedLine[] = [];
    let value = 1;
    for (let i = 0; i < draws; i++) {
      const f = (matches - i) / (deck - i);
      value *= f;
      lines.push(L(`${matches - i} ÷ ${deck - i}`, num(f)));
    }
    return make(
      'Without replacement, each draw shrinks both the favorable count and the deck; multiply the chained chances.',
      'Probability',
      lines,
      value,
    );
  },
  totalProbability2: ([w0, p0, w1, p1]) => {
    const W = w0 + w1 || 1;
    return make(
      'Total probability: weight each branch\u2019s chance by how often that branch occurs, then add.',
      'P(event)',
      [
        L(`(${w0}/${W}) × ${num(p0)}`, num((w0 / W) * p0)),
        L(`(${w1}/${W}) × ${num(p1)}`, num((w1 / W) * p1)),
      ],
      totalProbability([{ weight: w0, p: p0 } as Branch, { weight: w1, p: p1 } as Branch]),
    );
  },
  totalProbability3: ([w0, p0, w1, p1, w2, p2]) => {
    const W = w0 + w1 + w2 || 1;
    return make(
      'Total probability: weight each branch\u2019s chance by how often that branch occurs, then add.',
      'P(event)',
      [
        L(`(${w0}/${W}) × ${num(p0)}`, num((w0 / W) * p0)),
        L(`(${w1}/${W}) × ${num(p1)}`, num((w1 / W) * p1)),
        L(`(${w2}/${W}) × ${num(p2)}`, num((w2 / W) * p2)),
      ],
      totalProbability([
        { weight: w0, p: p0 } as Branch,
        { weight: w1, p: p1 } as Branch,
        { weight: w2, p: p2 } as Branch,
      ]),
    );
  },
  bayesPosterior: ([prior, sens, spec]) => {
    const tp = prior * sens;
    const fp = (1 - prior) * (1 - spec);
    return make(
      'Bayes\u2019 rule: the share of all positive tests that are true positives.',
      'P(condition | +)',
      [
        L('true positives: prior × sensitivity', num(tp)),
        L('false positives: (1−prior) × (1−specificity)', num(fp)),
        L(`${num(tp)} ÷ (${num(tp)} + ${num(fp)})`, num(bayesPosterior(prior, sens, spec))),
      ],
      bayesPosterior(prior, sens, spec),
    );
  },
  montyStay: ([doors]) =>
    plugIn(
      'Staying wins only when your first pick — 1 of the doors — was already right.',
      'Win chance (stay)',
      `1 ÷ ${doors}`,
      1 / doors,
    ),
  montyHallSwitchWin: ([doors]) =>
    plugIn(
      'Switching wins whenever your first pick — 1 of the doors — was wrong.',
      'Win chance (switch)',
      `(${doors} − 1) ÷ ${doors}`,
      montyHallSwitchWin(doors),
    ),

  // ---- s4 expectation ----
  expectedValueWheel: (flat) => evWorked(decodePairs(flat)),
  stddev: (flat) => {
    const segs = decodePairs(flat);
    const mean = segs.reduce((s, x) => s + x.value * x.p, 0);
    const v = variance(segs);
    return make(
      'Standard deviation is the square root of the variance, E[X²] minus the mean squared.',
      'Std. deviation',
      [
        L('mean μ', num(mean)),
        L('variance', num(v)),
        L('√variance', num(Math.sqrt(v))),
      ],
      Math.sqrt(v),
    );
  },
  expectedIndicatorSum: (probs) =>
    make(
      'Linearity of expectation: the expected count is just the sum of the individual event probabilities.',
      'Expected count',
      probs.map((p, i) => L(`p${i + 1}`, num(p))),
      expectedIndicatorSum(probs),
    ),
  expectedRollsUntilFace: ([faces]) =>
    plugIn(
      'A 1-in-n event takes on average n attempts to occur.',
      'Expected rolls',
      `1 ÷ (1 ÷ ${faces})`,
      expectedRollsUntilFace(faces),
    ),
  expectedTrialsGeometric: ([p]) =>
    plugIn(
      'Expected trials to the first success is one over the per-trial chance.',
      'Expected trials',
      `1 ÷ ${num(p)}`,
      expectedTrialsGeometric(p),
    ),
  expectedConsecutive: ([faces, run]) => {
    const lines: WorkedLine[] = [];
    for (let i = 1; i <= run; i++) lines.push(L(`$${faces}^{${i}}$`, num(Math.pow(faces, i))));
    return make(
      'Expected rolls for a run (first-step analysis): $f^1 + f^2 + \\dots + f^{r}$ for $f$ faces and a run of $r$.',
      'Expected rolls',
      lines,
      expectedConsecutive(faces, run),
    );
  },
  pearson: (a) => {
    const n = a[0];
    const xs = a.slice(1, 1 + n);
    const ys = a.slice(1 + n, 1 + 2 * n);
    return plugIn(
      'Pearson\u2019s r measures how tightly the paired points track a straight line (−1 to +1).',
      'Correlation r',
      'r (from the sample)',
      pearson(xs, ys),
    );
  },

  // ---- s5 distributions ----
  galtonCenter: ([rows, centerBins]) => {
    const start = Math.floor((rows + 1 - centerBins) / 2);
    const lines: WorkedLine[] = [];
    for (let k = start; k < start + centerBins; k++) {
      lines.push(L(`$\\binom{${rows}}{${k}}\\,(\\tfrac{1}{2})^{${rows}}$`, num(binomialPmf(rows, k, 0.5))));
    }
    return make(
      'The central fraction is the sum of the binomial probabilities for those middle bins.',
      'Central fraction',
      lines,
      galtonCenterFraction(rows, centerBins),
    );
  },
  galtonEdges: ([rows]) =>
    plugIn(
      'An outer bin needs the same bounce at every row, so its chance is $(\\tfrac{1}{2})^{n}$; double it for the two edges.',
      'Edge fraction',
      `$2\\times(\\tfrac{1}{2})^{${rows}}$`,
      binomialPmf(rows, 0, 0.5) + binomialPmf(rows, rows, 0.5),
    ),
  binomialPmf: ([n, k, p]) =>
    make(
      'A binomial term: the number of arrangements times the success and failure probabilities.',
      'Probability',
      [
        L(`$\\binom{${n}}{${k}}$`, num(combinations(n, k))),
        L(`$\\times ${num(p)}^{${k}}$`, num(Math.pow(p, k))),
        L(`$\\times ${num(1 - p)}^{${n - k}}$`, num(Math.pow(1 - p, n - k))),
      ],
      binomialPmf(n, k, p),
    ),
  geometricMean: ([p]) =>
    plugIn(
      'Expected trials to the first success is one over the per-trial chance.',
      'Expected trials',
      `1 ÷ ${num(p)}`,
      geometricMean(p),
    ),
  geometricPmf: ([k, p]) =>
    make(
      'First success on trial k: fail the first k−1 times, then succeed.',
      'Probability',
      [
        L(`$${num(1 - p)}^{${k - 1}}$`, num(Math.pow(1 - p, k - 1))),
        L(`$\\times ${num(p)}$`, num(p)),
      ],
      geometricPmf(k, p),
    ),
  geometricTail: ([k, p]) =>
    plugIn(
      'Taking more than k trials means the first k all fail.',
      'Probability',
      `$${num(1 - p)}^{${k}}$`,
      geometricTail(k, p),
    ),
  poissonPmf: ([k, lambda]) =>
    make(
      'A Poisson term: $e^{-\\lambda}\\,\\lambda^{k}/k!$.',
      'Probability',
      [
        L(`$e^{-${num(lambda)}}$`, num(Math.exp(-lambda))),
        L(`$\\times ${num(lambda)}^{${k}}$`, num(Math.pow(lambda, k))),
        L(`$\\div\\, ${k}!$`, num(factorial(k))),
      ],
      poissonPmf(k, lambda),
    ),
  poissonMean: ([lambda]) =>
    plugIn('The Poisson mean equals its rate λ.', 'Mean', 'λ', poissonMean(lambda)),
  hypergeometricPmf: ([N, K, n, k]) =>
    make(
      'Hypergeometric: favorable combinations over total combinations, drawing without replacement.',
      'Probability',
      [
        L(`C(${K},${k})`, num(combinations(K, k))),
        L(`× C(${N - K},${n - k})`, num(combinations(N - K, n - k))),
        L(`÷ C(${N},${n})`, num(combinations(N, n))),
      ],
      hypergeometricPmf(N, K, n, k),
    ),
  measureRatio: ([part, whole]) =>
    plugIn(
      'Geometric probability is the favorable measure over the whole measure.',
      'Probability',
      `${num(part)} ÷ ${num(whole)}`,
      measureRatio(part, whole),
    ),
  uniformMean: ([a, b]) =>
    plugIn(
      'The mean of a uniform spread is its midpoint.',
      'Mean',
      `(${num(a)} + ${num(b)}) ÷ 2`,
      uniformMean(a, b),
    ),

  // ---- s6 limit theorems ----
  dieMean: () =>
    plugIn(
      'Average the six equally likely faces of a fair die.',
      'Mean',
      '(1+2+3+4+5+6) ÷ 6',
      dieMean(),
    ),
  standardError: ([m]) => {
    const sd = dieSD();
    return plugIn(
      'The standard error is the population SD divided by the square root of the sample size.',
      'Standard error',
      `${num(sd)} ÷ √${m}`,
      standardError(sd, m),
    );
  },
  normalWithin: ([k]) =>
    make(
      'The empirical-rule band: the normal area within ±k standard deviations of the mean.',
      'Fraction within',
      [
        L(`Φ(${num(k)})`, num(normalCdf(k))),
        L(`minus Φ(−${num(k)})`, num(normalCdf(-k))),
      ],
      normalCdf(k) - normalCdf(-k),
    ),
  normalTwoTail: ([k]) =>
    make(
      'Two-tailed area: the chance a normal lands beyond ±k standard deviations.',
      'Tail probability',
      [
        L(`1 − Φ(${num(k)})`, num(1 - normalCdf(k))),
        L('× 2 (both tails)', num(normalTwoTail(k))),
      ],
      normalTwoTail(k),
    ),
  zScore: ([x, mu, sigma]) =>
    plugIn(
      'A z-score counts how many standard deviations a value sits from the mean.',
      'z-score',
      `(${num(x)} − ${num(mu)}) ÷ ${num(sigma)}`,
      zScore(x, mu, sigma),
    ),
  normalCdf: ([z]) =>
    plugIn(
      'The standard normal CDF Φ(z) is the area to the left of z.',
      'Φ(z)',
      `Φ(${num(z)})`,
      normalCdf(z),
    ),
  normalApproxBinomialAtMost: ([n, p, k]) => {
    const mu = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    const z = (k + 0.5 - mu) / sd;
    return make(
      'Normal approximation with a continuity correction: standardize, then read the normal CDF.',
      'P(X ≤ k)',
      [
        L('mean np', num(mu)),
        L('sd √(np(1−p))', num(sd)),
        L(`z = (${k}+0.5 − ${num(mu)}) ÷ ${num(sd)}`, num(z)),
        L('Φ(z)', num(normalCdf(z))),
      ],
      normalApproxBinomialAtMost(n, p, k),
    );
  },
  normalApproxBinomialBetween: ([n, p, a, b]) => {
    const mu = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    const zb = (b + 0.5 - mu) / sd;
    const za = (a - 0.5 - mu) / sd;
    return make(
      'Normal approximation: standardize both ends, then take the difference of the CDFs.',
      'P(a ≤ X ≤ b)',
      [
        L(`$\\Phi(z_b),\\ z_b=${num(zb)}$`, num(normalCdf(zb))),
        L(`$-\\,\\Phi(z_a),\\ z_a=${num(za)}$`, num(normalCdf(za))),
      ],
      normalApproxBinomialBetween(n, p, a, b),
    );
  },
  normalApproxBinomialAtLeast: ([n, p, k]) => {
    const atMost = normalApproxBinomialAtMost(n, p, k - 1);
    return make(
      'At least k is the complement of at most k−1.',
      'P(X ≥ k)',
      [
        L('P(X ≤ k−1)', num(atMost)),
        L('1 − P(X ≤ k−1)', num(1 - atMost)),
      ],
      1 - atMost,
    );
  },
  chebyshevBound: ([k]) =>
    plugIn(
      'Chebyshev\u2019s bound: at most 1/k² of any distribution lies beyond k standard deviations.',
      'Upper bound',
      `1 ÷ ${num(k)}²`,
      chebyshevBound(k),
    ),

  // ---- s7 stochastic ----
  randomWalkDrift: ([n, p]) => {
    const step = 2 * p - 1;
    return make(
      'Each step averages 2p − 1; by linearity the drift is that step-mean times the number of steps.',
      'Expected position',
      [
        L('average step (2p − 1)', num(step)),
        L(`× ${n} steps`, num(n * step)),
      ],
      randomWalkDrift(n, p),
    );
  },
  randomWalkRMS: ([n]) =>
    plugIn(
      'A fair walk\u2019s typical distance is the square root of the number of steps.',
      'Typical distance',
      `√${n}`,
      randomWalkRMS(n, 0.5),
    ),
  reachTargetProbability: ([i, N, p]) => {
    if (p === 0.5) {
      return plugIn(
        'Gambler\u2019s ruin (fair game): the chance of reaching the target before zero is i ÷ N.',
        'P(reach target)',
        `${i} ÷ ${N}`,
        reachTargetProbability(i, N, p),
      );
    }
    const r = (1 - p) / p;
    return make(
      'Gambler\u2019s ruin (biased game): with ratio $r=(1-p)/p$, the reach probability is $\\dfrac{1-r^{i}}{1-r^{N}}$.',
      'P(reach target)',
      [
        L(`$r=(1-p)/p$`, num(r)),
        L(`$\\dfrac{1-r^{${i}}}{1-r^{${N}}}$`, num(reachTargetProbability(i, N, p))),
      ],
      reachTargetProbability(i, N, p),
    );
  },
  ruinProbability: ([i, N, p]) => {
    const reach = reachTargetProbability(i, N, p);
    return make(
      'Ruin is the complement of reaching the target.',
      'P(ruin)',
      [
        L('P(reach target)', num(reach)),
        L('1 − P(reach target)', num(ruinProbability(i, N, p))),
      ],
      ruinProbability(i, N, p),
    );
  },
  markovStationary: (a) => {
    const n = a[0];
    const P: number[][] = [];
    let idx = 1;
    for (let r = 0; r < n; r++) {
      P.push(a.slice(idx, idx + n));
      idx += n;
    }
    const which = a[idx] ?? 0;
    return plugIn(
      'The stationary distribution is the long-run share of time in each state (solving πP = π).',
      'Stationary share',
      `stationary share of state ${which}`,
      markovStationary(P)[which] ?? 0,
    );
  },
  extinctionProbability: (probs) =>
    plugIn(
      'Extinction probability is the smallest solution of q = Σ pᵢ qⁱ (the offspring generating function).',
      'P(extinction)',
      'smallest fixed point of q = Σ pᵢ qⁱ',
      extinctionProbability(probs),
    ),

  // ---- s8 geometric ----
  buffonProbability: ([Lneedle, d]) =>
    plugIn(
      'Buffon\u2019s needle crosses a line with probability 2L ÷ (π·d).',
      'P(cross)',
      `2 × ${num(Lneedle)} ÷ (π × ${num(d)})`,
      buffonProbability(Lneedle, d),
    ),
  bertrandLongerThanSide: ([method]) =>
    plugIn(
      'Bertrand\u2019s paradox: the "random chord" chance depends on the method (1/3, 1/2, or 1/4).',
      'P(longer than side)',
      `method ${method}`,
      bertrandLongerThanSide(method),
    ),
  uniformOrderMean: ([n, r]) =>
    plugIn(
      'The r-th of n sorted uniform points sits on average at r ÷ (n+1).',
      'Mean position',
      `${r} ÷ (${n} + 1)`,
      uniformOrderMean(n, r),
    ),
  expectedAbsDifferenceUniform: () =>
    plugIn(
      'Two independent uniform points on a unit interval are on average 1/3 apart.',
      'Expected distance',
      '1 ÷ 3',
      expectedAbsDifferenceUniform(),
    ),
  brokenStickTriangleProbability: () =>
    plugIn(
      'A randomly broken stick forms a triangle exactly 1/4 of the time.',
      'Probability',
      '1 ÷ 4',
      brokenStickTriangleProbability(),
    ),
};

// ---------------------------------------------------------------------------
// Deriving from a concrete step (completion) and a concept sim (lecture).
// ---------------------------------------------------------------------------

/** Decode a prize wheel out of the flat numeric simConfig (mirrors simData.readWheel). */
function readWheelConfig(cfg: Record<string, number>): WheelSegment[] {
  const n = cfg.n ?? 0;
  const segs: WheelSegment[] = [];
  for (let i = 0; i < n; i++) {
    segs.push({ value: cfg[`v${i}`] ?? 0, p: cfg[`p${i}`] ?? 0 });
  }
  return segs;
}

/**
 * Reconstruct a worked breakdown from a problem's own data, for the *completion*
 * stage (the learner fills in the final, blanked line). Prefers the kernel + args
 * threaded onto the step; falls back to a couple of simConfig reconstructions for
 * older template/static steps that carry no kernel. Returns null when nothing
 * reconstructs cleanly, or when the reconstruction wouldn't match the graded
 * answer (a safety check — the worked result must agree with what the learner is
 * graded against).
 */
export function deriveWorked(step: LessonStep): WorkedExample | null {
  const interaction = step.interaction ?? 'numeric';
  if (interaction !== 'numeric' && interaction !== 'slider') return null;

  // Preferred path: the kernel + exact args threaded onto the step.
  if (step.kernel && workedByKernel[step.kernel]) {
    const w = workedByKernel[step.kernel](step.kernelArgs ?? []);
    if (step.answer == null || resultMatches(w.result, step.answer)) return w;
    return null;
  }

  // Fallbacks for steps without a kernel, reconstructed from simConfig.
  const cfg = step.simConfig ?? {};
  if (step.simulation === 'expectedValue' && step.unit === 'dollars' && cfg.spread === undefined && cfg.n) {
    const w = evWorked(readWheelConfig(cfg));
    if (step.answer == null || resultMatches(w.result, step.answer)) return w;
    return null;
  }
  if (step.simulation === 'coinFlip' && cfg.p != null) {
    if (step.unit === 'count' && cfg.flips != null) {
      const cnt = Math.round(cfg.p * cfg.flips);
      if (step.answer != null && Math.abs(cnt - step.answer) > 1) return null;
      return longRunCountWorked(cfg.p, cfg.flips);
    }
    if (step.unit === 'fraction' || step.unit === 'probability') {
      const w = workedByKernel.longRunFrequency([cfg.p]);
      if (step.answer == null || resultMatches(w.result, step.answer)) return w;
    }
  }
  return null;
}

/**
 * The representative kernel + fixed canonical args whose worked example mirrors a
 * lesson's concept (keyed by the concept step's simulation). This renders as a
 * fully worked study example inside the lecture. Filled for every concept sim used
 * by a built lesson; sims without an entry simply show no worked example.
 */
export const canonicalStudy: Partial<
  Record<SimulationType, { kernel: string; args: number[]; prompt: string }>
> = {
  // s1 foundations
  coinFlip: {
    kernel: 'longRunFrequency',
    args: [0.45],
    prompt: 'A biased coin lands heads 45% of the time. Over many flips, what fraction come up heads?',
  },
  venn: {
    kernel: 'vennProb',
    args: [8, 10, 6, 6, 0],
    prompt: 'In a class of 30, 14 students play an instrument. What is the probability a random student plays one?',
  },
  // s2 combinatorics
  countingTree: {
    kernel: 'countProduct',
    args: [3, 4],
    prompt: 'A diner offers 3 mains and 4 sides. How many different main-and-side meals are possible?',
  },
  arrangements: {
    kernel: 'permutations',
    args: [4, 4],
    prompt: 'In how many different orders can 4 distinct books sit on a shelf?',
  },
  pascal: {
    kernel: 'combinations',
    args: [6, 2],
    prompt: 'How many ways can you choose 2 toppings from a list of 6?',
  },
  starsBars: {
    kernel: 'starsAndBars',
    args: [5, 3],
    prompt: 'How many ways can 5 identical candies be shared among 3 children (some may get none)?',
  },
  matching: {
    kernel: 'expectedFixedPoints',
    args: [6],
    prompt: 'Six people get their hats back at random. On average, how many people get their own hat?',
  },
  // s3 conditional
  diceRoll: {
    kernel: 'diceSum',
    args: [7],
    prompt: 'Two fair six-sided dice are rolled. What is the probability their sum is 7?',
  },
  conditional: {
    kernel: 'drawProbability',
    args: [4, 52],
    prompt: 'One card is drawn from a standard 52-card deck. What is the probability it is an ace?',
  },
  urnTree: {
    kernel: 'totalProbability2',
    args: [1, 0.8, 1, 0.2],
    prompt: 'Two equally likely urns are 80% and 20% red. You pick an urn at random, then a ball. What is the chance it is red?',
  },
  bayesGrid: {
    kernel: 'bayesPosterior',
    args: [0.1, 0.9, 0.9],
    prompt: 'A disease affects 10% of people; a test is 90% sensitive and 90% specific. After a positive result, what is the probability of disease?',
  },
  montyHall: {
    kernel: 'montyHallSwitchWin',
    args: [3],
    prompt: 'In the 3-door Monty Hall game, what fraction of games do you win if you always switch?',
  },
  // s4 expectation
  expectedValue: {
    kernel: 'expectedValueWheel',
    // Worded without "$" — the lecture question is rendered through KaTeX inline-math
    // (`$...$`), so currency dollar signs would be mis-parsed as math delimiters.
    args: [5, 0.4, 10, 0.2, 0, 0.4],
    prompt: 'A prize wheel pays 5 dollars with probability 0.40, 10 dollars with probability 0.20, and nothing the rest of the time. What is the expected payout per spin?',
  },
  expectedSteps: {
    kernel: 'expectedRollsUntilFace',
    args: [6],
    prompt: 'On average, how many rolls of a fair six-sided die until a chosen face first appears?',
  },
  scatter: {
    kernel: 'pearson',
    args: [4, 1, 2, 3, 4, 2, 4, 6, 8],
    prompt: 'Four points lie exactly on a rising straight line. What is their correlation r?',
  },
  // s5 distributions
  galtonBoard: {
    kernel: 'galtonCenter',
    args: [12, 3],
    prompt: 'On a 12-row Galton board, what fraction of the balls land in the 3 central bins?',
  },
  waitingTime: {
    kernel: 'geometricPmf',
    args: [3, 0.5],
    prompt: 'A fair coin is flipped until the first heads. What is the probability the first heads is on the 3rd flip?',
  },
  poisson: {
    kernel: 'poissonPmf',
    args: [2, 3],
    prompt: 'Calls arrive at an average of 3 per minute (Poisson). What is the probability of exactly 2 calls in a minute?',
  },
  hypergeometric: {
    kernel: 'hypergeometricPmf',
    args: [52, 13, 5, 2],
    prompt: 'From a 52-card deck with 13 hearts, you draw 5 cards. What is the probability exactly 2 are hearts?',
  },
  uniformLine: {
    kernel: 'measureRatio',
    args: [0.3, 1],
    prompt: 'A point lands uniformly on a length-1 line. What is the probability it falls in a 0.3-long stretch?',
  },
  // s6 limit theorems
  clt: {
    kernel: 'standardError',
    args: [10],
    prompt: 'A fair die has standard deviation ≈ 1.71. What is the standard error of the average of 10 rolls?',
  },
  tailBound: {
    kernel: 'chebyshevBound',
    args: [2],
    prompt: 'By Chebyshev\u2019s inequality, at most what fraction of any distribution lies 2+ standard deviations from the mean?',
  },
  // s7 stochastic
  randomWalk: {
    kernel: 'randomWalkRMS',
    args: [100],
    prompt: 'After 100 fair ±1 steps, about how far from the start does a typical walk end up?',
  },
  markov: {
    kernel: 'markovStationary',
    args: [2, 0.9, 0.1, 0.2, 0.8, 0],
    prompt: 'A 2-state chain has transition rows [0.9, 0.1] and [0.2, 0.8]. What long-run fraction of time is spent in the first state?',
  },
  branching: {
    kernel: 'extinctionProbability',
    args: [0.25, 0.25, 0.5],
    prompt: 'Each individual has 0, 1, or 2 offspring with probabilities 0.25, 0.25, and 0.50. What is the probability the lineage dies out?',
  },
  // s8 geometric
  dartThrow: {
    kernel: 'measureRatio',
    args: [0.25, 1],
    prompt: 'A dart lands uniformly in a unit square. What is the probability it hits a region of area 0.25?',
  },
  buffon: {
    kernel: 'buffonProbability',
    args: [0.8, 1],
    prompt: 'A needle of length 0.8 is dropped on floorboards spaced 1 apart. What is the probability it crosses a line?',
  },
  randomChord: {
    kernel: 'bertrandLongerThanSide',
    args: [0],
    prompt: 'By the random-endpoints method, what is the probability a random chord is longer than the inscribed triangle\u2019s side?',
  },
  orderStats: {
    kernel: 'uniformOrderMean',
    args: [5, 5],
    prompt: 'Pick 5 random points on [0, 1]. On average, where does the largest one fall?',
  },
};

/**
 * A fully worked study example for a lesson's concept, derived from its canonical
 * kernel + args and labeled with a concrete scenario question. Rendered as
 * permanent lecture content on the concept step.
 */
export function canonicalWorked(simulation: SimulationType | undefined): WorkedExample | null {
  if (!simulation) return null;
  const c = canonicalStudy[simulation];
  if (!c || !workedByKernel[c.kernel]) return null;
  return { ...workedByKernel[c.kernel](c.args), question: c.prompt };
}
