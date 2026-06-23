import { useCallback, useEffect, useState } from 'react';

const KEY = 'bb:unlockAll';
const EVENT = 'bb:unlockAll-change';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Persisted "free navigation" preference. When on, every built lesson is
 * accessible regardless of whether its prerequisites have been mastered.
 */
export function useUnlockAll(): [boolean, (value: boolean) => void] {
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
