import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';
import { readWheel, segmentColor, wheelEV } from '../content/simData';

/**
 * Expected value. Spins a weighted prize wheel many times and tracks the running
 * average payout, which converges to the wheel's expected value. The wheel comes
 * from `config` so each problem can use a different one; the EV target line is
 * hidden during a problem's predict phase.
 */
export default function ExpectedValue({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheel = useMemo(() => readWheel(config), [config]);
  const EV = useMemo(() => wheelEV(wheel), [wheel]);
  const scaleMax = useMemo(() => Math.max(...wheel.map((s) => s.value)) * 1.1 || 11, [wheel]);
  const [spins, setSpins] = useState(200);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({ sum: 0, processed: 0, total: 0, angle: 0, lastValue: 0 });

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
    const cyan = cssVar('--cyan', '#36e2ff');
    const text = cssVar('--text', '#b9b3cc');
    const textH = cssVar('--text-h', '#ffffff');
    const border = cssVar('--border', '#2c2542');
    ctx.clearRect(0, 0, width, height);

    // Wheel
    const cx = 96;
    const cy = height / 2;
    const r = 72;
    let start = s.angle;
    ctx.save();
    ctx.shadowColor = 'rgba(177,77,255,0.5)';
    ctx.shadowBlur = 18;
    wheel.forEach((seg, i) => {
      const end = start + seg.p * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = segmentColor(i);
      ctx.fill();
      const mid = (start + end) / 2;
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, cx + Math.cos(mid) * r * 0.62, cy + Math.sin(mid) * r * 0.62);
      start = end;
    });
    ctx.restore();
    // Pointer
    ctx.fillStyle = textH;
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
    ctx.fillStyle = border;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 11);
    ctx.fill();
    if (avg > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#b14dff');
      grad.addColorStop(1, '#ff4dd8');
      ctx.save();
      ctx.shadowColor = '#ff4dd8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, (barW * Math.min(avg, scaleMax)) / scaleMax), barH, 11);
      ctx.fill();
      ctx.restore();
    }

    // EV target line (hidden during predict phase)
    const showTarget = mode === 'explore' || s.processed > 0;
    if (showTarget) {
      const tx = barX + (barW * EV) / scaleMax;
      ctx.strokeStyle = cyan;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, barY - 8);
      ctx.lineTo(tx, barY + barH + 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.fillStyle = cyan;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EV ${EV.toFixed(2)}`, tx, barY - 12);
    }

    ctx.fillStyle = textH;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${avg.toFixed(3)}`, panelX, baseY - 18);
    ctx.fillStyle = text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`avg over ${s.processed} spins`, panelX, baseY - 38);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.sum = 0;
    s.processed = 0;
    s.total = total;
    const small = total <= 20;
    const perFrame = small ? 1 : Math.ceil(total / 80);
    let frame = 0;
    const tick = () => {
      const step = small ? (frame % 5 === 0 ? 1 : 0) : perFrame;
      for (let i = 0; i < step && s.processed < total; i++) {
        const seg = wheel[sampleSegment()];
        s.sum += seg.value;
        s.processed++;
        s.angle += 0.6;
      }
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
          <label className="sim-slider">
            <span>Spins: {spins}</span>
            <input
              type="range"
              min={10}
              max={1000}
              value={spins}
              onChange={(e) => setSpins(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(spins)}>
            Spin {spins}×
          </button>
        </div>
      )}
    </div>
  );
}
