import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { bertrandLongerThanSide } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'method',
    label: 'Random method',
    options: [
      { value: 0, label: 'Endpoints' },
      { value: 1, label: 'Radius' },
      { value: 2, label: 'Midpoint' },
    ],
  },
];

interface Chord {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  long: boolean;
}

/** Generate one chord of the unit circle by the given method, with a "longer than
 * the inscribed triangle's side (√3)" flag. */
function makeChord(method: number): Chord {
  if (method === 1) {
    // random radius: pick direction, midpoint distance uniform along radius
    const phi = Math.random() * 2 * Math.PI;
    const dist = Math.random();
    const half = Math.sqrt(Math.max(0, 1 - dist * dist));
    const mx = dist * Math.cos(phi);
    const my = dist * Math.sin(phi);
    const px = -Math.sin(phi);
    const py = Math.cos(phi);
    return { x1: mx - half * px, y1: my - half * py, x2: mx + half * px, y2: my + half * py, long: dist < 0.5 };
  }
  if (method === 2) {
    // random midpoint uniform in disk
    let mx: number;
    let my: number;
    do {
      mx = Math.random() * 2 - 1;
      my = Math.random() * 2 - 1;
    } while (mx * mx + my * my > 1);
    const dist = Math.sqrt(mx * mx + my * my);
    const half = Math.sqrt(Math.max(0, 1 - dist * dist));
    const len = Math.hypot(mx, my) || 1;
    const px = -my / len;
    const py = mx / len;
    return { x1: mx - half * px, y1: my - half * py, x2: mx + half * px, y2: my + half * py, long: dist < 0.5 };
  }
  // method 0: two random endpoints on the circle
  const a = Math.random() * 2 * Math.PI;
  const b = Math.random() * 2 * Math.PI;
  let diff = Math.abs(a - b);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return {
    x1: Math.cos(a),
    y1: Math.sin(a),
    x2: Math.cos(b),
    y2: Math.sin(b),
    long: diff > (2 * Math.PI) / 3,
  };
}

/**
 * Bertrand paradox: "random" chords longer than the inscribed equilateral
 * triangle's side. Three methods give 1/3, 1/2, 1/4 — same question, different
 * answers depending on what "random" means.
 */
export default function RandomChord({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 1500);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const method = Math.round(eff.method ?? 0);
  const trueProb = bertrandLongerThanSide(method);

  const stateRef = useRef({ long: 0, processed: 0, total: 0, chords: [] as Chord[] });
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
    const R = Math.min(height - 80, width - 40, 150) / 2;
    const cx = width / 2;
    const cy = 16 + R;

    ctx.strokeStyle = c.borderStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    for (const ch of s.chords) {
      ctx.strokeStyle = ch.long ? c.accent : c.muted;
      ctx.globalAlpha = ch.long ? 0.8 : 0.45;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + ch.x1 * R, cy + ch.y1 * R);
      ctx.lineTo(cx + ch.x2 * R, cy + ch.y2 * R);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.long / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = cy + R + 16;
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
      const tx = barX + barW * trueProb;
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
    ctx.fillText(`method ${method + 1}: longer than the side`, width / 2, barY + barH + 35);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.long = 0;
    s.processed = 0;
    s.total = total;
    s.chords = [];
    accRef.current = 0;
    const perFrame = total <= 30 ? 1 / 4 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const ch = makeChord(method);
        if (ch.long) s.long++;
        if (s.chords.length < 120) s.chords.push(ch);
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
    s.long = 0;
    s.processed = 0;
    s.chords = [];
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
      <canvas ref={canvasRef} data-height="250" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Chords" value={trials} min={20} max={8000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Draw {trials}
          </button>
        </div>
      )}
    </div>
  );
}
