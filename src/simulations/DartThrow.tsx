import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'shape',
    label: 'Region',
    options: [
      { value: 0, label: 'Circle' },
      { value: 1, label: 'Square' },
      { value: 2, label: 'Triangle' },
    ],
  },
  { kind: 'range', key: 'size', label: 'Size', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
];

/**
 * Geometric probability: uniform darts in the unit square. The fraction landing
 * inside the highlighted region converges to its area (the region is a fraction
 * of the area-1 square). shape 0 = circle, 1 = sub-square, 2 = triangle.
 */
export default function DartThrow({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 1500);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const shape = Math.round(eff.shape ?? 0);
  // Keep the circle inscribed (radius ≤ 0.5) so its area = π·r² stays the true fraction.
  const size = shape === 0 ? Math.min(eff.size ?? 0.5, 0.5) : (eff.size ?? 0.5);
  const inside = (x: number, y: number) => {
    if (shape === 1) {
      const half = size / 2;
      return Math.abs(x - 0.5) <= half && Math.abs(y - 0.5) <= half;
    }
    if (shape === 2) return x + y <= size;
    return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= size * size;
  };
  const trueArea = shape === 1 ? size * size : shape === 2 ? (size * size) / 2 : Math.PI * size * size;

  const stateRef = useRef({ hits: 0, processed: 0, total: 0, pts: [] as { x: number; y: number; in: boolean }[] });
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
    const box = Math.min(height - 70, width - 40, 150);
    const ox = (width - box) / 2;
    const oy = 12;
    const X = (x: number) => ox + x * box;
    const Y = (y: number) => oy + y * box;

    ctx.strokeStyle = c.borderStrong;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(ox, oy, box, box);
    // region
    ctx.fillStyle = c.accentBg;
    ctx.strokeStyle = c.accent2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (shape === 0) ctx.arc(X(0.5), Y(0.5), size * box, 0, Math.PI * 2);
    else if (shape === 1) ctx.rect(X(0.5 - size / 2), Y(0.5 - size / 2), size * box, size * box);
    else {
      ctx.moveTo(X(0), Y(size));
      ctx.lineTo(X(size), Y(0));
      ctx.lineTo(X(0), Y(0));
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    // darts
    for (const p of s.pts) {
      ctx.fillStyle = p.in ? c.accent : c.muted;
      ctx.globalAlpha = p.in ? 0.9 : 0.4;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // estimate
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.hits / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = oy + box + 16;
    const barH = 14;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 7);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(0, barW * estimate), barH, 7);
    ctx.fill();
    if (reveal) {
      const tx = barX + barW * Math.min(1, trueArea);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 5);
      ctx.lineTo(tx, barY + barH + 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 20);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('fraction inside = area', width / 2, barY + barH + 35);
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
        const y = Math.random();
        const isIn = inside(x, y);
        if (isIn) s.hits++;
        if (s.pts.length < 600) s.pts.push({ x, y, in: isIn });
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
      <canvas ref={canvasRef} data-height="248" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Darts" value={trials} min={20} max={8000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Throw {trials}
          </button>
        </div>
      )}
    </div>
  );
}
