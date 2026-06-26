import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { extinctionProbability, offspringMean } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'p0', label: 'P(0 offspring)', min: 0, max: 1, step: 0.05 },
  { kind: 'range', key: 'p1', label: 'P(1 offspring)', min: 0, max: 1, step: 0.05 },
  { kind: 'range', key: 'p2', label: 'P(2 offspring)', min: 0, max: 1, step: 0.05 },
];

/** Offspring PMF from config p0, p1, p2, … (normalized). */
function readOffspring(config: Record<string, number>): number[] {
  const max = Math.max(2, Math.round(config.maxOffspring ?? 2));
  const out: number[] = [];
  for (let i = 0; i <= max; i++) out.push(Math.max(0, config[`p${i}`] ?? 0));
  const sum = out.reduce((a, b) => a + b, 0) || 1;
  return out.map((v) => v / sum);
}

/**
 * Galton–Watson branching process: each individual leaves a random number of
 * offspring. The fraction of lineages that die out converges to the extinction
 * probability (hidden until the run starts). The last lineage's size per
 * generation is sketched as bars.
 */
export default function Branching({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 2000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, maxOffspring: 2, ...params } : config;

  const probs = readOffspring(eff);
  const mean = offspringMean(probs);
  const trueExt = extinctionProbability(probs);
  const maxGen = Math.max(8, Math.round(config.maxGen ?? 30));
  const cap = 2000;

  const stateRef = useRef({ extinct: 0, processed: 0, total: 0, lastSizes: [] as number[] });
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

  function sampleOffspring(): number {
    let r = Math.random();
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) return i;
    }
    return probs.length - 1;
  }

  function oneTrial(): boolean {
    let pop = 1;
    const sizes = [1];
    for (let g = 0; g < maxGen && pop > 0 && pop < cap; g++) {
      let next = 0;
      for (let k = 0; k < pop; k++) next += sampleOffspring();
      pop = next;
      sizes.push(Math.min(pop, cap));
    }
    stateRef.current.lastSizes = sizes;
    return pop === 0;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    // Last lineage population per generation (log-ish scaled)
    const sizes = s.lastSizes;
    const plot = { x: 16, y: 14, w: width - 32, h: 84 };
    if (sizes.length > 1) {
      const peak = Math.max(...sizes, 1);
      const bw = plot.w / sizes.length;
      for (let g = 0; g < sizes.length; g++) {
        const bh = (Math.sqrt(sizes[g]) / Math.sqrt(peak)) * plot.h;
        ctx.fillStyle = sizes[g] === 0 ? c.bad : c.accent;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(plot.x + g * bw + 1, plot.y + plot.h - bh, Math.max(1, bw - 2), bh, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`last lineage by generation (mean offspring m = ${mean.toFixed(2)})`, width / 2, plot.y + plot.h + 16);

    // Extinction estimate
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.extinct / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = plot.y + plot.h + 30;
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
      const tx = barX + barW * Math.min(1, trueExt);
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
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 22);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('fraction extinct', width / 2, barY + barH + 37);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.extinct = 0;
    s.processed = 0;
    s.total = total;
    accRef.current = 0;
    const perFrame = total <= 24 ? 1 / 4 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        if (oneTrial()) s.extinct++;
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
    s.extinct = 0;
    s.processed = 0;
    s.lastSizes = [];
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
      <canvas ref={canvasRef} data-height="200" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Lineages" value={trials} min={20} max={10000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Run {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
