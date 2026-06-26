import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { markovStationary } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 's01', label: 'P(state 1 → 2)', min: 0, max: 1, step: 0.05, default: 0.2 },
  { kind: 'range', key: 's10', label: 'P(state 2 → 1)', min: 0, max: 1, step: 0.05, default: 0.5 },
  {
    kind: 'toggle',
    key: 'targetState',
    label: 'Read time in',
    options: [
      { value: 0, label: 'State 1' },
      { value: 1, label: 'State 2' },
    ],
  },
];

/** Decode an n×n row-stochastic matrix from config keys t{i}{j}. */
function readMatrix(config: Record<string, number>): number[][] {
  const n = Math.max(2, Math.round(config.states ?? 2));
  const P: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(Math.max(0, config[`t${i}${j}`] ?? (i === j ? 1 : 0)));
    const sum = row.reduce((a, b) => a + b, 0) || 1;
    P.push(row.map((v) => v / sum));
  }
  return P;
}

/**
 * Markov chain: a token hops between states by the transition matrix, and the
 * long-run fraction of time in the target state converges to its stationary
 * probability (hidden until the run starts).
 */
export default function Markov({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [steps, setSteps] = useState(config.trials ?? 3000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  // Explore exposes two switch probs; rebuild a valid 2×2 row-stochastic matrix.
  const eff =
    mode === 'explore'
      ? {
          ...config,
          states: 2,
          t00: 1 - params.s01,
          t01: params.s01,
          t10: params.s10,
          t11: 1 - params.s10,
          targetState: params.targetState,
        }
      : config;

  const P = readMatrix(eff);
  const n = P.length;
  const target = Math.max(0, Math.min(n - 1, Math.round(eff.targetState ?? 0)));
  const stationary = markovStationary(P);
  const trueProb = stationary[target];

  const stateRef = useRef({ visits: new Array(n).fill(0), processed: 0, cur: 0, total: 0 });
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

  function nodePos(i: number, width: number) {
    const cx = width / 2;
    const cy = 78;
    if (n === 2) return { x: cx + (i === 0 ? -70 : 70), y: cy };
    const r = 58;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    // Edges
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j || P[i][j] < 0.02) continue;
        const a = nodePos(i, width);
        const b = nodePos(j, width);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    // Nodes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const pos = nodePos(i, width);
      const here = i === s.cur && s.processed > 0;
      ctx.fillStyle = here ? c.accent : c.surface3;
      ctx.strokeStyle = i === target ? c.accent2 : c.borderStrong;
      ctx.lineWidth = i === target ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = here ? '#fff' : c.text;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(String(i + 1), pos.x, pos.y + 1);
    }
    ctx.textBaseline = 'alphabetic';

    // Visit-fraction readout for the target state
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.visits[target] / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = height - 58;
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
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 22);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`time in state ${target + 1}`, width / 2, barY + barH + 37);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.visits = new Array(n).fill(0);
    s.processed = 0;
    s.cur = 0;
    s.total = total;
    accRef.current = 0;
    const perFrame = total <= 60 ? 1 : Math.ceil(total / 90);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        s.visits[s.cur]++;
        let r = Math.random();
        let nxt = n - 1;
        for (let j = 0; j < n; j++) {
          r -= P[s.cur][j];
          if (r <= 0) {
            nxt = j;
            break;
          }
        }
        s.cur = nxt;
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
    s.visits = new Array(n).fill(0);
    s.processed = 0;
    s.cur = 0;
    ensure();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.trials ?? steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="220" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Steps" value={steps} min={50} max={20000} onChange={setSteps} />
          <button type="button" className="btn" onClick={() => run(steps)}>
            Walk {steps} steps
          </button>
        </div>
      )}
    </div>
  );
}
