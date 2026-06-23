/**
 * Tiny dependency-free confetti burst. Spawns a transient full-screen canvas,
 * animates a batch of particles under gravity, then removes itself. Respects
 * prefers-reduced-motion (no-op) and caps concurrent bursts.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  color: string;
  shape: 'rect' | 'circle';
  life: number;
}

const COLORS = ['#16a34a', '#2e7df6', '#f0a020', '#ec4899', '#8b5cf6', '#0ea5e9', '#34d399'];

let activeCanvas: HTMLCanvasElement | null = null;
let rafId = 0;

export function fireConfetti(options?: { count?: number; originX?: number; originY?: number }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const count = options?.count ?? 140;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const ox = options?.originX ?? W / 2;
  const oy = options?.originY ?? H * 0.42;

  // Reuse a single overlay canvas so repeated answers don't stack canvases.
  if (!activeCanvas) {
    activeCanvas = document.createElement('canvas');
    const c = activeCanvas;
    c.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
    document.body.appendChild(c);
  }
  const canvas = activeCanvas;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 6 + Math.random() * 9;
    particles.push({
      x: ox + (Math.random() - 0.5) * 80,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3,
      size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
      life: 1,
    });
  }

  const gravity = 0.32;
  const drag = 0.992;
  let start = 0;
  cancelAnimationFrame(rafId);

  const tick = (t: number) => {
    if (!start) start = t;
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (elapsed > 1400) p.life -= 0.02;
      if (p.life <= 0 || p.y > H + 40) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive && elapsed < 4000) {
      rafId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, W, H);
      activeCanvas?.remove();
      activeCanvas = null;
    }
  };
  rafId = requestAnimationFrame(tick);
}
