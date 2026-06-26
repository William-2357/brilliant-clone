import { useCallback, useEffect, useState } from 'react';

const KEY = 'bb:coachAI';
const EVENT = 'bb:coachAI-change';

function read(): boolean {
  try {
    // Default ON: when Functions are configured the learner gets the AI coach; in
    // local/offline mode it transparently falls back to the templated explanation.
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * Persisted "AI dealer-coach" preference for the Arcade. When off, the coach uses
 * only the deterministic templated explanation (proving the game and its coaching
 * work with AI fully disabled). Mirrors `useUnlockAll`'s storage + event pattern.
 */
export function useCoachAI(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(read);

  useEffect(() => {
    const sync = () => setValue(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    setValue(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [value, set];
}
