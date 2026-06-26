import type { Kernel } from '../../../src/content/generated/kernels';
import { samplers } from './samplers';

export interface McResult { agrees: boolean; skipped: boolean; estimate: number; expected: number; }

export function monteCarloAgrees(
  kernel: Kernel, args: number[], expected: number, tolerance: number, trials = 60000,
): McResult {
  const sampler = samplers[kernel.name];
  if (!sampler) return { agrees: true, skipped: true, estimate: NaN, expected };
  let total = 0;
  for (let i = 0; i < trials; i++) total += sampler(args);
  let estimate = total / trials;
  if (kernel.name === 'randomWalkRMS') estimate = Math.sqrt(estimate);
  const band = Math.max(2 * tolerance, 0.02 * Math.max(1, Math.abs(expected)));
  return { agrees: Math.abs(estimate - expected) <= band, skipped: false, estimate, expected };
}
