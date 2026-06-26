import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { uniformOrderMean } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'n', label: 'Sample size (n)', min: 1, max: 12 },
  { kind: 'range', key: 'r', label: 'Rank (r)', min: 1, max: 12 },
];

/**
 * Order statistics of n Uniform(0,1) draws. The histogram of the r-th smallest
 * value sits in [0,1] and its running mean converges to r/(n+1) (r = n gives the
 * maximum, r = 1 the minimum).
 */
export default function OrderStats({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 2000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const n = Math.max(1, Math.round(eff.n ?? 5));
  const r = Math.max(1, Math.min(n, Math.round(eff.r ?? n)));
  const trueMean = uniformOrderMean(n, r);
  const BINS = 24;

  const stateRef = useRef({ bins: [] as number[], processed: 0, sum: 0 });
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

    const plot = { x: 20, y: 16, w: width - 40, h: height - 76 };
    let peak = 1;
    for (let i = 0; i < BINS; i++) peak = Math.max(peak, s.bins[i] ?? 0);
    const bw = plot.w / BINS;
    for (let i = 0; i < BINS; i++) {
      const bh = ((s.bins[i] ?? 0) / peak) * plot.h;
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.roundRect(plot.x + i * bw + 1, plot.y + plot.h - bh, Math.max(0, bw - 2), bh, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.x, plot.y + plot.h);
    ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
    ctx.stroke();
    if (reveal) {
      const mx = plot.x + trueMean * plot.w;
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, plot.y);
      ctx.lineTo(mx, plot.y + plot.h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const mean = s.processed > 0 ? s.sum / s.processed : 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(reveal ? mean.toFixed(3) : '—', width / 2, plot.y + plot.h + 26);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    const which = r === n ? 'maximum' : r === 1 ? 'minimum' : `rank ${r}`;
    ctx.fillText(`mean of the ${which} of ${n}`, width / 2, plot.y + plot.h + 42);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.bins = new Array(BINS).fill(0);
    s.processed = 0;
    s.sum = 0;
    accRef.current = 0;
    const perFrame = Math.max(1, Math.ceil(total / 70));
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const arr: number[] = [];
        for (let j = 0; j < n; j++) arr.push(Math.random());
        arr.sort((a, b) => a - b);
        const v = arr[r - 1];
        s.sum += v;
        const bin = Math.max(0, Math.min(BINS - 1, Math.floor(v * BINS)));
        s.bins[bin]++;
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
    s.bins = [];
    s.processed = 0;
    s.sum = 0;
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
      <canvas ref={canvasRef} data-height="220" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Trials" value={trials} min={20} max={20000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Sample {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
