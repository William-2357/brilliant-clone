import { expectedValue, type WheelSegment } from '../lib/probability';
import { cssVar } from '../simulations/canvasUtils';

/**
 * Prize wheels for Lesson 5 (Expected Value). A wheel is encoded into the flat
 * numeric `simConfig` (keys n, v0..vk, p0..pk) so the simulation and the
 * content's computed answers always describe the same wheel.
 */
export interface NamedWheelSegment extends WheelSegment {
  label: string;
}

/** Default wheel shown while exploring the concept. */
export const EV_WHEEL: NamedWheelSegment[] = [
  { value: 1, p: 0.5, label: '$1' },
  { value: 5, p: 0.3, label: '$5' },
  { value: 10, p: 0.2, label: '$10' },
];

/** Distinct but on-brand wheel segment colors (read from CSS tokens at paint time). */
export function segmentColor(i: number): string {
  const colors = [
    cssVar('--accent', '#0f9d8c'),
    cssVar('--accent-2', '#2e7df6'),
    cssVar('--good', '#16a34a'),
    cssVar('--warn', '#e0930a'),
    cssVar('--cyan', '#0284c7'),
    cssVar('--accent-strong', '#0b8576'),
  ];
  return colors[i % colors.length];
}

/** Encode a wheel into simConfig numbers. */
export function wheelConfig(segments: WheelSegment[]): Record<string, number> {
  const cfg: Record<string, number> = { n: segments.length };
  segments.forEach((s, i) => {
    cfg[`v${i}`] = s.value;
    cfg[`p${i}`] = s.p;
  });
  return cfg;
}

/** Decode a wheel back out of simConfig (falls back to the default wheel). */
export function readWheel(config: Record<string, number>): NamedWheelSegment[] {
  const n = config.n;
  if (!n) return EV_WHEEL;
  const segs: NamedWheelSegment[] = [];
  for (let i = 0; i < n; i++) {
    const value = config[`v${i}`] ?? 0;
    segs.push({ value, p: config[`p${i}`] ?? 0, label: `$${value}` });
  }
  return segs;
}

export function wheelEV(segments: WheelSegment[]): number {
  return expectedValue(segments);
}
