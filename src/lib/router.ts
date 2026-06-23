import { useEffect, useState } from 'react';

/** Current path from the URL hash, e.g. "#/learn/l1" -> "/learn/l1". */
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function navigate(path: string): void {
  if (currentPath() === path) return;
  window.location.hash = path;
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

/** Match "/learn/:id" against the current path; returns params or null. */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const pSeg = pattern.split('/').filter(Boolean);
  const aSeg = path.split('/').filter(Boolean);
  if (pSeg.length !== aSeg.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSeg.length; i++) {
    if (pSeg[i].startsWith(':')) params[pSeg[i].slice(1)] = decodeURIComponent(aSeg[i]);
    else if (pSeg[i] !== aSeg[i]) return null;
  }
  return params;
}
