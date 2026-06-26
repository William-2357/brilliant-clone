import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { normalTwoTail, chebyshevBound } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'k', label: 'Tail cutoff k (SD)', min: 1, max: 3.5, step: 0.1 },
];

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Concentration / Chebyshev sim. Samples a standard normal and tracks the
 * fraction landing beyond ±k SD. The bell's tails are shaded; the run reveals the
 * actual tail probability alongside the (much looser) Chebyshev bound 1/k².
 */
export default function TailBound({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 4000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (key: string, v: number) => setParams((p) => ({ ...p, [key]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const k = Math.max(1, eff.k ?? 2);
  const actual = normalTwoTail(k);
  const bound = chebyshevBound(k);
  const scaleMax = Math.max(0.3, bound * 1.15);

  const stateRef = useRef({ tail: 0, processed: 0, total: 0 });
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(
    null,
  );

  function ensure() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    dimsRef.current = setupCanvas(canvas);
    return dimsRef.current;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);
    const reveal = mode === 'explore' || s.processed > 0;

    // Bell curve over [-4, 4]
    const plot = { x: 16, y: 12, w: width - 32, h: 96 };
    const zToX = (z: number) => plot.x + ((z + 4) / 8) * plot.w;
    const phi = (z: number) => Math.exp(-0.5 * z * z);
    const yTop = plot.y + 4;
    const yBase = plot.y + plot.h;
    // shaded tails
    ctx.fillStyle = c.accentBg;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(zToX(sign * k), yBase);
      for (let z = sign * k; sign > 0 ? z <= 4 : z >= -4; z += sign * 0.1) {
        ctx.lineTo(zToX(z), yBase - phi(z) * (plot.h - 8));
      }
      ctx.lineTo(zToX(sign * 4), yBase);
      ctx.closePath();
      ctx.fill();
    }
    // curve
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let z = -4; z <= 4; z += 0.05) {
      const px = zToX(z);
      const py = yBase - phi(z) * (plot.h - 8);
      if (z === -4) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // ±k lines
    ctx.strokeStyle = c.borderStrong;
    ctx.lineWidth = 1.2;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(zToX(sign * k), yTop);
      ctx.lineTo(zToX(sign * k), yBase);
      ctx.stroke();
    }
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`±${k.toFixed(1)} SD`, width / 2, yBase + 14);

    // estimate bar
    const estimate = s.processed > 0 ? s.tail / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = yBase + 28;
    const barH = 16;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(0, barW * Math.min(1, estimate / scaleMax)), barH, 8);
    ctx.fill();
    if (reveal) {
      const ax = barX + barW * Math.min(1, actual / scaleMax);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, barY - 6);
      ctx.lineTo(ax, barY + barH + 6);
      ctx.stroke();
      const bx = barX + barW * Math.min(1, bound / scaleMax);
      ctx.strokeStyle = c.warn;
      ctx.beginPath();
      ctx.moveTo(bx, barY - 6);
      ctx.lineTo(bx, barY + barH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = c.textH;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(estimate.toFixed(4), width / 2, barY + barH + 24);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(
      reveal ? `actual tail; Chebyshev bound ≤ ${bound.toFixed(3)}` : 'fraction beyond ±k SD',
      width / 2,
      barY + barH + 40,
    );
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.tail = 0;
    s.processed = 0;
    s.total = total;
    accRef.current = 0;
    const perFrame = Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        if (Math.abs(gauss()) >= k) s.tail++;
        s.processed++;
      }
      draw();
      if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    ensure();
    draw();
    const onResize = () => {
      ensure();
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
    if (mode !== 'explore') return;
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.tail = 0;
    s.processed = 0;
    ensure();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.trials ?? trials);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="210" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Samples" value={trials} min={100} max={50000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Sample {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
