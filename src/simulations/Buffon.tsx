import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { buffonProbability } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'L', label: 'Needle length L', min: 0.1, max: 1, step: 0.05 },
];

/**
 * Buffon's needle: drop length-L needles across lines spaced d = 1 apart. The
 * crossing fraction converges to 2L/(πd), which also yields an estimate of π.
 */
export default function Buffon({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 2000);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const L = Math.max(0.1, Math.min(1, eff.L ?? 1));
  const trueProb = buffonProbability(L, 1);
  const ROWS = 4;

  const stateRef = useRef({
    cross: 0,
    processed: 0,
    total: 0,
    needles: [] as { x: number; y: number; band: number; ang: number; hit: boolean }[],
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

    const rows = ROWS;
    const top = 14;
    const gap = 26;
    const margin = 18;
    // ruled lines
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(16, top + i * gap);
      ctx.lineTo(width - 16, top + i * gap);
      ctx.stroke();
    }
    // Draw each needle at its true position: a random x, a random band, and its
    // center at offset n.y within that band — so a "hit" needle's vertical reach
    // ((L/2)·sinθ) genuinely touches the nearest line.
    for (const n of s.needles) {
      const cx = margin + n.x * (width - 2 * margin);
      const cy = top + (n.band + n.y) * gap;
      const halfX = (Math.cos(n.ang) * L * gap) / 2;
      const halfY = (Math.sin(n.ang) * L * gap) / 2;
      ctx.strokeStyle = n.hit ? c.accent : c.muted;
      ctx.globalAlpha = n.hit ? 0.95 : 0.45;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - halfX, cy - halfY);
      ctx.lineTo(cx + halfX, cy + halfY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.cross / s.processed : 0;
    const piEst = estimate > 0 ? (2 * L) / estimate : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = top + rows * gap + 20;
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
      const tx = barX + barW * Math.min(1, trueProb);
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
    ctx.fillText(reveal && piEst > 0 ? `crossing rate · π ≈ ${piEst.toFixed(3)}` : 'crossing rate', width / 2, barY + barH + 35);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.cross = 0;
    s.processed = 0;
    s.total = total;
    s.needles = [];
    accRef.current = 0;
    const perFrame = total <= 30 ? 1 / 4 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const y = Math.random(); // center offset within a band (0..1 of spacing d)
        const ang = Math.random() * Math.PI;
        const dist = Math.min(y, 1 - y);
        const hit = (L / 2) * Math.sin(ang) >= dist;
        if (hit) s.cross++;
        if (s.needles.length < 260)
          s.needles.push({ x: Math.random(), y, band: Math.floor(Math.random() * ROWS), ang, hit });
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
    s.cross = 0;
    s.processed = 0;
    s.needles = [];
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
      <canvas ref={canvasRef} data-height="210" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Needles" value={trials} min={20} max={20000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Drop {trials}
          </button>
        </div>
      )}
    </div>
  );
}
