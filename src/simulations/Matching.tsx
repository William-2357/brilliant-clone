import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { derangementProbability, expectedFixedPoints } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'metric',
    label: 'Readout',
    options: [
      { value: 0, label: 'No-match rate' },
      { value: 1, label: 'Avg matches' },
    ],
  },
  { kind: 'range', key: 'n', label: 'Hats (n)', min: 2, max: 10 },
];

/**
 * Hat-check / matching problem: n hats returned at random. metric 0 estimates the
 * probability of NO match (a derangement, → 1/e); metric 1 estimates the expected
 * number of matches (= 1 for all n). The most recent shuffle is drawn with fixed
 * points highlighted. The target is hidden until a verify run begins.
 */
export default function Matching({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 2000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const n = Math.max(2, Math.round(eff.n ?? 5));
  const metric = Math.round(eff.metric ?? 0); // 0 = P(no match), 1 = E[matches]
  const scaleMax = metric === 1 ? 3 : 1;
  const trueValue = metric === 1 ? expectedFixedPoints(n) : derangementProbability(n);

  const stateRef = useRef({ sum: 0, processed: 0, total: 0, perm: [] as number[] });
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

  function shuffle(): number[] {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fixedPoints(p: number[]): number {
    let f = 0;
    for (let i = 0; i < p.length; i++) if (p[i] === i) f++;
    return f;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    // Current shuffle: slot i shows which hat came back; matches glow.
    const perm = s.perm.length ? s.perm : Array.from({ length: n }, (_, i) => i);
    const sw = Math.min(40, (width - 32) / n - 6);
    const gap = 6;
    const totalW = n * sw + (n - 1) * gap;
    let x = (width - totalW) / 2;
    const y = 26;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let f = 0;
    for (let i = 0; i < n; i++) {
      const match = perm[i] === i;
      if (match) f++;
      ctx.fillStyle = match && s.processed > 0 ? c.accent : c.surface3;
      ctx.strokeStyle = c.borderStrong;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x, y, sw, sw, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = match && s.processed > 0 ? '#fff' : c.text;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(String(perm[i] + 1), x + sw / 2, y + sw / 2 + 1);
      x += sw + gap;
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(s.processed > 0 ? `matches this shuffle: ${f}` : `${n} hats returned at random`, width / 2, y + sw + 18);

    // Estimate bar
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.sum / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = y + sw + 36;
    const barH = 18;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();
    const frac = Math.max(0, Math.min(1, estimate / scaleMax));
    if (frac > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * frac), barH, 9);
      ctx.fill();
    }
    if (reveal) {
      const tx = barX + barW * Math.min(1, trueValue / scaleMax);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 6);
      ctx.lineTo(tx, barY + barH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(estimate.toFixed(metric === 1 ? 2 : 3), width / 2, barY + barH + 26);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(
      metric === 1 ? 'avg matches' : 'fraction with no match',
      width / 2,
      barY + barH + 42,
    );
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.sum = 0;
    s.processed = 0;
    s.total = total;
    s.perm = [];
    accRef.current = 0;
    const small = total <= 24;
    const perFrame = small ? 1 / 5 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const p = shuffle();
        const f = fixedPoints(p);
        s.sum += metric === 1 ? f : f === 0 ? 1 : 0;
        s.processed++;
        s.perm = p;
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
    s.sum = 0;
    s.processed = 0;
    s.perm = [];
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
          <RangeField label="Shuffles" value={trials} min={20} max={20000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Shuffle {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
