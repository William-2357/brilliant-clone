import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { pearson } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'rho', label: 'Correlation ρ', min: -1, max: 1, step: 0.05 },
];

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Joint distribution & correlation. Generates n points with target correlation
 * rho, animates them into a scatter, then reveals the sample Pearson r and a
 * trend line. The number is hidden during the predict phase.
 */
export default function Scatter({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [n, setN] = useState(config.n ?? 200);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const rho = Math.max(-1, Math.min(1, eff.rho ?? 0.6));

  const stateRef = useRef({ xs: [] as number[], ys: [] as number[], shown: 0, total: 0, r: 0 });
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

    const pad = 24;
    const plot = { x: pad, y: 14, w: width - pad * 2, h: height - 60 };
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);

    const map = (x: number, y: number) => ({
      px: plot.x + ((x + 3) / 6) * plot.w,
      py: plot.y + plot.h - ((y + 3) / 6) * plot.h,
    });

    ctx.fillStyle = c.accent;
    for (let i = 0; i < s.shown; i++) {
      const { px, py } = map(s.xs[i], s.ys[i]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const done = s.total > 0 && s.shown >= s.total;
    const reveal = mode === 'explore' || done;
    if (reveal && s.total > 0) {
      // Trend line through the cloud (slope = r since both axes are standardized).
      const a = map(-3, -3 * s.r);
      const b = map(3, 3 * s.r);
      ctx.strokeStyle = c.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(reveal ? `r = ${s.r.toFixed(2)}` : 'r = ?', width / 2, height - 24);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('sample correlation', width / 2, height - 9);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.xs = [];
    s.ys = [];
    const k = Math.sqrt(Math.max(0, 1 - rho * rho));
    for (let i = 0; i < total; i++) {
      const x = gauss();
      const y = rho * x + k * gauss();
      s.xs.push(x);
      s.ys.push(y);
    }
    s.r = pearson(s.xs, s.ys);
    s.shown = 0;
    s.total = total;
    accRef.current = 0;
    const perFrame = Math.max(1, Math.ceil(total / 45));
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      s.shown = Math.min(total, s.shown + todo);
      draw();
      if (s.shown < total) rafRef.current = requestAnimationFrame(tick);
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
    s.xs = [];
    s.ys = [];
    s.shown = 0;
    s.total = 0;
    s.r = 0;
    ensure();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.n ?? n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="250" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Points" value={n} min={20} max={600} onChange={setN} />
          <button type="button" className="btn" onClick={() => run(n)}>
            Generate {n}
          </button>
        </div>
      )}
    </div>
  );
}
