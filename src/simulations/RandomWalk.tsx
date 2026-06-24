import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { randomWalkDrift, randomWalkRMS } from '../lib/probability';
import { scaledStep } from '../lib/simSpeed';

/** Auto path count when none is specified (fewer paths for longer walks). */
function autoWalks(n: number): number {
  return Math.min(100, Math.max(40, Math.round(9000 / Math.max(20, n))));
}

/**
 * 1-D random walk. Each step moves +1 with probability `p`, else −1. Many walks
 * fan out from the origin; the fan's center drifts linearly (n·(2p−1)) while its
 * width grows only like √n — visualized by the ±2·SD envelope drawn behind the
 * paths once a run starts. The envelope + drift line give away the answer, so
 * they stay hidden until the walk runs. A large hidden batch backs the precise
 * average / spread readouts; only a modest fan is animated to hold 60 FPS.
 */
export default function RandomWalk({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [steps, setSteps] = useState(config.steps ?? 100);
  const [walks, setWalks] = useState(config.walks ?? 60);
  const [p, setP] = useState(config.p ?? 0.5);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({
    n: config.steps ?? 100,
    walks: [] as Int16Array[],
    revealed: 0,
    mean: 0,
    sd: 0,
    settled: false,
  });

  function simulate(n: number, k: number) {
    const s = stateRef.current;
    s.n = n;
    s.revealed = 0;
    s.settled = false;
    s.walks = [];
    for (let w = 0; w < k; w++) {
      const arr = new Int16Array(n + 1);
      let pos = 0;
      for (let t = 1; t <= n; t++) {
        pos += Math.random() < p ? 1 : -1;
        arr[t] = pos;
      }
      s.walks.push(arr);
    }
    // A much larger batch (finals only) gives a precise mean + spread readout.
    const STAT = 3000;
    let sum = 0;
    let sumSq = 0;
    for (let w = 0; w < STAT; w++) {
      let pos = 0;
      for (let t = 0; t < n; t++) pos += Math.random() < p ? 1 : -1;
      sum += pos;
      sumSq += pos * pos;
    }
    s.mean = sum / STAT;
    s.sd = Math.sqrt(Math.max(0, sumSq / STAT - s.mean * s.mean));
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);
    const n = s.n;
    const reveal = s.revealed > 0;
    const drift = randomWalkDrift(n, p);
    const sd = randomWalkRMS(n, p);

    const plotLeft = 38;
    const plotRight = width - 14;
    const plotTop = 44;
    const plotBottom = height - 22;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // Symmetric scale while predicting (so the axis can't hint the drift); once
    // the walk runs, recenter on the drift to frame the fan tightly.
    let lo: number;
    let hi: number;
    if (reveal) {
      lo = Math.min(0, drift - 3.2 * sd) - 1;
      hi = Math.max(0, drift + 3.2 * sd) + 1;
    } else {
      const half = Math.abs(drift) + 3.2 * sd + 1;
      lo = -half;
      hi = half;
    }
    const span = Math.max(1, hi - lo);
    const yToPx = (pos: number) => plotBottom - ((pos - lo) / span) * plotH;
    const xToPx = (t: number) => plotLeft + (t / Math.max(1, n)) * plotW;

    // Zero (start) line + position labels
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, yToPx(0));
    ctx.lineTo(plotRight, yToPx(0));
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', plotLeft - 6, yToPx(0));

    // Step-count ticks along the bottom
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of [0, Math.round(n / 2), n]) {
      ctx.fillText(String(t), xToPx(t), plotBottom + 5);
    }

    // ±2 SD envelope + drift line (hidden until the walk runs)
    if (reveal) {
      const pts = 80;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const t = (i / pts) * n;
        const c_t = randomWalkDrift(t, p);
        const sd_t = randomWalkRMS(t, p);
        ctx.lineTo(xToPx(t), yToPx(c_t + 2 * sd_t));
      }
      for (let i = pts; i >= 0; i--) {
        const t = (i / pts) * n;
        const c_t = randomWalkDrift(t, p);
        const sd_t = randomWalkRMS(t, p);
        ctx.lineTo(xToPx(t), yToPx(c_t - 2 * sd_t));
      }
      ctx.closePath();
      ctx.fillStyle = c.accentBg;
      ctx.fill();

      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xToPx(0), yToPx(0));
      ctx.lineTo(xToPx(n), yToPx(drift));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Walk paths revealed so far
    if (reveal) {
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.2;
      const upto = Math.min(s.revealed, n);
      for (const walk of s.walks) {
        ctx.beginPath();
        ctx.moveTo(xToPx(0), yToPx(walk[0]));
        for (let t = 1; t <= upto; t++) ctx.lineTo(xToPx(t), yToPx(walk[t]));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Header / readouts
    ctx.fillStyle = c.textH;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${s.walks.length} walks · ${n} steps · p = ${p.toFixed(2)}`, plotLeft, 18);
    if (s.settled) {
      ctx.textAlign = 'right';
      ctx.fillStyle = c.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(
        `avg position ${s.mean >= 0 ? '+' : ''}${s.mean.toFixed(1)} · spread ±${s.sd.toFixed(1)}`,
        plotRight,
        18,
      );
    }

    // Plot frame
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(plotLeft + 0.5, plotTop + 0.5, plotW, plotH);
  }

  function run(n: number, k: number) {
    cancelAnimationFrame(rafRef.current);
    simulate(n, k);
    const s = stateRef.current;
    const perFrame = Math.max(1, Math.ceil(n / 90));
    accRef.current = 0;
    const tick = () => {
      s.revealed = Math.min(n, s.revealed + scaledStep(accRef, perFrame));
      draw();
      if (s.revealed < n) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!s.settled) {
        s.settled = true;
        onSettled?.();
      }
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
      run(config.steps ?? steps, config.walks ?? autoWalks(config.steps ?? steps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="300" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>Steps: {steps}</span>
            <input
              type="range"
              min={10}
              max={400}
              step={5}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
            />
          </label>
          <label className="sim-slider">
            <span>Walks: {walks}</span>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={walks}
              onChange={(e) => setWalks(Number(e.target.value))}
            />
          </label>
          <label className="sim-slider">
            <span>Step-right chance: {p.toFixed(2)}</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(steps, walks)}>
            Send {walks} {walks === 1 ? 'walk' : 'walks'}
          </button>
        </div>
      )}
    </div>
  );
}
