import { makeHistogramSim } from './histogram';
import { poissonPmf } from '../lib/probability';

/** Knuth's algorithm for a single Poisson(λ) sample. */
function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Poisson distribution: counts of rare events per interval at mean rate λ. The
 * histogram of counts matches the Poisson PMF and the running mean converges to λ.
 */
export default makeHistogramSim({
  meanLabel: 'mean count per interval',
  runLabel: 'Run intervals',
  height: 230,
  controls: [{ kind: 'range', key: 'lambda', label: 'Rate λ', min: 0.5, max: 10, step: 0.5 }],
  sampler: (config) => {
    const lambda = Math.max(0.1, config.lambda ?? 3);
    return () => poissonSample(lambda);
  },
  pmf: (config, k) => poissonPmf(k, Math.max(0.1, config.lambda ?? 3)),
  mean: (config) => Math.max(0.1, config.lambda ?? 3),
  maxBin: (config) => {
    const lambda = Math.max(0.1, config.lambda ?? 3);
    return Math.max(6, Math.round(lambda + 4 * Math.sqrt(lambda)));
  },
});
