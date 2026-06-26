import { makeHistogramSim } from './histogram';
import { geometricPmf, geometricMean } from '../lib/probability';

/**
 * Geometric distribution: trials until the first success. The histogram of waits
 * is a decaying geometric, and the running mean converges to 1/p.
 */
export default makeHistogramSim({
  meanLabel: 'mean trials to first success',
  runLabel: 'Run trials',
  height: 230,
  controls: [{ kind: 'range', key: 'p', label: 'Success prob p', min: 0.05, max: 0.95, step: 0.05 }],
  sampler: (config) => {
    const p = Math.max(0.01, Math.min(1, config.p ?? 0.5));
    return () => {
      let s = 1;
      while (Math.random() >= p) s++;
      return s;
    };
  },
  pmf: (config, k) => geometricPmf(k, Math.max(0.01, Math.min(1, config.p ?? 0.5))),
  mean: (config) => geometricMean(Math.max(0.01, Math.min(1, config.p ?? 0.5))),
  maxBin: (config) => Math.max(8, Math.round(6 / Math.max(0.05, config.p ?? 0.5))),
});
