import { expectedValue, type WheelSegment } from '../lib/probability';

/**
 * Prize wheels for Lesson 5 (Expected Value). A wheel is encoded into the flat
 * numeric `simConfig` (keys n, v0..vk, p0..pk) so the simulation and the
 * content's computed answers always describe the same wheel.
 */
export interface NamedWheelSegment extends WheelSegment {
  label: string;
}

const PALETTE = ['#7b5cff', '#b14dff', '#ff4dd8', '#36e2ff', '#5cff9d', '#ffd24d'];

/** Default wheel shown while exploring the concept. */
export const EV_WHEEL: NamedWheelSegment[] = [
  { value: 1, p: 0.5, label: '$1' },
  { value: 5, p: 0.3, label: '$5' },
  { value: 10, p: 0.2, label: '$10' },
];

export function segmentColor(i: number): string {
  return PALETTE[i % PALETTE.length];
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
