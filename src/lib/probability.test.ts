import { describe, it, expect } from 'vitest';
import {
  binomialPmf,
  diceSumDistribution,
  mostLikelyDiceSumProbability,
  montyHallSwitchWin,
  drawProbability,
  drawMatchesNoReplacement,
  randomWalkRMS,
  randomWalkDrift,
  standardError,
  dieMean,
  dieSD,
  expectedValue,
  vennProb,
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
  variance,
  stddev,
  expectedIndicatorSum,
  expectedTrialsGeometric,
  expectedConsecutive,
  pearson,
  geometricPmf,
  geometricMean,
  geometricTail,
  poissonPmf,
  hypergeometricPmf,
  measureRatio,
  normalCdf,
  normalTwoTail,
  zScore,
  chebyshevBound,
  normalApproxBinomialAtMost,
  reachTargetProbability,
  ruinProbability,
  markovStationary,
  extinctionProbability,
  offspringMean,
  buffonProbability,
  bertrandLongerThanSide,
  uniformOrderMean,
  expectedAbsDifferenceUniform,
  brokenStickTriangleProbability,
  type VennCounts,
} from './probability';

/**
 * Run `trials` independent samples of a 0/1 (or numeric) experiment and return the
 * mean. Used to cross-check that a closed-form answer agrees with simulation —
 * the same guarantee the in-app sims rely on. `seedlessRandom` keeps it simple;
 * tolerances are set generously so the check is about correctness, not luck.
 */
export function monteCarloMean(trials: number, sample: () => number): number {
  let total = 0;
  for (let i = 0; i < trials; i++) total += sample();
  return total / trials;
}

describe('binomialPmf', () => {
  it('matches hand-computed values', () => {
    expect(binomialPmf(2, 1, 0.5)).toBeCloseTo(0.5, 10);
    expect(binomialPmf(12, 6, 0.5)).toBeCloseTo(0.2255859375, 9);
  });
  it('sums to 1 across all k', () => {
    let s = 0;
    for (let k = 0; k <= 12; k++) s += binomialPmf(12, k, 0.5);
    expect(s).toBeCloseTo(1, 10);
  });
  it('agrees with Monte-Carlo (10 flips, exactly 5 heads)', () => {
    const exact = binomialPmf(10, 5, 0.5);
    const est = monteCarloMean(40000, () => {
      let h = 0;
      for (let i = 0; i < 10; i++) if (Math.random() < 0.5) h++;
      return h === 5 ? 1 : 0;
    });
    expect(Math.abs(est - exact)).toBeLessThan(0.02);
  });
});

describe('dice', () => {
  it('distribution peaks at 7 and sums to 1', () => {
    const d = diceSumDistribution();
    expect(d[7]).toBeCloseTo(6 / 36, 10);
    expect(d[2]).toBeCloseTo(1 / 36, 10);
    expect(mostLikelyDiceSumProbability()).toBeCloseTo(1 / 6, 10);
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('conditional draws', () => {
  it('single draw and chained draws', () => {
    expect(drawProbability(4, 52)).toBeCloseTo(1 / 13, 10);
    expect(drawMatchesNoReplacement(4, 52, 2)).toBeCloseTo((4 / 52) * (3 / 51), 10);
  });
});

describe('monty hall', () => {
  it('switch win rate is (n-1)/n', () => {
    expect(montyHallSwitchWin(3)).toBeCloseTo(2 / 3, 10);
    expect(montyHallSwitchWin(100)).toBeCloseTo(0.99, 10);
  });
});

describe('random walk + clt', () => {
  it('fair walk has zero drift and sqrt(n) spread', () => {
    expect(randomWalkDrift(100, 0.5)).toBeCloseTo(0, 10);
    expect(randomWalkRMS(100, 0.5)).toBeCloseTo(10, 10);
  });
  it('standard error shrinks like sqrt(m)', () => {
    expect(standardError(dieSD(), 10)).toBeCloseTo(dieSD() / Math.sqrt(10), 10);
    expect(dieMean()).toBeCloseTo(3.5, 10);
  });
});

describe('expected value', () => {
  it('weights outcomes by probability', () => {
    expect(
      expectedValue([
        { value: 1, p: 0.5 },
        { value: 5, p: 0.3 },
        { value: 10, p: 0.2 },
      ]),
    ).toBeCloseTo(4, 10);
  });
});

describe('foundations: venn + inclusion-exclusion', () => {
  const v: VennCounts = { aOnly: 8, bOnly: 10, both: 6, neither: 6 };
  it('reads venn regions correctly', () => {
    expect(vennProb(v, 'a')).toBeCloseTo(14 / 30, 10);
    expect(vennProb(v, 'and')).toBeCloseTo(6 / 30, 10);
    expect(vennProb(v, 'or')).toBeCloseTo(24 / 30, 10);
    expect(vennProb(v, 'notA')).toBeCloseTo(16 / 30, 10);
    expect(vennProb(v, 'aOnly')).toBeCloseTo(8 / 30, 10);
    expect(vennProb(v, 'neither')).toBeCloseTo(6 / 30, 10);
  });
  it('complement and De Morgan agree', () => {
    expect(vennProb(v, 'notA')).toBeCloseTo(1 - vennProb(v, 'a'), 10);
    expect(vennProb(v, 'neither')).toBeCloseTo(1 - vennProb(v, 'or'), 10);
  });
  it('addition rule recovers the intersection', () => {
    expect(additionRule(vennProb(v, 'a'), vennProb(v, 'b'), vennProb(v, 'or'))).toBeCloseTo(
      vennProb(v, 'and'),
      10,
    );
  });
  it('three-set inclusion-exclusion', () => {
    expect(inclusionExclusion3(0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05)).toBeCloseTo(0.8, 10);
  });
});

describe('combinatorics', () => {
  it('multiplication, permutations, combinations', () => {
    expect(countProduct([3, 4, 2])).toBe(24);
    expect(permutations(5, 3)).toBe(60);
    expect(permutations(7, 7)).toBe(5040);
    expect(combinations(5, 2)).toBe(10);
    expect(combinations(7, 5)).toBe(combinations(7, 2));
    expect(combinations(12, 5)).toBe(792);
  });
  it('multiset arrangements and stars-and-bars', () => {
    expect(multinomialArrangements([1, 2, 1])).toBe(12); // BOOK
    expect(multinomialArrangements([1, 4, 4, 2])).toBe(34650); // MISSISSIPPI
    expect(starsAndBars(5, 3)).toBe(21);
    expect(starsAndBars(8, 3)).toBe(45);
  });
  it('derangement probability matches the alternating sum and Monte-Carlo', () => {
    expect(derangementProbability(3)).toBeCloseTo(1 / 3, 10);
    expect(expectedFixedPoints(7)).toBe(1);
    const n = 6;
    const est = monteCarloMean(40000, () => {
      const a = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.every((v, i) => v !== i) ? 1 : 0;
    });
    expect(Math.abs(est - derangementProbability(n))).toBeLessThan(0.02);
  });
});

describe('conditional: total probability + bayes', () => {
  it('total probability weights branches (raw weights normalized)', () => {
    expect(
      totalProbability([
        { weight: 1, p: 0.8 },
        { weight: 1, p: 0.2 },
      ]),
    ).toBeCloseTo(0.5, 10);
    expect(
      totalProbability([
        { weight: 6, p: 0.02 },
        { weight: 4, p: 0.05 },
      ]),
    ).toBeCloseTo(0.032, 10);
  });
  it('bayes posterior and base-rate neglect', () => {
    expect(bayesPosterior(0.3, 0.9, 0.9)).toBeCloseTo(0.27 / 0.34, 10);
    expect(bayesPosterior(0.01, 0.9, 0.9)).toBeCloseTo(0.009 / 0.108, 10);
  });
  it('total probability agrees with a two-stage Monte-Carlo', () => {
    const est = monteCarloMean(60000, () => {
      const urn1 = Math.random() < 0.7;
      const p = urn1 ? 0.9 : 0.2;
      return Math.random() < p ? 1 : 0;
    });
    const exact = totalProbability([
      { weight: 7, p: 0.9 },
      { weight: 3, p: 0.2 },
    ]);
    expect(Math.abs(est - exact)).toBeLessThan(0.02);
  });
});

describe('random variables & expectation', () => {
  it('variance and standard deviation', () => {
    expect(
      variance([
        { value: 1, p: 0.5 },
        { value: 0, p: 0.5 },
      ]),
    ).toBeCloseTo(0.25, 10);
    expect(
      stddev([
        { value: 2, p: 0.5 },
        { value: 0, p: 0.5 },
      ]),
    ).toBeCloseTo(1, 10);
  });
  it('indicator sums and waiting times', () => {
    expect(expectedIndicatorSum(Array(12).fill(1 / 6))).toBeCloseTo(2, 10);
    expect(expectedIndicatorSum(Array(5).fill(0.5))).toBeCloseTo(2.5, 10);
    expect(expectedTrialsGeometric(0.25)).toBeCloseTo(4, 10);
    expect(expectedConsecutive(6, 2)).toBe(42);
  });
  it('expected first-head wait matches Monte-Carlo', () => {
    const est = monteCarloMean(40000, () => {
      let s = 0;
      do {
        s++;
      } while (Math.random() >= 0.5);
      return s;
    });
    expect(Math.abs(est - expectedTrialsGeometric(0.5))).toBeLessThan(0.05);
  });
  it('pearson correlation recovers a strong linear trend', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    expect(pearson(xs, ys)).toBeCloseTo(1, 10);
  });
});

describe('named distributions', () => {
  it('geometric pmf, mean, tail', () => {
    expect(geometricPmf(3, 0.5)).toBeCloseTo(0.125, 10);
    expect(geometricMean(0.2)).toBeCloseTo(5, 10);
    expect(geometricTail(4, 0.5)).toBeCloseTo(0.0625, 10);
    let s = 0;
    for (let k = 1; k <= 400; k++) s += geometricPmf(k, 0.2);
    expect(s).toBeCloseTo(1, 6);
  });
  it('poisson pmf sums to one and matches values', () => {
    expect(poissonPmf(0, 2)).toBeCloseTo(Math.exp(-2), 10);
    expect(poissonPmf(3, 3)).toBeCloseTo((Math.exp(-3) * 27) / 6, 10);
    let s = 0;
    for (let k = 0; k <= 60; k++) s += poissonPmf(k, 5);
    expect(s).toBeCloseTo(1, 8);
  });
  it('hypergeometric and measure ratio', () => {
    expect(hypergeometricPmf(52, 4, 2, 2)).toBeCloseTo(6 / 1326, 10);
    expect(hypergeometricPmf(10, 4, 3, 2)).toBeCloseTo(0.3, 10);
    expect(measureRatio(0.2, 0.6)).toBeCloseTo(1 / 3, 10);
  });
  it('geometric mean matches Monte-Carlo', () => {
    const est = monteCarloMean(40000, () => {
      let s = 1;
      while (Math.random() >= 0.3) s++;
      return s;
    });
    expect(Math.abs(est - geometricMean(0.3))).toBeLessThan(0.1);
  });
});

describe('limit theorems', () => {
  it('normal cdf and tails', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
    expect(normalCdf(1) - normalCdf(-1)).toBeCloseTo(0.6827, 3);
    expect(normalTwoTail(2)).toBeCloseTo(0.0455, 3);
    expect(normalTwoTail(3)).toBeCloseTo(0.0027, 3);
  });
  it('z-score, chebyshev, and normal approximation', () => {
    expect(zScore(85, 70, 10)).toBeCloseTo(1.5, 10);
    expect(chebyshevBound(2)).toBeCloseTo(0.25, 10);
    expect(chebyshevBound(3)).toBeCloseTo(1 / 9, 10);
    expect(normalApproxBinomialAtMost(100, 0.5, 45)).toBeCloseTo(normalCdf(-0.9), 6);
  });
});

describe('stochastic processes', () => {
  it('gamblers ruin', () => {
    expect(reachTargetProbability(5, 10, 0.5)).toBeCloseTo(0.5, 10);
    expect(ruinProbability(3, 10, 0.5)).toBeCloseTo(0.7, 10);
    expect(reachTargetProbability(1, 4, 0.5)).toBeCloseTo(0.25, 10);
  });
  it('markov stationary distribution', () => {
    const w = [
      [0.8, 0.2],
      [0.5, 0.5],
    ];
    const pi = markovStationary(w);
    expect(pi[0]).toBeCloseTo(0.5 / 0.7, 6);
    expect(pi[0] + pi[1]).toBeCloseTo(1, 8);
  });
  it('markov stationary matches a simulated walk', () => {
    const w = [
      [0.8, 0.2],
      [0.5, 0.5],
    ];
    let cur = 0;
    let visits0 = 0;
    const N = 200000;
    for (let t = 0; t < N; t++) {
      if (cur === 0) visits0++;
      cur = Math.random() < w[cur][0] ? 0 : 1;
    }
    expect(Math.abs(visits0 / N - markovStationary(w)[0])).toBeLessThan(0.02);
  });
  it('branching extinction probability', () => {
    expect(offspringMean([0.6, 0.4])).toBeCloseTo(0.4, 10);
    expect(extinctionProbability([0.6, 0.4])).toBeCloseTo(1, 6);
    expect(extinctionProbability([0.25, 0.25, 0.5])).toBeCloseTo(0.5, 6);
    expect(extinctionProbability([0.4, 0, 0.6])).toBeCloseTo(2 / 3, 6);
  });
});

describe('geometric probability', () => {
  it('buffon and bertrand', () => {
    expect(buffonProbability(1, 1)).toBeCloseTo(2 / Math.PI, 10);
    expect(buffonProbability(0.5, 1)).toBeCloseTo(1 / Math.PI, 10);
    expect(bertrandLongerThanSide(0)).toBeCloseTo(1 / 3, 10);
    expect(bertrandLongerThanSide(1)).toBeCloseTo(1 / 2, 10);
    expect(bertrandLongerThanSide(2)).toBeCloseTo(1 / 4, 10);
  });
  it('order statistics and distances', () => {
    expect(uniformOrderMean(5, 5)).toBeCloseTo(5 / 6, 10);
    expect(uniformOrderMean(5, 1)).toBeCloseTo(1 / 6, 10);
    expect(uniformOrderMean(10, 10)).toBeCloseTo(10 / 11, 10);
    expect(expectedAbsDifferenceUniform()).toBeCloseTo(1 / 3, 10);
    expect(brokenStickTriangleProbability()).toBeCloseTo(0.25, 10);
  });
  it('dart-throw circle area matches Monte-Carlo', () => {
    const est = monteCarloMean(60000, () => {
      const x = Math.random();
      const y = Math.random();
      return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.25 ? 1 : 0;
    });
    expect(Math.abs(est - Math.PI / 4)).toBeLessThan(0.02);
  });
});

describe('newly wired sims sample to their owned answers', () => {
  // Mirrors Hypergeometric.tsx: draw n from N (K successes) WITHOUT replacement,
  // counting successes. The histogram must converge to hypergeometricPmf and n·K/N.
  function sampleHyper(N: number, K: number, n: number): number {
    let successes = K;
    let total = N;
    let count = 0;
    for (let i = 0; i < n && total > 0; i++) {
      if (Math.random() < successes / total) {
        count++;
        successes--;
      }
      total--;
    }
    return count;
  }
  it('hypergeometric draw matches the pmf and the n·K/N mean', () => {
    const p2 = monteCarloMean(60000, () => (sampleHyper(10, 4, 3) === 2 ? 1 : 0));
    expect(Math.abs(p2 - hypergeometricPmf(10, 4, 3, 2))).toBeLessThan(0.02);
    const mean = monteCarloMean(60000, () => sampleHyper(20, 8, 5));
    expect(Math.abs(mean - (5 * 8) / 20)).toBeLessThan(0.05);
  });

  // Mirrors UniformLine.tsx: a uniform point on [0, 1]; the fraction landing in the
  // shaded region(s) converges to their total length (measureRatio).
  it('uniform-line fraction converges to the band length', () => {
    const band = monteCarloMean(60000, () => {
      const x = Math.random();
      return x >= 0.2 && x <= 0.5 ? 1 : 0; // mode 0, [0.2, 0.5] → length 0.3
    });
    expect(Math.abs(band - measureRatio(0.3, 1))).toBeLessThan(0.01);
    const ends = monteCarloMean(60000, () => {
      const x = Math.random();
      return x <= 0.25 || x >= 0.75 ? 1 : 0; // mode 1, two ends → length 0.5
    });
    expect(Math.abs(ends - 0.5)).toBeLessThan(0.01);
  });
});
