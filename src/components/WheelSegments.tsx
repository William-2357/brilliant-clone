import { useEffect, useRef, type PointerEvent } from 'react';
import { setupCanvas, simPalette } from '../simulations/canvasUtils';
import { segmentColor } from '../content/simData';

interface Props {
  /** Fixed prize values, one per segment. */
  payouts: number[];
  /** Current probabilities (sum to 1), one per segment. */
  probs: number[];
  onChange: (next: number[]) => void;
  /** Target expected payout (a fair wheel matches this). */
  target: number;
  disabled?: boolean;
  /** Reveal the resulting expected payout. Hidden during predict so the task isn't trivial. */
  reveal?: boolean;
}

const MIN_SEG = 0.05;

/**
 * "Set the wheel" input: a horizontal bar partitioned by probability with draggable
 * dividers, plus a live expected-payout gauge against the target. The learner drags
 * until the wheel's EV (computed) lands on the target — direct manipulation instead
 * of typing a number.
 */
export default function WheelSegments({ payouts, probs, onChange, target, disabled, reveal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<number | null>(null);
  const probsRef = useRef(probs);
  useEffect(() => {
    probsRef.current = probs;
  }, [probs]);

  const boundaries = (p: number[]) => {
    const b = [0];
    let acc = 0;
    for (const x of p) {
      acc += x;
      b.push(acc);
    }
    b[b.length - 1] = 1;
    return b;
  };
  const geom = (width: number) => ({ left: 14, right: width - 14, w: width - 28, barY: 18, barH: 46 });
  const ev = (p: number[]) => payouts.reduce((s, v, i) => s + v * (p[i] ?? 0), 0);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);
    const g = geom(width);
    const p = probsRef.current;
    const b = boundaries(p);
    const maxPay = Math.max(...payouts, 1);

    for (let i = 0; i < payouts.length; i++) {
      const x0 = g.left + b[i] * g.w;
      const x1 = g.left + b[i + 1] * g.w;
      ctx.fillStyle = segmentColor(i);
      ctx.fillRect(x0, g.barY, Math.max(0, x1 - x0 - 1), g.barH);
      const mid = (x0 + x1) / 2;
      if (x1 - x0 > 34) {
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText(`$${payouts[i]}`, mid, g.barY + g.barH / 2 - 7);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(`${Math.round((p[i] ?? 0) * 100)}%`, mid, g.barY + g.barH / 2 + 9);
      }
    }
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.left + 0.5, g.barY + 0.5, g.w, g.barH);

    for (let j = 1; j < payouts.length; j++) {
      const x = g.left + b[j] * g.w;
      ctx.fillStyle = disabled ? c.muted : c.textH;
      ctx.fillRect(x - 1.5, g.barY - 5, 3, g.barH + 10);
      ctx.beginPath();
      ctx.arc(x, g.barY - 9, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expected-payout gauge
    const gy = g.barY + g.barH + 34;
    const xOf = (val: number) => g.left + (Math.max(0, Math.min(maxPay, val)) / maxPay) * g.w;
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.left, gy);
    ctx.lineTo(g.right, gy);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';

    // The target isn't marked on the bar — it's given in the prompt — and the
    // learner's expected payout stays hidden until they lock in, so they can't
    // just drag until a readout matches.
    if (reveal) {
      const e = ev(p);
      const within = Math.abs(e - target) <= 0.4;
      const ex = xOf(e);
      ctx.fillStyle = within ? c.good : c.accent;
      ctx.beginPath();
      ctx.arc(ex, gy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.textBaseline = 'top';
      ctx.fillText(`your EV $${e.toFixed(2)}`, ex, gy + 8);
    } else {
      ctx.fillStyle = c.muted;
      ctx.textBaseline = 'top';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('lock in to reveal your expected payout', (g.left + g.right) / 2, gy + 8);
    }
  }

  function nearestBoundary(clientX: number): number | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const g = geom(rect.width);
    const b = boundaries(probsRef.current);
    let best: number | null = null;
    let bd = 16;
    for (let j = 1; j < payouts.length; j++) {
      const x = g.left + b[j] * g.w;
      const d = Math.abs(clientX - rect.left - x);
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return best;
  }

  function setFromPointer(clientX: number) {
    const canvas = canvasRef.current;
    const j = dragRef.current;
    if (!canvas || j == null) return;
    const rect = canvas.getBoundingClientRect();
    const g = geom(rect.width);
    const pos = Math.max(0, Math.min(1, (clientX - rect.left - g.left) / g.w));
    const p = probsRef.current.slice();
    const b = boundaries(p);
    const np = Math.max(b[j - 1] + MIN_SEG, Math.min(b[j + 1] - MIN_SEG, pos));
    p[j - 1] = np - b[j - 1];
    p[j] = b[j + 1] - np;
    onChange(p);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probs, disabled, payouts, target, reveal]);

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const j = nearestBoundary(e.clientX);
    if (j == null) return;
    dragRef.current = j;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPointer(e.clientX);
  }
  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled || dragRef.current == null) return;
    setFromPointer(e.clientX);
  }
  function onUp(e: PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <canvas
      ref={canvasRef}
      data-height="150"
      className="draw-canvas wheel-canvas"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
}
