import type { InteractionType, SimulationType } from '../../types/lesson';
import {
  binomialPmf, longRunFrequency, diceSumDistribution, montyHallSwitchWin, drawProbability,
  drawMatchesNoReplacement, expectedValue, totalProbability, bayesPosterior,
  geometricMean, geometricPmf, geometricTail, poissonPmf, poissonMean, randomWalkRMS, buffonProbability,
  galtonCenterFraction, randomWalkDrift, dieMean, dieSD, standardError,
  reachTargetProbability, ruinProbability, markovStationary, extinctionProbability,
  vennProb, additionRule, inclusionExclusion3, VENN_REGION_ORDER,
  countProduct, permutations, combinations,
  multinomialArrangements, starsAndBars, derangementProbability, expectedFixedPoints,
  stddev, expectedIndicatorSum,
  expectedRollsUntilFace, expectedTrialsGeometric, expectedConsecutive, pearson,
  hypergeometricPmf, measureRatio, uniformMean,
  bertrandLongerThanSide, uniformOrderMean, expectedAbsDifferenceUniform,
  brokenStickTriangleProbability,
  normalCdf, normalTwoTail, zScore, chebyshevBound,
  normalApproxBinomialAtMost, normalApproxBinomialBetween,
  type WheelSegment, type Branch,
} from '../../lib/probability';

interface KernelArgSpec {
  name: string;
  kind: 'int' | 'number' | 'prob' | 'enum';
  min?: number; max?: number; step?: number; values?: number[];
}

export interface Kernel {
  name: string;
  fn: (...args: number[]) => number;
  args: KernelArgSpec[];
  sectionIds: string[];
  interactions: InteractionType[];
  unit: 'fraction' | 'probability' | 'dollars' | 'count' | 'value' | 'distance' | 'position' | 'standard error';
  defaultTolerance: number;
  simulation?: SimulationType;
}

const dice = diceSumDistribution();

export const kernels: Record<string, Kernel> = {
  longRunFrequency: {
    name: 'longRunFrequency',
    fn: (p) => longRunFrequency(p),
    args: [{ name: 'p', kind: 'prob', min: 0.05, max: 0.95, step: 0.01 }],
    sectionIds: ['s1-foundations'],
    interactions: ['numeric', 'slider'],
    unit: 'fraction',
    defaultTolerance: 0.05,
    simulation: 'coinFlip',
  },
  vennProb: {
    name: 'vennProb',
    fn: (aOnly, bOnly, both, neither, regionIdx) =>
      vennProb({ aOnly, bOnly, both, neither }, VENN_REGION_ORDER[regionIdx]),
    args: [
      { name: 'aOnly', kind: 'int', min: 1, max: 20 },
      { name: 'bOnly', kind: 'int', min: 1, max: 20 },
      { name: 'both', kind: 'int', min: 0, max: 12 },
      { name: 'neither', kind: 'int', min: 0, max: 20 },
      { name: 'regionIdx', kind: 'enum', values: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
    sectionIds: ['s1-foundations'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.04,
    simulation: 'venn',
  },
  additionRule: {
    name: 'additionRule',
    fn: (pA, pB, pAnd) => additionRule(pA, pB, pAnd),
    args: [
      { name: 'pA', kind: 'prob', min: 0.05, max: 0.9, step: 0.01 },
      { name: 'pB', kind: 'prob', min: 0.05, max: 0.9, step: 0.01 },
      { name: 'pAnd', kind: 'prob', min: 0, max: 0.5, step: 0.01 },
    ],
    sectionIds: ['s1-foundations'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  inclusionExclusion3: {
    name: 'inclusionExclusion3',
    fn: (a, b, c, ab, ac, bc, abc) => inclusionExclusion3(a, b, c, ab, ac, bc, abc),
    args: [
      { name: 'a', kind: 'prob', min: 0.1, max: 0.6, step: 0.05 },
      { name: 'b', kind: 'prob', min: 0.1, max: 0.6, step: 0.05 },
      { name: 'c', kind: 'prob', min: 0.1, max: 0.6, step: 0.05 },
      { name: 'ab', kind: 'prob', min: 0, max: 0.3, step: 0.05 },
      { name: 'ac', kind: 'prob', min: 0, max: 0.3, step: 0.05 },
      { name: 'bc', kind: 'prob', min: 0, max: 0.3, step: 0.05 },
      { name: 'abc', kind: 'prob', min: 0, max: 0.2, step: 0.05 },
    ],
    sectionIds: ['s1-foundations'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  galtonCenter: {
    name: 'galtonCenter',
    fn: (rows, centerBins) => galtonCenterFraction(rows, centerBins),
    args: [
      { name: 'rows', kind: 'enum', values: [10, 12, 14, 16] },
      { name: 'centerBins', kind: 'enum', values: [2, 3, 4] },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric', 'slider'],
    unit: 'fraction',
    defaultTolerance: 0.05,
    simulation: 'galtonBoard',
  },
  galtonEdges: {
    name: 'galtonEdges',
    fn: (rows) => binomialPmf(rows, 0, 0.5) + binomialPmf(rows, rows, 0.5),
    args: [{ name: 'rows', kind: 'enum', values: [8, 10, 12, 14] }],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.02,
    simulation: 'galtonBoard',
  },
  montyStay: {
    name: 'montyStay',
    fn: (doors) => 1 / doors,
    args: [{ name: 'doors', kind: 'int', min: 3, max: 100 }],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'fraction',
    defaultTolerance: 0.03,
    simulation: 'montyHall',
  },
  randomWalkDrift: {
    name: 'randomWalkDrift',
    fn: (n, p) => randomWalkDrift(n, p),
    args: [
      { name: 'n', kind: 'enum', values: [50, 64, 100, 200, 256, 400] },
      { name: 'p', kind: 'prob', min: 0.3, max: 0.7, step: 0.05 },
    ],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric'],
    unit: 'position',
    defaultTolerance: 1,
    simulation: 'randomWalk',
  },
  dieMean: {
    name: 'dieMean',
    fn: () => dieMean(),
    args: [],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric', 'slider'],
    unit: 'value',
    defaultTolerance: 0.2,
    simulation: 'clt',
  },
  standardError: {
    name: 'standardError',
    fn: (m) => standardError(dieSD(), m),
    args: [{ name: 'm', kind: 'enum', values: [4, 9, 16, 25, 36, 40, 64] }],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric', 'slider'],
    unit: 'standard error',
    defaultTolerance: 0.04,
    simulation: 'clt',
  },
  binomialPmf: {
    name: 'binomialPmf',
    fn: (n, k, p) => binomialPmf(n, k, p),
    args: [
      { name: 'n', kind: 'int', min: 6, max: 20 },
      { name: 'k', kind: 'int', min: 0, max: 20 },
      { name: 'p', kind: 'prob', min: 0.3, max: 0.7, step: 0.05 },
    ],
    sectionIds: ['s5-distributions', 's1-foundations'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'galtonBoard',
  },
  diceSum: {
    name: 'diceSum',
    fn: (sum) => dice[sum] ?? 0,
    args: [{ name: 'sum', kind: 'int', min: 2, max: 12 }],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'diceRoll',
  },
  drawProbability: {
    name: 'drawProbability',
    fn: (matches, deck) => drawProbability(matches, deck),
    args: [
      { name: 'matches', kind: 'int', min: 1, max: 13 },
      { name: 'deck', kind: 'enum', values: [52, 51, 50] },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'conditional',
  },
  drawMatchesNoReplacement: {
    name: 'drawMatchesNoReplacement',
    fn: (matches, deck, draws) => drawMatchesNoReplacement(matches, deck, draws),
    args: [
      { name: 'matches', kind: 'int', min: 2, max: 13 },
      { name: 'deck', kind: 'enum', values: [52] },
      { name: 'draws', kind: 'int', min: 2, max: 3 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.004,
  },
  totalProbability2: {
    name: 'totalProbability2',
    fn: (w0, p0, w1, p1) => totalProbability([{ weight: w0, p: p0 } as Branch, { weight: w1, p: p1 } as Branch]),
    args: [
      { name: 'w0', kind: 'int', min: 1, max: 9 },
      { name: 'p0', kind: 'prob', min: 0.05, max: 0.95, step: 0.05 },
      { name: 'w1', kind: 'int', min: 1, max: 9 },
      { name: 'p1', kind: 'prob', min: 0.05, max: 0.95, step: 0.05 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  totalProbability3: {
    name: 'totalProbability3',
    fn: (w0, p0, w1, p1, w2, p2) =>
      totalProbability([
        { weight: w0, p: p0 } as Branch,
        { weight: w1, p: p1 } as Branch,
        { weight: w2, p: p2 } as Branch,
      ]),
    args: [
      { name: 'w0', kind: 'int', min: 1, max: 9 },
      { name: 'p0', kind: 'prob', min: 0, max: 1, step: 0.05 },
      { name: 'w1', kind: 'int', min: 1, max: 9 },
      { name: 'p1', kind: 'prob', min: 0, max: 1, step: 0.05 },
      { name: 'w2', kind: 'int', min: 1, max: 9 },
      { name: 'p2', kind: 'prob', min: 0, max: 1, step: 0.05 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.04,
    simulation: 'urnTree',
  },
  bayesPosterior: {
    name: 'bayesPosterior',
    fn: (prior, sens, spec) => bayesPosterior(prior, sens, spec),
    args: [
      { name: 'prior', kind: 'prob', min: 0.01, max: 0.2, step: 0.01 },
      { name: 'sens', kind: 'prob', min: 0.8, max: 0.99, step: 0.01 },
      { name: 'spec', kind: 'prob', min: 0.8, max: 0.99, step: 0.01 },
    ],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'bayesGrid',
  },
  montyHallSwitchWin: {
    name: 'montyHallSwitchWin',
    fn: (doors) => montyHallSwitchWin(doors),
    args: [{ name: 'doors', kind: 'int', min: 3, max: 100 }],
    sectionIds: ['s3-conditional'],
    interactions: ['numeric', 'slider'],
    unit: 'fraction',
    defaultTolerance: 0.03,
    simulation: 'montyHall',
  },
  geometricMean: {
    name: 'geometricMean',
    fn: (p) => geometricMean(p),
    args: [{ name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 }],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric', 'slider'],
    unit: 'value',
    defaultTolerance: 0.1,
    simulation: 'waitingTime',
  },
  geometricPmf: {
    name: 'geometricPmf',
    fn: (k, p) => geometricPmf(k, p),
    args: [
      { name: 'k', kind: 'int', min: 1, max: 8 },
      { name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'waitingTime',
  },
  geometricTail: {
    name: 'geometricTail',
    fn: (k, p) => geometricTail(k, p),
    args: [
      { name: 'k', kind: 'int', min: 1, max: 8 },
      { name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  poissonPmf: {
    name: 'poissonPmf',
    fn: (k, lambda) => poissonPmf(k, lambda),
    args: [
      { name: 'k', kind: 'int', min: 0, max: 8 },
      { name: 'lambda', kind: 'number', min: 1, max: 6, step: 0.5 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'poisson',
  },
  poissonMean: {
    name: 'poissonMean',
    fn: (lambda) => poissonMean(lambda),
    args: [{ name: 'lambda', kind: 'number', min: 1, max: 6, step: 0.5 }],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric', 'slider'],
    unit: 'value',
    defaultTolerance: 0.3,
    simulation: 'poisson',
  },
  hypergeometricPmf: {
    name: 'hypergeometricPmf',
    fn: (N, K, n, k) => hypergeometricPmf(N, K, n, k),
    args: [
      { name: 'N', kind: 'enum', values: [9, 12, 24, 25, 30, 40, 50] },
      { name: 'K', kind: 'enum', values: [4, 5, 6, 10] },
      { name: 'n', kind: 'enum', values: [2, 3, 5] },
      { name: 'k', kind: 'enum', values: [2, 1, 0] },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'hypergeometric',
  },
  measureRatio: {
    name: 'measureRatio',
    fn: (part, whole) => measureRatio(part, whole),
    args: [
      { name: 'part', kind: 'number', min: 0.05, max: 0.9, step: 0.05 },
      { name: 'whole', kind: 'number', min: 0.5, max: 1, step: 0.05 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.04,
    simulation: 'uniformLine',
  },
  uniformMean: {
    name: 'uniformMean',
    fn: (a, b) => uniformMean(a, b),
    args: [
      { name: 'a', kind: 'number', min: 0, max: 5, step: 1 },
      { name: 'b', kind: 'number', min: 6, max: 12, step: 1 },
    ],
    sectionIds: ['s5-distributions'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.2,
  },
  randomWalkRMS: {
    name: 'randomWalkRMS',
    fn: (n) => randomWalkRMS(n, 0.5),
    args: [{ name: 'n', kind: 'enum', values: [16, 25, 36, 64, 100, 256, 400] }],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric', 'slider'],
    unit: 'distance',
    defaultTolerance: 1,
    simulation: 'randomWalk',
  },
  // ---- s7 stochastic: gambler's ruin / Markov chains / branching processes ----
  reachTargetProbability: {
    name: 'reachTargetProbability',
    fn: (i, N, p) => reachTargetProbability(i, N, p),
    args: [
      { name: 'i', kind: 'int', min: 1, max: 40 },
      { name: 'N', kind: 'int', min: 2, max: 60 },
      { name: 'p', kind: 'prob', min: 0.4, max: 0.6, step: 0.01 },
    ],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.03,
  },
  ruinProbability: {
    name: 'ruinProbability',
    fn: (i, N, p) => ruinProbability(i, N, p),
    args: [
      { name: 'i', kind: 'int', min: 1, max: 40 },
      { name: 'N', kind: 'int', min: 2, max: 60 },
      { name: 'p', kind: 'prob', min: 0.4, max: 0.6, step: 0.01 },
    ],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.03,
  },
  markovStationary: {
    name: 'markovStationary',
    // Flat encoding: args = [n, ...rowMajorMatrix, which] so an n×n transition
    // matrix + the read-out state fits the numeric kernel shape. The Markov sim
    // animates the same chain (decoded from t{i}{j}) toward this stationary share.
    // The leading guard keeps the registry's empty-midpoint probe finite.
    fn: (...a) => {
      const n = a[0];
      if (!Number.isFinite(n) || n < 1) return 0;
      const P: number[][] = [];
      let idx = 1;
      for (let r = 0; r < n; r++) {
        P.push(a.slice(idx, idx + n));
        idx += n;
      }
      const which = a[idx] ?? 0;
      return markovStationary(P)[which] ?? 0;
    },
    args: [],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.04,
    simulation: 'markov',
  },
  extinctionProbability: {
    name: 'extinctionProbability',
    // Variadic over the offspring pmf p0, p1, …; the branching sim runs the same
    // pmf (decoded from p{i}) and its extinct fraction converges to this value.
    fn: (...probs) => extinctionProbability(probs),
    args: [],
    sectionIds: ['s7-stochastic'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.05,
    simulation: 'branching',
  },
  buffonProbability: {
    name: 'buffonProbability',
    fn: (L, d) => buffonProbability(L, d),
    args: [
      { name: 'L', kind: 'number', min: 0.2, max: 1, step: 0.1 },
      { name: 'd', kind: 'enum', values: [1] },
    ],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
    simulation: 'buffon',
  },
  bertrandLongerThanSide: {
    name: 'bertrandLongerThanSide',
    fn: (method) => bertrandLongerThanSide(method),
    args: [{ name: 'method', kind: 'enum', values: [0, 1, 2] }],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.04,
    simulation: 'randomChord',
  },
  uniformOrderMean: {
    name: 'uniformOrderMean',
    fn: (n, r) => uniformOrderMean(n, r),
    args: [
      { name: 'n', kind: 'int', min: 2, max: 12 },
      { name: 'r', kind: 'int', min: 1, max: 12 },
    ],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.03,
    simulation: 'orderStats',
  },
  expectedAbsDifferenceUniform: {
    name: 'expectedAbsDifferenceUniform',
    fn: () => expectedAbsDifferenceUniform(),
    args: [],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'distance',
    defaultTolerance: 0.03,
  },
  brokenStickTriangleProbability: {
    name: 'brokenStickTriangleProbability',
    fn: () => brokenStickTriangleProbability(),
    args: [],
    sectionIds: ['s8-geometric'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.03,
  },
  expectedValueWheel: {
    name: 'expectedValueWheel',
    fn: (...flat) => {
      const segs: WheelSegment[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) segs.push({ value: flat[i], p: flat[i + 1] });
      return expectedValue(segs);
    },
    args: [],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric', 'wheel'],
    unit: 'dollars',
    defaultTolerance: 0.5,
    simulation: 'expectedValue',
  },
  stddev: {
    name: 'stddev',
    fn: (...flat) => {
      const segs: WheelSegment[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) segs.push({ value: flat[i], p: flat[i + 1] });
      return stddev(segs);
    },
    args: [],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.2,
    simulation: 'expectedValue',
  },
  expectedIndicatorSum: {
    name: 'expectedIndicatorSum',
    fn: (...probs) => expectedIndicatorSum(probs),
    args: [],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.15,
  },
  expectedRollsUntilFace: {
    name: 'expectedRollsUntilFace',
    fn: (faces) => expectedRollsUntilFace(faces),
    args: [{ name: 'faces', kind: 'int', min: 2, max: 12 }],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.6,
    simulation: 'expectedSteps',
  },
  expectedTrialsGeometric: {
    name: 'expectedTrialsGeometric',
    fn: (p) => expectedTrialsGeometric(p),
    args: [{ name: 'p', kind: 'prob', min: 0.05, max: 0.95, step: 0.05 }],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.4,
    simulation: 'expectedSteps',
  },
  expectedConsecutive: {
    name: 'expectedConsecutive',
    fn: (faces, run) => expectedConsecutive(faces, run),
    args: [
      { name: 'faces', kind: 'int', min: 2, max: 12 },
      { name: 'run', kind: 'int', min: 1, max: 4 },
    ],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 4,
    simulation: 'expectedSteps',
  },
  pearson: {
    name: 'pearson',
    // Variadic flat encoding: args = [n, ...xs, ...ys] so a two-array stat fits the
    // numeric kernel shape. The bank stores a representative sample whose Pearson r
    // is the answer; the scatter sim animates a fresh cloud at the same target rho.
    fn: (...a) => {
      const n = a[0];
      return pearson(a.slice(1, 1 + n), a.slice(1 + n, 1 + 2 * n));
    },
    args: [],
    sectionIds: ['s4-expectation'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.18,
    simulation: 'scatter',
  },
  countProduct: {
    name: 'countProduct',
    fn: (...choices) => countProduct(choices),
    args: [],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'count',
    defaultTolerance: 1,
    simulation: 'countingTree',
  },
  permutations: {
    name: 'permutations',
    fn: (n, r) => permutations(n, r),
    args: [
      { name: 'n', kind: 'int', min: 2, max: 10 },
      { name: 'r', kind: 'int', min: 1, max: 10 },
    ],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'count',
    defaultTolerance: 1,
    simulation: 'arrangements',
  },
  combinations: {
    name: 'combinations',
    fn: (n, k) => combinations(n, k),
    args: [
      { name: 'n', kind: 'int', min: 2, max: 12 },
      { name: 'k', kind: 'int', min: 0, max: 12 },
    ],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'count',
    defaultTolerance: 1,
    simulation: 'pascal',
  },
  multinomialArrangements: {
    name: 'multinomialArrangements',
    fn: (...counts) => multinomialArrangements(counts),
    args: [],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'count',
    defaultTolerance: 1,
    simulation: 'arrangements',
  },
  starsAndBars: {
    name: 'starsAndBars',
    fn: (n, k) => starsAndBars(n, k),
    args: [
      { name: 'n', kind: 'int', min: 1, max: 14 },
      { name: 'k', kind: 'int', min: 2, max: 5 },
    ],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'count',
    defaultTolerance: 1,
    simulation: 'starsBars',
  },
  derangementProbability: {
    name: 'derangementProbability',
    fn: (n) => derangementProbability(n),
    args: [{ name: 'n', kind: 'int', min: 2, max: 10 }],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.05,
    simulation: 'matching',
  },
  expectedFixedPoints: {
    name: 'expectedFixedPoints',
    fn: (n) => expectedFixedPoints(n),
    args: [{ name: 'n', kind: 'int', min: 1, max: 10 }],
    sectionIds: ['s2-combinatorics'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.12,
    simulation: 'matching',
  },
  // ---- s6 limit theorems: empirical rule / z-scores ----
  normalWithin: {
    name: 'normalWithin',
    // Fraction of a normal within ±k SD of the mean (the empirical-rule band).
    fn: (k) => normalCdf(k) - normalCdf(-k),
    args: [{ name: 'k', kind: 'number', min: 0.5, max: 3, step: 0.5 }],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.03,
  },
  normalTwoTail: {
    name: 'normalTwoTail',
    fn: (k) => normalTwoTail(k),
    args: [{ name: 'k', kind: 'number', min: 1, max: 3.5, step: 0.5 }],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.02,
    simulation: 'tailBound',
  },
  zScore: {
    name: 'zScore',
    fn: (x, mu, sigma) => zScore(x, mu, sigma),
    args: [
      { name: 'x', kind: 'number', min: 0, max: 200 },
      { name: 'mu', kind: 'number', min: 0, max: 200 },
      { name: 'sigma', kind: 'number', min: 5, max: 25 },
    ],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'value',
    defaultTolerance: 0.05,
  },
  normalCdf: {
    name: 'normalCdf',
    fn: (z) => normalCdf(z),
    args: [{ name: 'z', kind: 'number', min: -4, max: 4, step: 0.1 }],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'fraction',
    defaultTolerance: 0.02,
  },
  // ---- s6 limit theorems: normal approximation to the binomial ----
  normalApproxBinomialAtMost: {
    name: 'normalApproxBinomialAtMost',
    fn: (n, p, k) => normalApproxBinomialAtMost(n, p, k),
    args: [
      { name: 'n', kind: 'int', min: 30, max: 1000 },
      { name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 },
      { name: 'k', kind: 'int', min: 0, max: 1000 },
    ],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.03,
  },
  normalApproxBinomialBetween: {
    name: 'normalApproxBinomialBetween',
    fn: (n, p, a, b) => normalApproxBinomialBetween(n, p, a, b),
    args: [
      { name: 'n', kind: 'int', min: 30, max: 1000 },
      { name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 },
      { name: 'a', kind: 'int', min: 0, max: 1000 },
      { name: 'b', kind: 'int', min: 0, max: 1000 },
    ],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.03,
  },
  normalApproxBinomialAtLeast: {
    name: 'normalApproxBinomialAtLeast',
    // P(X >= k) via the complement of the continuity-corrected at-most CDF.
    fn: (n, p, k) => 1 - normalApproxBinomialAtMost(n, p, k - 1),
    args: [
      { name: 'n', kind: 'int', min: 30, max: 1000 },
      { name: 'p', kind: 'prob', min: 0.1, max: 0.9, step: 0.05 },
      { name: 'k', kind: 'int', min: 0, max: 1000 },
    ],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
  // ---- s6 limit theorems: Chebyshev's inequality ----
  chebyshevBound: {
    name: 'chebyshevBound',
    fn: (k) => chebyshevBound(k),
    args: [{ name: 'k', kind: 'number', min: 1.5, max: 5, step: 0.5 }],
    sectionIds: ['s6-limit-theorems'],
    interactions: ['numeric'],
    unit: 'probability',
    defaultTolerance: 0.02,
  },
};
