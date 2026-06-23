import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'bb:theme';
const EVENT = 'bb:theme-change';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Reflect the theme on <html> so CSS variables (and Canvas sims) pick it up. */
export function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Persisted light/dark preference. Setting it updates <html data-theme>, then
 * dispatches a resize so the Canvas simulations (which read CSS vars on paint)
 * repaint with the new palette.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const set = useCallback((next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
    setTheme(next);
    window.dispatchEvent(new Event(EVENT));
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, []);

  return [theme, set];
}
