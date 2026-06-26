import { makeHistogramSim } from './histogram';
import { hypergeometricPmf } from '../lib/probability';

/** One hypergeometric draw: take n from N (K successes) without replacement. */
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

/**
 * Hypergeometric distribution: successes when drawing without replacement. The
 * histogram of successes matches the hypergeometric PMF; set `readout: 1` and a
 * `targetK` to read out P(X = k), or leave it on the mean (n·K/N).
 */
export default makeHistogramSim({
  meanLabel: 'mean successes',
  runLabel: 'Run draws',
  height: 232,
  controls: [
    { kind: 'range', key: 'N', label: 'Population N', min: 4, max: 60 },
    { kind: 'range', key: 'K', label: 'Successes K', min: 1, max: 30 },
    { kind: 'range', key: 'n', label: 'Draws n', min: 1, max: 15 },
  ],
  clampParams: (p) => {
    const N = Math.max(1, Math.round(p.N));
    return { ...p, N, K: Math.min(Math.round(p.K), N), n: Math.min(Math.round(p.n), N) };
  },
  sampler: (config) => {
    const N = Math.max(1, Math.round(config.N ?? 52));
    const K = Math.max(0, Math.round(config.K ?? 4));
    const n = Math.max(1, Math.round(config.n ?? 2));
    return () => sampleHyper(N, K, n);
  },
  pmf: (config, k) =>
    hypergeometricPmf(
      Math.max(1, Math.round(config.N ?? 52)),
      Math.max(0, Math.round(config.K ?? 4)),
      Math.max(1, Math.round(config.n ?? 2)),
      k,
    ),
  mean: (config) => {
    const N = Math.max(1, Math.round(config.N ?? 52));
    const K = Math.max(0, Math.round(config.K ?? 4));
    const n = Math.max(1, Math.round(config.n ?? 2));
    return (n * K) / N;
  },
  maxBin: (config) =>
    Math.min(Math.max(1, Math.round(config.n ?? 2)), Math.max(0, Math.round(config.K ?? 4))),
});
