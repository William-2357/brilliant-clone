import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';
import { birthdayProb } from '../lib/probability';

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
    const accent2 = cssVar('--accent-2', '#ff4dd8');
    const cyan = cssVar('--cyan', '#36e2ff');
    const text = cssVar('--text', '#b9b3cc');
    const textH = cssVar('--text-h', '#ffffff');
    const border = cssVar('--border', '#2c2542');
    ctx.clearRect(0, 0, width, height);

    const padL = 34;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const xOf = (n: number) => padL + ((n - 2) / (MAX_N - 2)) * plotW;
    const yOf = (p: number) => padT + (1 - p) * plotH;

    // Axes
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach((p) => {
      ctx.fillText(p.toFixed(1), padL - 5, yOf(p) + 3);
    });
    ctx.textAlign = 'center';
    ctx.fillText('people in room', padL + plotW / 2, height - 6);

    const n = mode === 'explore' ? people : s.n;
    const revealCurve = mode === 'explore' || s.processed > 0;

    // Theoretical curve
    if (revealCurve) {
      ctx.strokeStyle = cyan;
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
    ctx.strokeStyle = border;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xOf(n), padT);
    ctx.lineTo(xOf(n), padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Simulated fraction point
    const frac = s.processed > 0 ? s.collisions / s.processed : 0;
    if (s.processed > 0) {
      ctx.fillStyle = accent2;
      ctx.shadowColor = accent2;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(xOf(n), yOf(frac), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Readout
    ctx.fillStyle = textH;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      s.processed > 0 ? frac.toFixed(3) : `room of ${n}`,
      padL + 6,
      padT + 22,
    );
    ctx.fillStyle = text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? `${s.collisions} shared / ${s.processed} rooms` : 'press run to simulate',
      padL + 6,
      padT + 40,
    );
  }

  function run(n: number, trials: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.collisions = 0;
    s.processed = 0;
    s.total = trials;
    s.n = n;
    const tick = () => {
      const chunk = Math.ceil(trials / 70);
      for (let i = 0; i < chunk && s.processed < trials; i++) {
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
      <canvas ref={canvasRef} data-height="240" className="sim-canvas" />
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
