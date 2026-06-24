/** Size a canvas for the device pixel ratio and return its CSS-pixel dimensions. */
export function setupCanvas(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.clientWidth || 320;
  const height = Number(canvas.dataset.height) || 240;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Theme colors for Canvas sims — always read from CSS variables. */
export interface SimPalette {
  accent: string;
  accent2: string;
  accentStrong: string;
  accentBg: string;
  cyan: string;
  good: string;
  warn: string;
  bad: string;
  text: string;
  textH: string;
  muted: string;
  border: string;
  borderStrong: string;
  surface: string;
  surface2: string;
  surface3: string;
  ringTrack: string;
  gridLine: string;
}

export function simPalette(): SimPalette {
  return {
    accent: cssVar('--accent', '#0f9d8c'),
    accent2: cssVar('--accent-2', '#2e7df6'),
    accentStrong: cssVar('--accent-strong', '#0b8576'),
    accentBg: cssVar('--accent-bg', 'rgba(15,157,140,0.1)'),
    cyan: cssVar('--cyan', '#0284c7'),
    good: cssVar('--good', '#16a34a'),
    warn: cssVar('--warn', '#e0930a'),
    bad: cssVar('--bad', '#dc2626'),
    text: cssVar('--text', '#4a5a64'),
    textH: cssVar('--text-h', '#15242c'),
    muted: cssVar('--muted', '#74838d'),
    border: cssVar('--border', '#e0e6ea'),
    borderStrong: cssVar('--border-strong', '#cdd6dc'),
    surface: cssVar('--surface', '#ffffff'),
    surface2: cssVar('--surface-2', '#f5f7f9'),
    surface3: cssVar('--surface-3', '#eef2f5'),
    ringTrack: cssVar('--ring-track', '#e6ebee'),
    gridLine: cssVar('--grid-line', 'rgba(16,40,48,0.05)'),
  };
}

/** Draw a binomial-sample step: returns heads count for `flips` trials with prob p. */
export function sampleHeads(flips: number, p: number): number {
  let h = 0;
  for (let i = 0; i < flips; i++) if (Math.random() < p) h++;
  return h;
}
