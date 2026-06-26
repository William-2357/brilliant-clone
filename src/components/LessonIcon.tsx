import type { ReactNode } from 'react';

interface IconDef {
  color: string;
  node: ReactNode;
}

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Per-lesson glyphs. Keyed by lesson id so the content model stays untouched. */
const ICONS: Record<string, IconDef> = {
  's1-set-algebra': {
    color: '#1d9e75',
    node: (
      <>
        <circle cx="9.5" cy="12" r="6.2" {...S} />
        <circle cx="14.5" cy="12" r="6.2" {...S} />
      </>
    ),
  },
  's1-addition-rule': {
    color: '#0f9d8c',
    node: (
      <>
        <circle cx="9" cy="10" r="5" {...S} />
        <circle cx="15" cy="14" r="5" {...S} />
        <path d="M4 18.5h4M6 16.5v4" {...S} />
      </>
    ),
  },
  's2-multiplication': {
    color: '#7c3aed',
    node: (
      <>
        <path d="M6 4v16" {...S} />
        <path d="M6 9h12M6 15h12" {...S} />
        <circle cx="18" cy="9" r="1.6" {...S} />
        <circle cx="18" cy="15" r="1.6" {...S} />
      </>
    ),
  },
  's2-permutations': {
    color: '#7c3aed',
    node: (
      <>
        <rect x="3" y="9" width="5.2" height="6.5" rx="1.3" {...S} />
        <rect x="9.4" y="9" width="5.2" height="6.5" rx="1.3" {...S} />
        <rect x="15.8" y="9" width="5.2" height="6.5" rx="1.3" {...S} />
      </>
    ),
  },
  's2-combinations': {
    color: '#7c3aed',
    node: (
      <>
        <path d="M12 4 L5 19 H19 Z" {...S} />
        <path d="M8.5 11.5h7" {...S} />
      </>
    ),
  },
  's2-anagrams': {
    color: '#8b5cf6',
    node: (
      <>
        <rect x="4" y="7" width="7" height="10" rx="1.6" {...S} />
        <rect x="13" y="7" width="7" height="10" rx="1.6" {...S} />
      </>
    ),
  },
  's2-stars-bars': {
    color: '#8b5cf6',
    node: (
      <>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <path d="M12.5 7v10" {...S} />
        <circle cx="16" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="20" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  's2-derangements': {
    color: '#8b5cf6',
    node: (
      <>
        <path d="M5 7 L19 17" {...S} />
        <path d="M19 7 L5 17" {...S} />
      </>
    ),
  },
  's3-total-probability': {
    color: '#2563eb',
    node: (
      <>
        <path d="M12 4v4M12 8l-6 5M12 8l6 5" {...S} />
        <circle cx="6" cy="15.5" r="2.4" {...S} />
        <circle cx="18" cy="15.5" r="2.4" {...S} />
      </>
    ),
  },
  's3-bayes': {
    color: '#2563eb',
    node: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.4" {...S} />
        <rect x="13" y="4" width="7" height="7" rx="1.4" {...S} />
        <rect x="4" y="13" width="7" height="7" rx="1.4" {...S} />
        <rect x="13" y="13" width="7" height="7" rx="1.4" {...S} />
      </>
    ),
  },
  's4-variance': {
    color: '#d97706',
    node: (
      <>
        <path d="M3 18 Q12 3 21 18" {...S} />
        <path d="M8 18h8" {...S} />
        <path d="M8 18v-2M16 18v-2" {...S} />
      </>
    ),
  },
  's4-indicators': {
    color: '#d97706',
    node: (
      <>
        <rect x="4" y="5" width="6" height="6" rx="1.4" {...S} />
        <path d="M5 8l1.4 1.4L9 7" {...S} />
        <path d="M13 8h7M13 16h7" {...S} />
        <rect x="4" y="13" width="6" height="6" rx="1.4" {...S} />
      </>
    ),
  },
  's4-first-step': {
    color: '#e0930a',
    node: (
      <>
        <circle cx="12" cy="12" r="8" {...S} />
        <path d="M12 7.5V12l3 2" {...S} />
      </>
    ),
  },
  's4-correlation': {
    color: '#e0930a',
    node: (
      <>
        <path d="M4 19 L20 6" {...S} />
        <circle cx="7" cy="16" r="1" fill="currentColor" stroke="none" />
        <circle cx="11" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="18" cy="8" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  's5-geometric': {
    color: '#0891b2',
    node: (
      <>
        <path d="M5 19V9" {...S} />
        <path d="M10 19V13" {...S} />
        <path d="M15 19V16" {...S} />
        <path d="M20 19V17.5" {...S} />
        <path d="M3 19h18" {...S} />
      </>
    ),
  },
  's5-poisson': {
    color: '#0891b2',
    node: (
      <>
        <path d="M4 19V15" {...S} />
        <path d="M9 19V8" {...S} />
        <path d="M14 19V11" {...S} />
        <path d="M19 19V16" {...S} />
        <path d="M3 19h18" {...S} />
      </>
    ),
  },
  's5-hypergeometric': {
    color: '#0e9bb8',
    node: (
      <>
        <path d="M6 5h12l-1.5 13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5Z" {...S} />
        <circle cx="10" cy="13" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="14" cy="15" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  's5-continuous-uniform': {
    color: '#0e9bb8',
    node: (
      <>
        <path d="M3 18h4l0-8h10v8h4" {...S} />
      </>
    ),
  },
  's6-empirical-rule': {
    color: '#db2777',
    node: (
      <>
        <path d="M3 18 Q12 4 21 18" {...S} />
        <path d="M9 18V10M15 18V10" {...S} />
      </>
    ),
  },
  's6-normal-approx': {
    color: '#db2777',
    node: (
      <>
        <path d="M3 18 Q12 5 21 18" {...S} />
        <path d="M7 18v-4M12 18v-7M17 18v-4" {...S} />
      </>
    ),
  },
  's6-chebyshev': {
    color: '#e0457f',
    node: (
      <>
        <path d="M3 18 Q12 4 21 18" {...S} />
        <path d="M6 18v-2.5M18 18v-2.5" {...S} />
      </>
    ),
  },
  's7-gamblers-ruin': {
    color: '#16a34a',
    node: (
      <>
        <path d="M4 4v16M20 4v16" {...S} />
        <path d="M4 13l4-2 4 3 4-4 4 2" {...S} />
      </>
    ),
  },
  's7-markov': {
    color: '#16a34a',
    node: (
      <>
        <circle cx="6.5" cy="12" r="3" {...S} />
        <circle cx="17.5" cy="12" r="3" {...S} />
        <path d="M9.5 10.5c2-2 5-2 5 0M14.5 13.5c-2 2-5 2-5 0" {...S} />
      </>
    ),
  },
  's7-branching': {
    color: '#1aa34a',
    node: (
      <>
        <path d="M12 4v4M12 8l-5 5M12 8l5 5M7 13v3M17 13v3" {...S} />
        <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
  },
  's8-area-ratio': {
    color: '#ea580c',
    node: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1.5" {...S} />
        <circle cx="12" cy="12" r="5" {...S} />
      </>
    ),
  },
  's8-buffon': {
    color: '#ea580c',
    node: (
      <>
        <path d="M4 8h16M4 13h16M4 18h16" {...S} />
        <path d="M8 6.5l7 9" {...S} />
      </>
    ),
  },
  's8-bertrand': {
    color: '#f06017',
    node: (
      <>
        <circle cx="12" cy="12" r="8" {...S} />
        <path d="M6.5 8.5L17 16" {...S} />
      </>
    ),
  },
  's8-order-stats': {
    color: '#f06017',
    node: (
      <>
        <path d="M3 16h18" {...S} />
        <circle cx="6" cy="16" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="16" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="16" r="1.5" fill="currentColor" stroke="none" />
        <path d="M6 12v-2M18 12v-2" {...S} />
      </>
    ),
  },
  'l1-coin-flip': {
    color: '#f0a020',
    node: (
      <>
        <ellipse cx="12" cy="7.5" rx="7" ry="3" {...S} />
        <path d="M5 7.5v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" {...S} />
        <path d="M5 12.5v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" {...S} />
      </>
    ),
  },
  'l2-dice-roll': {
    color: '#2e7df6',
    node: (
      <>
        <rect x="3" y="7" width="10" height="10" rx="2.4" {...S} />
        <rect x="11" y="3" width="10" height="10" rx="2.4" {...S} />
        <circle cx="6.2" cy="10.2" r="1" fill="currentColor" stroke="none" />
        <circle cx="9.8" cy="13.8" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l3-galton-board': {
    color: '#0f9d8c',
    node: (
      <>
        <path d="M3 19c4.5 0 4.5-12 9-12s4.5 12 9 12" {...S} />
        <line x1="3" y1="19.5" x2="21" y2="19.5" {...S} />
        <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="9" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l5-expected-value': {
    color: '#8b5cf6',
    node: (
      <>
        <circle cx="12" cy="13" r="7.5" {...S} />
        <line x1="12" y1="5.5" x2="12" y2="20.5" {...S} />
        <line x1="4.5" y1="13" x2="19.5" y2="13" {...S} />
        <circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none" />
        <path d="M12 2.5l2 2.6h-4l2-2.6Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l6-conditional': {
    color: '#ef4444',
    node: (
      <>
        <rect x="3.5" y="6" width="9" height="13" rx="1.8" transform="rotate(-9 8 12.5)" {...S} />
        <rect x="11" y="5" width="9" height="13" rx="1.8" transform="rotate(8 15.5 11.5)" {...S} />
        <path d="M15.5 9.5c-1 .8-1.6 1.7-1.6 2.6 0 .8.6 1.3 1.3 1.3.4 0 .8-.2 1-.5.2.3.6.5 1 .5.7 0 1.3-.5 1.3-1.3 0-.9-.6-1.8-1.6-2.6l-.7-.6-.7.6Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l7-monty-hall': {
    color: '#0ea5e9',
    node: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.2" {...S} />
        <rect x="9.5" y="4" width="5" height="16" rx="1.2" {...S} />
        <rect x="16" y="4" width="5" height="16" rx="1.2" {...S} />
        <circle cx="6.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="13" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="19.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l8-random-walk': {
    color: '#14b8a6',
    node: (
      <>
        <path d="M3 15l3-4 3 4 3-7 3 5 3-8 3 5" {...S} />
        <circle cx="3" cy="15" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="21" cy="10" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'l9-clt': {
    color: '#6366f1',
    node: (
      <>
        <path d="M3 19c4.5 0 4-12 9-12s4.5 12 9 12" {...S} />
        <line x1="3" y1="19.5" x2="21" y2="19.5" {...S} />
        <line x1="12" y1="7.5" x2="12" y2="19.5" {...S} />
      </>
    ),
  },
  'lf-final-test': {
    color: '#0f9d8c',
    node: (
      <>
        <path d="M2.5 9 12 5l9.5 4-9.5 4-9.5-4Z" {...S} />
        <path d="M6 11v4c0 1.3 2.7 2.6 6 2.6s6-1.3 6-2.6v-4" {...S} />
        <line x1="21.5" y1="9" x2="21.5" y2="13.5" {...S} />
      </>
    ),
  },
};

const FALLBACK: IconDef = {
  color: 'var(--accent)',
  node: (
    <>
      <circle cx="12" cy="12" r="8" {...S} />
      <line x1="12" y1="8" x2="12" y2="13" {...S} />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

/*
 * Lesson glyphs are now a single ink color. We deliberately dropped the
 * per-lesson rainbow tint — a row of multi-colored pastel chips is a strong
 * "templated" tell. Glyphs inherit `currentColor` from CSS so context (e.g. an
 * active nav item) can recolor them; progress rings use a single accent.
 */

interface Props {
  lessonId: string;
  size?: number;
  /** Kept for API compatibility; glyphs no longer draw a tinted tile. */
  tile?: boolean;
  /** Tint the glyph with its per-lesson brand color (used in the sidebar). */
  colored?: boolean;
  className?: string;
}

export default function LessonIcon({ lessonId, size = 24, tile = false, colored = false, className }: Props) {
  const def = ICONS[lessonId] ?? FALLBACK;
  return (
    <span
      className={`lesson-glyph ${tile ? 'glyph-box' : ''} ${className ?? ''}`}
      style={colored ? { color: def.color } : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        {def.node}
      </svg>
    </span>
  );
}

/** Outline lock used for locked lessons (replaces the emoji padlock). */
export function LockIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
