import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { totalProbability, type Branch } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'w0', label: 'Urn 1 weight', min: 1, max: 10 },
  { kind: 'range', key: 'p0', label: 'Urn 1 P(target)', min: 0, max: 1, step: 0.05 },
  { kind: 'range', key: 'w1', label: 'Urn 2 weight', min: 1, max: 10 },
  { kind: 'range', key: 'p1', label: 'Urn 2 P(target)', min: 0, max: 1, step: 0.05 },
];

/** Decode urns from config: urns count U, then w0/p0, w1/p1, … (weight, target prob). */
function readUrns(config: Record<string, number>): Branch[] {
  const U = Math.max(1, Math.round(config.urns ?? 2));
  const out: Branch[] = [];
  for (let i = 0; i < U; i++) {
    out.push({ weight: Math.max(0, config[`w${i}`] ?? 1), p: Math.max(0, Math.min(1, config[`p${i}`] ?? 0.5)) });
  }
  return out;
}

/**
 * Two-stage sampler for the law of total probability: pick an urn by weight, then
 * draw a target-colored ball with that urn's probability. The running fraction of
 * target balls converges to the weighted sum Σ P(urn)·P(target|urn).
 */
export default function UrnTree({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 1500);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, urns: 2, ...params } : config;

  const urns = readUrns(eff);
  const wSum = urns.reduce((a, b) => a + b.weight, 0) || 1;
  const trueProb = totalProbability(urns);

  const stateRef = useRef({ hits: 0, processed: 0, total: 0, lastUrn: -1, lastHit: false });
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

  function pickUrn(): number {
    let r = Math.random() * wSum;
    for (let i = 0; i < urns.length; i++) {
      r -= urns[i].weight;
      if (r <= 0) return i;
    }
    return urns.length - 1;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    // Urns
    const n = urns.length;
    const uw = Math.min(72, (width - 24) / n - 12);
    const gap = 12;
    const totalW = n * uw + (n - 1) * gap;
    let x = (width - totalW) / 2;
    const top = 20;
    const uh = 64;
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const active = i === s.lastUrn && s.processed > 0;
      ctx.fillStyle = c.surface3;
      ctx.strokeStyle = active ? c.accent : c.borderStrong;
      ctx.lineWidth = active ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.roundRect(x, top, uw, uh, 8);
      ctx.fill();
      ctx.stroke();
      // fill proportion = p_i (share of target balls)
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = 0.85;
      const fh = uh * urns[i].p;
      ctx.beginPath();
      ctx.roundRect(x + 4, top + uh - fh - 4 + 4, uw - 8, Math.max(0, fh - 0), 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`w ${(urns[i].weight / wSum).toFixed(2)}`, x + uw / 2, top + uh + 14);
      x += uw + gap;
    }

    ctx.fillStyle = c.textH;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('P(target ball) = ?', width / 2, top + uh + 34);

    // Estimate
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.hits / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = top + uh + 46;
    const barH = 18;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();
    if (estimate > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * estimate), barH, 9);
      ctx.fill();
    }
    if (reveal) {
      const tx = barX + barW * trueProb;
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
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 24);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${s.hits} of ${s.processed}`, width / 2, barY + barH + 40);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.hits = 0;
    s.processed = 0;
    s.total = total;
    s.lastUrn = -1;
    accRef.current = 0;
    const small = total <= 24;
    const perFrame = small ? 1 / 6 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const u = pickUrn();
        const hit = Math.random() < urns[u].p;
        s.lastUrn = u;
        s.lastHit = hit;
        if (hit) s.hits++;
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
    s.lastUrn = -1;
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
          <RangeField label="Draws" value={trials} min={20} max={8000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Draw {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
