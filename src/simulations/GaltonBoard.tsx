import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';
import { binomialPmf } from '../lib/probability';

interface Ball {
  row: number;
  prog: number;
  k: number;
  dir: number;
}

// Hard ceiling on concurrently animated sprites — a safety bound, not a visual
// cap. Drawing this many plain circles per frame is cheap; the previous jank
// came from per-frame canvas reallocation + shadowBlur, not the ball count.
const MAX_ON_SCREEN = 1200;

/**
 * Galton board. Every ball actually falls, bouncing left/right at each peg
 * (a fair coin per row), and they pile up into a binomial / bell curve. Balls
 * are released as a steady stream (a few spawned per frame) so even a 1000-ball
 * drop animates smoothly to completion.
 */
export default function GaltonBoard({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = config.rows ?? 12;
  const [balls, setBalls] = useState(config.balls ?? 200);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);
  // Cached canvas context/size — refreshed only on mount, resize, and run start,
  // never per frame (reassigning canvas.width each frame is what caused jank).
  const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(
    null,
  );
  const stateRef = useRef({
    bins: new Array(rows + 1).fill(0) as number[],
    active: [] as Ball[],
    toSpawn: 0,
    spawnPerFrame: 1,
    landed: 0,
    total: 0,
  });

  function ensureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    dimsRef.current = setupCanvas(canvas);
    return dimsRef.current;
  }

  function geometry(width: number, height: number) {
    const bins = rows + 1;
    const left = 16;
    const plotW = width - left * 2;
    const binW = plotW / bins;
    const centerX = width / 2;
    const pegTop = 28;
    const binAreaH = 100;
    const binGap = 10;
    const dy = (height - pegTop - binAreaH - binGap) / rows;
    const binsTop = pegTop + rows * dy + binGap;
    return { bins, left, plotW, binW, centerX, pegTop, dy, binsTop, binAreaH };
  }

  function draw() {
    const dims = dimsRef.current ?? ensureCanvas();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const s = stateRef.current;
    const accent = cssVar('--accent', '#0f9d8c');
    const accent2 = cssVar('--accent-2', '#2e7df6');
    const text = cssVar('--text', '#4a5a64');
    const muted = cssVar('--muted', '#74838d');
    const border = cssVar('--border', '#e0e6ea');
    const g = geometry(width, height);
    ctx.clearRect(0, 0, width, height);

    // Pegs
    ctx.fillStyle = muted;
    ctx.globalAlpha = 0.5;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i <= r; i++) {
        const x = g.centerX + (i - r / 2) * g.binW;
        const y = g.pegTop + r * g.dy;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Bins. Normalise to the expected peak count so bars visibly GROW toward a
    // full bell curve as balls accumulate.
    const { binsTop, binAreaH } = g;
    const expectedPeak = s.total > 0 ? s.total * binomialPmf(rows, Math.floor(rows / 2), 0.5) : 1;
    const denom = Math.max(1, expectedPeak);

    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(g.left, binsTop + binAreaH + 0.5);
    ctx.lineTo(width - g.left, binsTop + binAreaH + 0.5);
    ctx.stroke();

    const binGrad = ctx.createLinearGradient(0, binsTop, 0, binsTop + binAreaH);
    binGrad.addColorStop(0, accent2);
    binGrad.addColorStop(1, accent);
    ctx.fillStyle = binGrad;
    for (let b = 0; b < g.bins; b++) {
      if (s.bins[b] <= 0) continue;
      const h = Math.min(binAreaH, (s.bins[b] / denom) * binAreaH);
      const x = g.left + b * g.binW;
      ctx.fillRect(x + 1, binsTop + (binAreaH - h), g.binW - 2, h);
    }

    // Active balls (no shadow — plain fills keep hundreds of sprites at 60 FPS)
    ctx.fillStyle = accent2;
    for (const ball of s.active) {
      const baseOffset = 2 * ball.k - ball.row;
      const xBase = g.centerX + baseOffset * (g.binW / 2);
      const x = xBase + ball.dir * (g.binW / 2) * ball.prog;
      const y = g.pegTop + (ball.row + ball.prog) * g.dy;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Dropped: ${s.landed} / ${s.total}`, g.left, 16);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensureCanvas();
    const s = stateRef.current;
    s.bins = new Array(rows + 1).fill(0);
    s.active = [];
    s.landed = 0;
    s.total = total;
    s.toSpawn = total;
    // Release the whole batch over ~160 frames (~2.7s) regardless of size, so a
    // 20-ball drop trickles and a 1000-ball drop pours — both finishing promptly.
    s.spawnPerFrame = Math.max(1, Math.round(total / 160));
    const speed = 0.2; // rows advanced per frame (~5 frames per peg row)

    const tick = () => {
      // Release new balls from the funnel.
      let spawned = 0;
      while (
        spawned < s.spawnPerFrame &&
        s.toSpawn > 0 &&
        s.active.length < MAX_ON_SCREEN
      ) {
        s.active.push({ row: 0, prog: 0, k: 0, dir: Math.random() < 0.5 ? 1 : -1 });
        s.toSpawn--;
        spawned++;
      }

      // Advance every animated ball.
      const survivors: Ball[] = [];
      for (const ball of s.active) {
        ball.prog += speed;
        if (ball.prog >= 1) {
          if (ball.dir > 0) ball.k++;
          ball.row++;
          ball.prog = 0;
          if (ball.row >= rows) {
            s.bins[ball.k]++;
            s.landed++;
            continue;
          }
          ball.dir = Math.random() < 0.5 ? 1 : -1;
        }
        survivors.push(ball);
      }
      s.active = survivors;

      draw();
      if (s.active.length > 0 || s.toSpawn > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onSettled?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    ensureCanvas();
    draw();
    const onResize = () => {
      ensureCanvas();
      draw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.balls ?? balls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="370" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>Balls: {balls}</span>
            <input
              type="range"
              min={20}
              max={1000}
              step={20}
              value={balls}
              onChange={(e) => setBalls(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(balls)}>
            Drop {balls}
          </button>
        </div>
      )}
    </div>
  );
}
