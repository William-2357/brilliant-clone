import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { readWheel, segmentColor } from '../content/simData';
import { getSimSpeed, scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';

/**
 * Expected value. Spins a weighted prize wheel many times and tracks the running
 * average payout, which converges to the wheel's expected value. The wheel comes
 * from `config` so each problem can use a different one; the EV target line is
 * hidden during a problem's predict phase.
 */
export default function ExpectedValue({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheel = useMemo(() => readWheel(config), [config]);
  const scaleMax = useMemo(() => Math.max(...wheel.map((s) => s.value)) * 1.1 || 11, [wheel]);
  const spread = (config.spread ?? 0) > 0;
  const [spins, setSpins] = useState(200);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({ sum: 0, sumSq: 0, processed: 0, total: 0, angle: 0, lastValue: 0 });

  function sampleSegment(): number {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < wheel.length; i++) {
      acc += wheel[i].p;
      if (r < acc) return i;
    }
    return wheel.length - 1;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    // Wheel
    const cx = 96;
    const cy = height / 2;
    const r = 72;
    let start = s.angle;
    wheel.forEach((seg, i) => {
      const end = start + seg.p * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = segmentColor(i);
      ctx.fill();
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 2;
      ctx.stroke();
      const mid = (start + end) / 2;
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, cx + Math.cos(mid) * r * 0.62, cy + Math.sin(mid) * r * 0.62);
      start = end;
    });
    // Hub
    ctx.beginPath();
    ctx.fillStyle = c.surface;
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pointer
    ctx.fillStyle = c.textH;
    ctx.beginPath();
    ctx.moveTo(cx + r + 4, cy - 8);
    ctx.lineTo(cx + r + 4, cy + 8);
    ctx.lineTo(cx + r - 8, cy);
    ctx.closePath();
    ctx.fill();

    // Running average panel
    const avg = s.processed > 0 ? s.sum / s.processed : 0;
    const panelX = 188;
    const panelW = width - panelX - 16;
    const baseY = cy + 30;
    const barX = panelX;
    const barW = panelW;
    const barY = baseY;
    const barH = 22;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 11);
    ctx.fill();
    if (avg > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, (barW * Math.min(avg, scaleMax)) / scaleMax), barH, 11);
      ctx.fill();
    }

    // Spread band (variance lessons): ±1 SD bracket around the running average,
    // revealed once a run starts. There is no EV target line — for a plain EV
    // problem only the running average remains; in spread mode the standard
    // deviation is what the learner predicts, so it becomes the headline.
    const sd = s.processed > 0 ? Math.sqrt(Math.max(0, s.sumSq / s.processed - avg * avg)) : 0;
    if (spread && s.processed > 0) {
      const loX = barX + (barW * Math.max(0, avg - sd)) / scaleMax;
      const hiX = barX + (barW * Math.min(scaleMax, avg + sd)) / scaleMax;
      ctx.strokeStyle = c.accentStrong;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loX, barY - 6);
      ctx.lineTo(hiX, barY - 6);
      ctx.moveTo(loX, barY - 9);
      ctx.lineTo(loX, barY - 3);
      ctx.moveTo(hiX, barY - 9);
      ctx.lineTo(hiX, barY - 3);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    if (spread) {
      ctx.fillStyle = c.textH;
      ctx.font = '700 26px system-ui, sans-serif';
      ctx.fillText(s.processed > 0 ? `σ ≈ ${sd.toFixed(2)}` : 'σ ≈ —', panelX, baseY - 18);
      ctx.fillStyle = c.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(
        s.processed > 0 ? `spread · mean ≈ ${avg.toFixed(2)} over ${s.processed} spins` : 'standard deviation (spread)',
        panelX,
        baseY - 38,
      );
    } else {
      ctx.fillStyle = c.textH;
      ctx.font = '700 26px system-ui, sans-serif';
      ctx.fillText(`$${avg.toFixed(3)}`, panelX, baseY - 18);
      ctx.fillStyle = c.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`avg over ${s.processed} spins`, panelX, baseY - 38);
    }
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.sum = 0;
    s.sumSq = 0;
    s.processed = 0;
    s.total = total;
    accRef.current = 0;
    const small = total <= 20;
    const perFrame = small ? 1 / 5 : Math.ceil(total / 80);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const seg = wheel[sampleSegment()];
        s.sum += seg.value;
        s.sumSq += seg.value * seg.value;
        s.processed++;
      }
      // Spin the wheel at a steady, readable pace (scaled by the global speed)
      // while the batch runs, rather than by the number of samples processed.
      if (s.processed < total) s.angle += 0.22 * getSimSpeed();
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
      run(500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="200" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField label="Spins" value={spins} min={1} max={1000} onChange={setSpins} />
          <button type="button" className="btn" onClick={() => run(spins)}>
            Spin {spins}×
          </button>
        </div>
      )}
    </div>
  );
}
