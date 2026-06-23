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

const VISUAL_CAP = 140; // balls animated individually; remainder is fast-forwarded
const MAX_ON_SCREEN = 40;

/**
 * Galton board. Each ball bounces left/right at every peg (a fair coin per row),
 * and balls pile up into a binomial / bell curve. At most MAX_ON_SCREEN balls
 * animate at once; beyond VISUAL_CAP the remainder is computed straight into the
 * bins (PRD animate-small / batch-large + on-screen ball cap).
 */
export default function GaltonBoard({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = config.rows ?? 12;
  const [balls, setBalls] = useState(config.balls ?? 200);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({
    bins: new Array(rows + 1).fill(0) as number[],
    active: [] as Ball[],
    toAnimate: 0,
    toBatch: 0,
    landed: 0,
    total: 0,
  });

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const accent = cssVar('--accent', '#b14dff');
    const accent2 = cssVar('--accent-2', '#ff4dd8');
    const text = cssVar('--text', '#b9b3cc');
    const border = cssVar('--border', '#2c2542');
    const g = geometry(width, height);
    ctx.clearRect(0, 0, width, height);

    // Pegs — drawn in a light colour so they're clearly visible on the dark board
    ctx.fillStyle = 'rgba(220, 214, 240, 0.45)';
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i <= r; i++) {
        const x = g.centerX + (i - r / 2) * g.binW;
        const y = g.pegTop + r * g.dy;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bins. Normalise to the expected peak count so bars visibly GROW toward a
    // full bell curve as balls accumulate (rather than instantly snapping to a
    // fixed shape under max-normalisation).
    const { binsTop, binAreaH } = g;
    const expectedPeak = s.total > 0 ? s.total * binomialPmf(rows, Math.floor(rows / 2), 0.5) : 1;
    const denom = Math.max(1, expectedPeak);

    // Bin baseline
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(g.left, binsTop + binAreaH + 0.5);
    ctx.lineTo(width - g.left, binsTop + binAreaH + 0.5);
    ctx.stroke();

    const binGrad = ctx.createLinearGradient(0, binsTop, 0, binsTop + binAreaH);
    binGrad.addColorStop(0, accent2);
    binGrad.addColorStop(1, accent);
    ctx.save();
    ctx.shadowColor = accent2;
    ctx.shadowBlur = 12;
    for (let b = 0; b < g.bins; b++) {
      if (s.bins[b] <= 0) continue;
      const h = Math.min(binAreaH, (s.bins[b] / denom) * binAreaH);
      const x = g.left + b * g.binW;
      ctx.fillStyle = binGrad;
      ctx.fillRect(x + 1, binsTop + (binAreaH - h), g.binW - 2, h);
    }
    ctx.restore();

    // Active balls
    ctx.save();
    ctx.fillStyle = accent2;
    ctx.shadowColor = accent2;
    ctx.shadowBlur = 10;
    for (const ball of s.active) {
      const baseOffset = 2 * ball.k - ball.row;
      const xBase = g.centerX + baseOffset * (g.binW / 2);
      const x = xBase + ball.dir * (g.binW / 2) * ball.prog;
      const y = g.pegTop + (ball.row + ball.prog) * g.dy;
      ctx.beginPath();
      ctx.arc(x, y, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Dropped: ${s.landed}`, g.left, 16);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.bins = new Array(rows + 1).fill(0);
    s.active = [];
    s.landed = 0;
    s.total = total;
    s.toAnimate = Math.min(total, VISUAL_CAP);
    s.toBatch = Math.max(0, total - VISUAL_CAP);
    const speed = 0.16;

    const tick = () => {
      // Spawn animated balls up to the on-screen cap
      while (s.active.length < MAX_ON_SCREEN && s.toAnimate > 0) {
        s.active.push({ row: 0, prog: 0, k: 0, dir: Math.random() < 0.5 ? 1 : -1 });
        s.toAnimate--;
      }
      // Advance animated balls
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

      // Fast-forward the batched remainder
      if (s.toBatch > 0) {
        const chunk = Math.min(s.toBatch, 25);
        for (let i = 0; i < chunk; i++) {
          let k = 0;
          for (let r = 0; r < rows; r++) if (Math.random() < 0.5) k++;
          s.bins[k]++;
          s.landed++;
        }
        s.toBatch -= chunk;
      }

      draw();
      if (s.active.length > 0 || s.toAnimate > 0 || s.toBatch > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onSettled?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
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
