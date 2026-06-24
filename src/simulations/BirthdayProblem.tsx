import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { birthdayProb } from '../lib/probability';
import { scaledStep } from '../lib/simSpeed';

const MAX_N = 50;

/**
 * Birthday problem. Simulates many random rooms of `people` and tracks the
 * fraction that contain at least one shared birthday, converging to the
 * (surprisingly high) theoretical probability. The theoretical curve is hidden
 * during a problem's predict phase so it cannot reveal the answer.
 */
export default function BirthdayProblem({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [people, setPeople] = useState(config.people ?? 23);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({ collisions: 0, processed: 0, total: 0, n: config.people ?? 23 });

  function hasSharedBirthday(n: number): boolean {
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      const b = Math.floor(Math.random() * 365);
      if (seen.has(b)) return true;
      seen.add(b);
    }
    return false;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    const padL = 40;
    const padR = 16;
    const padT = 28;
    const padB = 32;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const xOf = (n: number) => padL + ((n - 2) / (MAX_N - 2)) * plotW;
    const yOf = (p: number) => padT + (1 - p) * plotH;

    const n = mode === 'explore' ? people : s.n;
    const revealCurve = mode === 'explore' || s.processed > 0;

    // Plot background grid
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    for (let p = 0.25; p < 1; p += 0.25) {
      ctx.beginPath();
      ctx.moveTo(padL, yOf(p));
      ctx.lineTo(padL + plotW, yOf(p));
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = c.border;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      ctx.fillText(`${Math.round(p * 100)}%`, padL - 6, yOf(p));
    });

    // X-axis ticks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [2, 15, 30, 45, 50].forEach((k) => {
      ctx.fillText(String(k), xOf(k), padT + plotH + 4);
    });
    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('people in room', padL + plotW / 2, height - 6);

    // Theoretical curve
    if (revealCurve) {
      ctx.strokeStyle = c.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 2; k <= MAX_N; k++) {
        const x = xOf(k);
        const y = yOf(birthdayProb(k));
        if (k === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Marker at current n
    ctx.strokeStyle = c.borderStrong;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xOf(n), padT);
    ctx.lineTo(xOf(n), padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Simulated fraction point
    const frac = s.processed > 0 ? s.collisions / s.processed : 0;
    if (s.processed > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(xOf(n), yOf(frac), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Readout — top-right so it never overlaps the curve
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c.textH;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? frac.toFixed(3) : `${n} people`,
      width - padR,
      padT - 8,
    );
    ctx.fillStyle = c.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? `${s.collisions} shared / ${s.processed} rooms` : 'press run to simulate',
      width - padR,
      padT + 8,
    );
  }

  function run(n: number, trials: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.collisions = 0;
    s.processed = 0;
    s.total = trials;
    s.n = n;
    accRef.current = 0;
    const tick = () => {
      const chunk = Math.ceil(trials / 70);
      const todo = scaledStep(accRef, chunk);
      for (let i = 0; i < todo && s.processed < trials; i++) {
        if (hasSharedBirthday(n)) s.collisions++;
        s.processed++;
      }
      draw();
      if (s.processed < trials) rafRef.current = requestAnimationFrame(tick);
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
      run(config.people ?? people, config.trials ?? 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="260" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>People in room: {people}</span>
            <input
              type="range"
              min={2}
              max={MAX_N}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(people, 2000)}>
            Simulate 2000 rooms
          </button>
        </div>
      )}
    </div>
  );
}
