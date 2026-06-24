import { useCallback, useEffect, useState } from 'react';

const KEY = 'bb:simSpeed';
const EVENT = 'bb:simSpeed-change';
const DEFAULT = 1;
export const MIN_SPEED = 0.01;
export const MAX_SPEED = 3;

function clamp(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));
}

function read(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? clamp(parseFloat(raw)) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

// Module-level current value so simulation rAF loops can read it every frame
// (cheap, synchronous) and respond to slider changes in real time.
let current = read();

/** The live global animation-speed multiplier. Read this inside rAF loops. */
export function getSimSpeed(): number {
  return current;
}

export function setSimSpeed(v: number): void {
  current = clamp(v);
  try {
    localStorage.setItem(KEY, String(current));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Accumulator-based frame stepping. Adds `rawPerFrame · speed` to the carried
 * remainder and returns the whole number of items to process this frame. This
 * lets fractional speeds (< 1) slow a run smoothly while speeds (> 1) accelerate
 * it, without ever losing or duplicating work. Reset `accRef.current = 0` at the
 * start of each run.
 */
export function scaledStep(accRef: { current: number }, rawPerFrame: number): number {
  accRef.current += rawPerFrame * current;
  const n = Math.floor(accRef.current);
  accRef.current -= n;
  return n;
}

/** React binding for the speed control UI. */
export function useSimSpeed(): [number, (v: number) => void] {
  const [value, setValue] = useState<number>(current);
  useEffect(() => {
    const sync = () => {
      current = read();
      setValue(current);
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const set = useCallback((next: number) => setSimSpeed(next), []);
  return [value, set];
}
