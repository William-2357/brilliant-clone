import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';

/**
 * Long-run frequency. Flips a coin `flips` times with bias `p`, shows the current
 * fraction of heads as a bar, and traces the running fraction on a log-scale plot
 * behind the ±2·√(p(1−p)/N) convergence band — the funnel that narrows like
 * 1/√N. Flips are processed with exponential acceleration so the volatile first
 * few flips are drawn one at a time (the path truly starts at N = 1) and later
 * points land evenly across the log axis. The bar marker, band, and target line
 * reveal the answer, so all three stay hidden during predict.
 */
export default function CoinFlip({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p = config.p ?? 0.5;
  const [flips, setFlips] = useState(config.flips ?? 100);
  const stateRef = useRef({
    heads: 0,
    processed: 0,
    total: 0,
    path: [] as { n: number; freq: number }[],
    // Outcome of the most recent individual flip: 1 = heads, 0 = tails, -1 = none yet.
    last: -1,
  });
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);
    const freq = s.processed > 0 ? s.heads / s.processed : 0;
    // The bar marker, band, and target give away the answer — hide while predicting.
    const reveal = mode === 'explore' || s.processed > 0;
    const totalAxis = Math.max(2, s.total > 0 ? s.total : config.flips ?? flips);

    // Coin (top-left) — shows the actual result of the most recent flip.
    const cx = 46;
    const cy = 46;
    const r = 30;
    const face = s.last === -1 ? '?' : s.last === 1 ? 'H' : 'T';
    ctx.beginPath();
    ctx.fillStyle = s.last === 0 ? c.accent2 : c.accent;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.accentStrong;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, cx, cy + 1);

    // Readout (top-right)
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c.textH;
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(freq.toFixed(3), width - 14, 42);
    ctx.fillStyle = c.text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${s.heads} heads / ${s.processed} flips`, width - 14, 64);

    // Current-fraction bar (kept from the original viz)
    const barX = 20;
    const barW = width - 40;
    const barY = 94;
    const barH = 22;
    const radius = barH / 2;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, radius);
    ctx.fill();
    if (freq > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * freq), barH, radius);
      ctx.fill();
    }
    if (reveal) {
      const tx = barX + barW * p;
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 7);
      ctx.lineTo(tx, barY + barH + 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.accent2;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`p ${p.toFixed(2)}`, tx, barY - 11);
    }

    // Convergence plot
    const plotLeft = 40;
    const plotRight = width - 14;
    const plotTop = 150;
    const plotBottom = height - 26;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const yToPx = (f: number) => plotBottom - f * plotH;
    const xToPx = (n: number) => plotLeft + (Math.log(Math.max(1, n)) / Math.log(totalAxis)) * plotW;

    // Grid + fraction labels
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const f of [0, 0.5, 1]) {
      const y = yToPx(f);
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.fillText(f === 0.5 ? '.5' : String(f), plotLeft - 6, y);
    }
    // Flip-count ticks (powers of ten)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = c.muted;
    for (let tick = 1; tick <= totalAxis; tick *= 10) {
      ctx.fillText(tick >= 1000 ? `${tick / 1000}k` : String(tick), xToPx(tick), plotBottom + 5);
    }

    // Convergence band (±2 SD funnel) and target line — hidden during predict
    if (reveal) {
      const pts = 90;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const n = Math.pow(totalAxis, i / pts);
        const sd = Math.sqrt((p * (1 - p)) / Math.max(1, n));
        ctx.lineTo(xToPx(n), yToPx(Math.min(1, p + 2 * sd)));
      }
      for (let i = pts; i >= 0; i--) {
        const n = Math.pow(totalAxis, i / pts);
        const sd = Math.sqrt((p * (1 - p)) / Math.max(1, n));
        ctx.lineTo(xToPx(n), yToPx(Math.max(0, p - 2 * sd)));
      }
      ctx.closePath();
      ctx.fillStyle = c.accentBg;
      ctx.fill();

      const ty = yToPx(p);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plotLeft, ty);
      ctx.lineTo(plotRight, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.accent2;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`p = ${p.toFixed(2)}`, plotLeft + 5, ty - 3);
    }

    // Running-average path
    if (s.path.length > 0) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.path.forEach((pt, i) => {
        const x = xToPx(pt.n);
        const y = yToPx(pt.freq);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const last = s.path[s.path.length - 1];
      ctx.fillStyle = c.accentStrong;
      ctx.beginPath();
      ctx.arc(xToPx(last.n), yToPx(last.freq), 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plot frame
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(plotLeft + 0.5, plotTop + 0.5, plotW, plotH);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.heads = 0;
    s.processed = 0;
    s.total = total;
    s.path = [];
    s.last = -1;
    accRef.current = 0;
    const small = total <= 20;
    // Process flips with exponential growth: ~one per frame at the start (so the
    // wild early region is captured point-by-point) accelerating to finish in
    // ~75 frames. This makes path points land roughly evenly on the log axis.
    const growth = Math.max(0.06, Math.pow(total, 1 / 75) - 1);

    const tick = () => {
      const before = s.processed;
      const raw = small ? 1 / 6 : Math.max(1, Math.floor(s.processed * growth));
      const todo = scaledStep(accRef, raw);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const isHeads = Math.random() < p;
        if (isHeads) s.heads++;
        s.last = isHeads ? 1 : 0;
        s.processed++;
      }
      if (s.processed > before) s.path.push({ n: s.processed, freq: s.heads / s.processed });
      draw();
      if (s.processed < total) {
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
      run(config.flips ?? flips);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="360" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField label="Flips" value={flips} min={1} max={1000} onChange={setFlips} />
          <button type="button" className="btn" onClick={() => run(flips)}>
            Flip {flips}×
          </button>
        </div>
      )}
    </div>
  );
}
