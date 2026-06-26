import { useCallback, useEffect, useState } from 'react';

const KEY = 'bb:explainAI';
const EVENT = 'bb:explainAI-change';

function read(): boolean {
  try {
    // Default ON: when an AI endpoint/function is connected, wrong-answer feedback
    // is tailored by the model; otherwise it transparently uses the hand-written text.
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * Persisted "AI explanations" preference for lessons + the Problem of the Day. When
 * off (or when no AI backend is connected), the learner sees the author's
 * hand-written incorrect-answer feedback. Mirrors `useUnlockAll` / `useCoachAI`.
 */
export function useExplainAI(): [boolean, (value: boolean) => void] {
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
