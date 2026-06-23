import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';

/**
 * Long-run frequency. Flips a coin `flips` times with bias `p` and animates the
 * running fraction of heads converging toward p. Small counts flip one-by-one
 * (animate-small); large counts process in chunks and animate the aggregate bar.
 */
export default function CoinFlip({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p = config.p ?? 0.5;
  const [flips, setFlips] = useState(config.flips ?? 100);
  const stateRef = useRef({ heads: 0, processed: 0, total: 0, p, running: false });
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const accent = cssVar('--accent', '#b14dff');
    const accent2 = cssVar('--accent-2', '#ff4dd8');
    const cyan = cssVar('--cyan', '#36e2ff');
    const text = cssVar('--text', '#b9b3cc');
    const textH = cssVar('--text-h', '#ffffff');
    const border = cssVar('--border', '#2c2542');

    ctx.clearRect(0, 0, width, height);
    const freq = s.processed > 0 ? s.heads / s.processed : 0;

    // Coin
    const cx = width / 2;
    const cy = 56;
    const r = 34;
    const showHeads = s.processed === 0 ? true : freq >= 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = accent2;
    ctx.shadowBlur = 24;
    const coinGrad = ctx.createLinearGradient(-r, -r, r, r);
    coinGrad.addColorStop(0, accent);
    coinGrad.addColorStop(1, accent2);
    ctx.beginPath();
    ctx.fillStyle = coinGrad;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(showHeads ? 'H' : 'T', 0, 1);
    ctx.restore();

    // Frequency bar
    const barX = 24;
    const barW = width - 48;
    const barY = 130;
    const barH = 26;
    const radius = barH / 2;
    ctx.fillStyle = border;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, radius);
    ctx.fill();
    if (freq > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, accent);
      barGrad.addColorStop(1, accent2);
      ctx.save();
      ctx.shadowColor = accent2;
      ctx.shadowBlur = 16;
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * freq), barH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Target line at p. Hidden during the predict phase of a problem (it would
    // reveal the answer); shown while exploring, or once a run has started.
    const showTarget = mode === 'explore' || s.processed > 0;
    if (showTarget) {
      const tx = barX + barW * p;
      ctx.save();
      ctx.strokeStyle = cyan;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, barY - 8);
      ctx.lineTo(tx, barY + barH + 8);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
      ctx.fillStyle = cyan;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`target ${p}`, tx, barY - 14);
    }

    // Readout
    ctx.save();
    ctx.shadowColor = accent2;
    ctx.shadowBlur = 18;
    ctx.fillStyle = textH;
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(freq.toFixed(3), width / 2, barY + barH + 42);
    ctx.restore();
    ctx.fillStyle = text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(
      `${s.heads} heads / ${s.processed} flips`,
      width / 2,
      barY + barH + 64,
    );
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.heads = 0;
    s.processed = 0;
    s.total = total;
    s.p = p;
    s.running = true;
    const small = total <= 20;
    const perFrame = small ? 1 : Math.ceil(total / 70);
    let frame = 0;

    const tick = () => {
      const step = small ? (frame % 6 === 0 ? 1 : 0) : perFrame;
      for (let i = 0; i < step && s.processed < total; i++) {
        if (Math.random() < s.p) s.heads++;
        s.processed++;
      }
      draw();
      frame++;
      if (s.processed < total) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        s.running = false;
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
    // Only run when the learner triggers a new run (runSignal changes after mount).
    // Mounting must never auto-run, even if runSignal is already > 0.
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.flips ?? flips);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="232" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>Flips: {flips}</span>
            <input
              type="range"
              min={1}
              max={1000}
              value={flips}
              onChange={(e) => setFlips(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(flips)}>
            Flip {flips}×
          </button>
        </div>
      )}
    </div>
  );
}
