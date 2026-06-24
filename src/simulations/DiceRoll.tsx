import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';

/** Theoretical P(sum = k) for two fair dice, k = 2..12. */
const THEORY = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((w) => w / 36);

/**
 * Sum of two independent dice. Builds a histogram of sums 2..12 that converges
 * to the triangular distribution. Small counts roll one-by-one; large counts
 * process in chunks and animate the histogram.
 */
export default function DiceRoll({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rolls, setRolls] = useState(config.rolls ?? 100);
  const stateRef = useRef({
    counts: new Array(13).fill(0) as number[],
    processed: 0,
    total: 0,
    last: [1, 1] as [number, number],
  });
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    const sums = 11;
    const gap = 5;
    const left = 28;
    const right = 14;
    const plotW = width - left - right;
    const barW = (plotW - gap * (sums - 1)) / sums;
    const baseY = height - 30;
    const topY = 36;
    const plotH = baseY - topY;
    const max = Math.max(1, ...s.counts.slice(2));
    const showTheory = mode === 'explore' || s.processed > 0;

    // Faint theoretical triangle (target shape)
    if (showTheory) {
      ctx.fillStyle = c.accentBg;
      for (let i = 0; i < sums; i++) {
        const th = THEORY[i] * s.processed;
        const h = s.processed > 0 ? (th / max) * plotH : THEORY[i] * plotH * 0.85;
        const x = left + i * (barW + gap);
        ctx.beginPath();
        ctx.roundRect(x, baseY - h, barW, h, [4, 4, 0, 0]);
        ctx.fill();
      }
    }

    // Bars
    for (let i = 0; i < sums; i++) {
      const sum = i + 2;
      const count = s.counts[sum];
      const h = (count / max) * plotH;
      const x = left + i * (barW + gap);

      // Track
      ctx.fillStyle = c.surface3;
      ctx.beginPath();
      ctx.roundRect(x, topY, barW, plotH, 4);
      ctx.fill();

      if (count > 0) {
        const isPeak = sum === 7;
        const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        grad.addColorStop(0, isPeak ? c.accent2 : c.accent);
        grad.addColorStop(1, isPeak ? c.accentStrong : c.accentStrong);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, baseY - h, barW, h, [5, 5, 0, 0]);
        ctx.fill();
      }

      // Sum label
      ctx.fillStyle = sum === 7 ? c.accentStrong : c.muted;
      ctx.font = sum === 7 ? '700 11px system-ui, sans-serif' : '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(sum), x + barW / 2, baseY + 14);
    }

    // Baseline
    ctx.strokeStyle = c.border;
    ctx.beginPath();
    ctx.moveTo(left, baseY + 0.5);
    ctx.lineTo(left + plotW, baseY + 0.5);
    ctx.stroke();

    // Header
    ctx.fillStyle = c.textH;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Rolls: ${s.processed}`, left, 14);
    // Only show the most recent roll once at least one has actually happened —
    // otherwise the seed value [1, 1] reads as a misleading "Last: 1 + 1 = 2".
    if (s.processed > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = c.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Last: ${s.last[0]} + ${s.last[1]} = ${s.last[0] + s.last[1]}`, width - right, 14);
    }

    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sum of two dice', left + plotW / 2, height - 6);
  }

  function rollOnce() {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    const s = stateRef.current;
    s.counts[a + b]++;
    s.last = [a, b];
    s.processed++;
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.counts = new Array(13).fill(0);
    s.processed = 0;
    s.total = total;
    accRef.current = 0;
    const small = total <= 20;
    const perFrame = small ? 1 / 6 : Math.ceil(total / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) rollOnce();
      draw();
      if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.rolls ?? rolls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="240" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField label="Rolls" value={rolls} min={1} max={2000} onChange={setRolls} />
          <button type="button" className="btn" onClick={() => run(rolls)}>
            Roll {rolls}×
          </button>
        </div>
      )}
    </div>
  );
}
