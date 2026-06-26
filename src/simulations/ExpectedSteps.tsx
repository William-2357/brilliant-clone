import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import {
  expectedRollsUntilFace,
  expectedTrialsGeometric,
  expectedConsecutive,
} from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'kind',
    label: 'Stopping rule',
    options: [
      { value: 0, label: 'Roll to face' },
      { value: 1, label: 'Flip to head' },
      { value: 2, label: 'Run in a row' },
    ],
  },
  { kind: 'range', key: 'faces', label: 'Die faces', min: 2, max: 12, default: 6 },
  { kind: 'range', key: 'p', label: 'Head prob p', min: 0.05, max: 0.95, step: 0.05, default: 0.5 },
  { kind: 'range', key: 'run', label: 'Run length', min: 1, max: 4, default: 2 },
];

/**
 * First-step expectation: repeats a stopping rule and averages the number of
 * steps. kind 0 = rolls until a chosen die face; kind 1 = flips until the first
 * head (prob p); kind 2 = rolls until `run` of a face in a row. The running mean
 * converges to the computed expected value (hidden until the run starts).
 */
export default function ExpectedSteps({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 2000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const kind = Math.round(eff.kind ?? 0);
  const faces = Math.max(2, Math.round(eff.faces ?? 6));
  const p = Math.max(0.01, Math.min(1, eff.p ?? 0.5));
  const runLen = Math.max(1, Math.round(eff.run ?? 2));
  const trueValue =
    kind === 1
      ? expectedTrialsGeometric(p)
      : kind === 2
        ? expectedConsecutive(faces, runLen)
        : expectedRollsUntilFace(faces);
  const scaleMax = eff.scaleMax ?? trueValue * 2;

  const stateRef = useRef({ sum: 0, processed: 0, total: 0, last: 0 });
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

  function oneTrial(): number {
    if (kind === 1) {
      let s = 0;
      do {
        s++;
      } while (Math.random() >= p);
      return s;
    }
    if (kind === 2) {
      let s = 0;
      let c = 0;
      while (c < runLen) {
        s++;
        if (Math.floor(Math.random() * faces) === 0) c++;
        else c = 0;
      }
      return s;
    }
    let s = 0;
    do {
      s++;
    } while (Math.floor(Math.random() * faces) !== 0);
    return s;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);
    const reveal = mode === 'explore' || s.processed > 0;
    const mean = s.processed > 0 ? s.sum / s.processed : 0;

    ctx.textAlign = 'center';
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    const desc =
      kind === 1
        ? `flips to first head (p = ${p})`
        : kind === 2
          ? `rolls until ${runLen} in a row`
          : `rolls until a chosen face`;
    ctx.fillText(desc, width / 2, 26);
    if (s.processed > 0) {
      ctx.fillStyle = c.text;
      ctx.fillText(`last trial: ${s.last} steps`, width / 2, 44);
    }

    const barX = 24;
    const barW = width - 48;
    const barY = 70;
    const barH = 20;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();
    const frac = Math.max(0, Math.min(1, mean / scaleMax));
    if (frac > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * frac), barH, 10);
      ctx.fill();
    }
    if (reveal) {
      const tx = barX + barW * Math.min(1, trueValue / scaleMax);
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 7);
      ctx.lineTo(tx, barY + barH + 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = c.textH;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(mean.toFixed(2), width / 2, barY + barH + 34);
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`average steps over ${s.processed} trials`, width / 2, barY + barH + 52);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.sum = 0;
    s.processed = 0;
    s.total = total;
    accRef.current = 0;
    const small = total <= 24;
    const perFrame = small ? 1 / 6 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        s.last = oneTrial();
        s.sum += s.last;
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
    s.sum = 0;
    s.processed = 0;
    s.last = 0;
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
      <canvas ref={canvasRef} data-height="190" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Trials" value={trials} min={20} max={10000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Run {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
