import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';

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
  const lastRunRef = useRef(runSignal);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const accent = cssVar('--accent', '#b14dff');
    const accent2 = cssVar('--accent-2', '#ff4dd8');
    const text = cssVar('--text', '#b9b3cc');
    const textH = cssVar('--text-h', '#ffffff');
    const border = cssVar('--border', '#2c2542');
    ctx.clearRect(0, 0, width, height);

    const max = Math.max(1, ...s.counts);
    const sums = 11;
    const gap = 6;
    const left = 24;
    const right = 12;
    const plotW = width - left - right;
    const barW = (plotW - gap * (sums - 1)) / sums;
    const baseY = height - 26;
    const topY = 16;

    for (let i = 0; i < sums; i++) {
      const sum = i + 2;
      const c = s.counts[sum];
      const h = (c / max) * (baseY - topY);
      const x = left + i * (barW + gap);
      ctx.fillStyle = border;
      ctx.fillRect(x, topY, barW, baseY - topY);
      if (sum === 7) {
        ctx.save();
        ctx.shadowColor = accent2;
        ctx.shadowBlur = 14;
        const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        g.addColorStop(0, accent2);
        g.addColorStop(1, accent);
        ctx.fillStyle = g;
        ctx.fillRect(x, baseY - h, barW, h);
        ctx.restore();
      } else {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, baseY - h, barW, h);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = text;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(sum), x + barW / 2, baseY + 14);
    }

    ctx.fillStyle = textH;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Rolls: ${s.processed}`, left, 12);
    ctx.textAlign = 'right';
    ctx.fillText(`Last: ${s.last[0]} + ${s.last[1]} = ${s.last[0] + s.last[1]}`, width - right, 12);
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
    const small = total <= 20;
    const perFrame = small ? 1 : Math.ceil(total / 70);
    let frame = 0;
    const tick = () => {
      const step = small ? (frame % 6 === 0 ? 1 : 0) : perFrame;
      for (let i = 0; i < step && s.processed < total; i++) rollOnce();
      draw();
      frame++;
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
      <canvas ref={canvasRef} data-height="220" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>Rolls: {rolls}</span>
            <input
              type="range"
              min={1}
              max={2000}
              value={rolls}
              onChange={(e) => setRolls(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(rolls)}>
            Roll {rolls}×
          </button>
        </div>
      )}
    </div>
  );
}
