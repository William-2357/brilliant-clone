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

/** Draw a binomial-sample step: returns heads count for `flips` trials with prob p. */
export function sampleHeads(flips: number, p: number): number {
  let h = 0;
  for (let i = 0; i < flips; i++) if (Math.random() < p) h++;
  return h;
}
