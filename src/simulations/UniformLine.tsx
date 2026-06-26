import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'mode',
    label: 'Region',
    options: [
      { value: 0, label: 'Single band' },
      { value: 1, label: 'Two ends' },
    ],
  },
  { kind: 'range', key: 'lo', label: 'Lower edge', min: 0, max: 1, step: 0.05 },
  { kind: 'range', key: 'hi', label: 'Upper edge', min: 0, max: 1, step: 0.05 },
];

/**
 * Continuous uniform on [0, 1]. Points drop uniformly on a line; the fraction
 * landing in the shaded region converges to its length. mode 0 = a single
 * interval [lo, hi]; mode 1 = the union of the two ends [0, lo] and [hi, 1].
 */
export default function UniformLine({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 1200);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const m = Math.round(eff.mode ?? 0);
  const a = Math.max(0, Math.min(1, eff.lo ?? 0));
  const b = Math.max(0, Math.min(1, eff.hi ?? 0.5));
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const inside = (x: number) => (m === 1 ? x <= lo || x >= hi : x >= lo && x <= hi);
  const trueP = m === 1 ? lo + (1 - hi) : Math.max(0, hi - lo);

  const stateRef = useRef({
    hits: 0,
    processed: 0,
    total: 0,
    pts: [] as { x: number; in: boolean }[],
  });
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

    const x0 = 24;
    const x1 = width - 24;
    const lineY = 64;
    const X = (t: number) => x0 + t * (x1 - x0);

    // Shaded region(s)
    ctx.fillStyle = c.accentBg;
    if (m === 1) {
      ctx.fillRect(X(0), lineY - 16, X(lo) - X(0), 32);
      ctx.fillRect(X(hi), lineY - 16, X(1) - X(hi), 32);
    } else {
      ctx.fillRect(X(lo), lineY - 16, X(hi) - X(lo), 32);
    }
    // Axis line + ticks
    ctx.strokeStyle = c.borderStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0), lineY);
    ctx.lineTo(X(1), lineY);
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', X(0), lineY + 28);
    ctx.fillText('1', X(1), lineY + 28);

    // Points (spread into a band just above the axis so they don't all overlap)
    for (let idx = 0; idx < s.pts.length; idx++) {
      const p = s.pts[idx];
      const jy = lineY - 8 - ((idx * 13) % 30);
      ctx.fillStyle = p.in ? c.accent : c.muted;
      ctx.globalAlpha = p.in ? 0.9 : 0.4;
      ctx.beginPath();
      ctx.arc(X(p.x), jy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Estimate bar
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.hits / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = lineY + 44;
    const barH = 16;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(0, barW * estimate), barH, 8);
    ctx.fill();
    if (reveal) {
      const tx = barX + barW * Math.min(1, trueP);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 6);
      ctx.lineTo(tx, barY + barH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = c.textH;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 24);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('fraction in the shaded region', width / 2, barY + barH + 40);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.hits = 0;
    s.processed = 0;
    s.total = total;
    s.pts = [];
    accRef.current = 0;
    const perFrame = total <= 30 ? 1 / 4 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const x = Math.random();
        const isIn = inside(x);
        if (isIn) s.hits++;
        if (s.pts.length < 400) s.pts.push({ x, in: isIn });
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
    s.hits = 0;
    s.processed = 0;
    s.pts = [];
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
      <canvas ref={canvasRef} data-height="170" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Points" value={trials} min={20} max={6000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Drop {trials}
          </button>
        </div>
      )}
    </div>
  );
}
