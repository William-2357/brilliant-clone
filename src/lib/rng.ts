/**
 * Tiny seeded PRNG (mulberry32) plus a few sampling helpers. A stored numeric
 * seed reproduces an identical sequence, which is how a lesson's generated
 * questions stay stable on resume yet re-roll when the lesson is replayed.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** A value stepped over [min, max] inclusive (e.g. range(0.2, 0.8, 0.05)). */
  range(min: number, max: number, step: number): number;
  /** Pick one element of a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash → 32-bit unsigned, used to derive a per-slot sub-seed. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: number): Rng {
  const r = mulberry32(seed >>> 0);
  return {
    next: () => r(),
    int: (min, max) => min + Math.floor(r() * (max - min + 1)),
    range: (min, max, step) => {
      const steps = Math.round((max - min) / step);
      return Math.round((min + step * Math.floor(r() * (steps + 1))) * 1e6) / 1e6;
    },
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
  };
}

/** Fresh random seed for a new attempt. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
