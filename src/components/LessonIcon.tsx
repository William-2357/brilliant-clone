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
  'l4-birthday': {
    color: '#ec4899',
    node: (
      <>
        <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7Z" {...S} />
        <path d="M4 15c1.6 0 1.6 1.4 3.2 1.4S8.8 15 10.4 15s1.6 1.4 3.2 1.4S15.2 15 16.8 15s1.6 1.4 3.2 1.4" {...S} />
        <line x1="12" y1="4" x2="12" y2="8.5" {...S} />
        <circle cx="12" cy="3.3" r="1.1" fill="currentColor" stroke="none" />
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

// eslint-disable-next-line react-refresh/only-export-components
export function lessonIconColor(lessonId: string): string {
  return (ICONS[lessonId] ?? FALLBACK).color;
}

interface Props {
  lessonId: string;
  size?: number;
  /** When true, draw a tinted rounded tile behind the glyph. */
  tile?: boolean;
  className?: string;
}

export default function LessonIcon({ lessonId, size = 24, tile = false, className }: Props) {
  const def = ICONS[lessonId] ?? FALLBACK;
  const svg = (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color: def.color }} aria-hidden>
      {def.node}
    </svg>
  );
  if (!tile) return <span className={className}>{svg}</span>;
  return (
    <span
      className={`icon-tile ${className ?? ''}`}
      style={{
        color: def.color,
        background: `color-mix(in srgb, ${def.color} 16%, transparent)`,
      }}
    >
      {svg}
    </span>
  );
}
