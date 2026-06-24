import { useEffect, useRef, type PointerEvent } from 'react';
import { setupCanvas, simPalette } from '../simulations/canvasUtils';

interface Props {
  /** Category labels, one per bar. */
  categories: (number | string)[];
  /** Bar heights in [0, 1], one per category. */
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  /** True normalized distribution to overlay (peak-scaled) once revealed. */
  truth?: number[];
  showTruth?: boolean;
}

/**
 * Sketch-a-distribution input. The learner drags across the pad to set each
 * bar's height before the simulation reveals the real shape. Heights are
 * compared by total-variation distance after normalizing to a distribution, so
 * the *shape* is graded, not the absolute scale.
 */
export default function DrawDistribution({
  categories,
  value,
  onChange,
  disabled,
  truth,
  showTruth,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  // Mirror the latest value into a ref so pointer handlers read fresh heights
  // without being recreated each render. Synced in an effect (never in render).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function geom(width: number, height: number) {
    const left = 8;
    const right = 8;
    const top = 10;
    const bottom = 22;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const n = categories.length;
    const stride = plotW / n;
    return { left, top, plotH, n, stride };
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);
    const g = geom(width, height);
    const baseY = g.top + g.plotH;

    for (let i = 0; i < g.n; i++) {
      const x = g.left + i * g.stride;
      const h = Math.max(0, Math.min(1, value[i] ?? 0)) * g.plotH;
      ctx.fillStyle = c.surface3;
      ctx.fillRect(x + 1, g.top, g.stride - 2, g.plotH);
      ctx.fillStyle = disabled ? c.muted : c.accent;
      ctx.fillRect(x + 1, baseY - h, g.stride - 2, h);
    }

    if (showTruth && truth && truth.length) {
      const maxT = Math.max(...truth) || 1;
      ctx.strokeStyle = c.accent2;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < g.n; i++) {
        const cx = g.left + i * g.stride + g.stride / 2;
        const y = baseY - (truth[i] / maxT) * g.plotH;
        if (i === 0) ctx.moveTo(cx, y);
        else ctx.lineTo(cx, y);
      }
      ctx.stroke();
      ctx.fillStyle = c.accent2;
      for (let i = 0; i < g.n; i++) {
        const cx = g.left + i * g.stride + g.stride / 2;
        const y = baseY - (truth[i] / maxT) * g.plotH;
        ctx.beginPath();
        ctx.arc(cx, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.left, baseY + 0.5);
    ctx.lineTo(width - 8, baseY + 0.5);
    ctx.stroke();

    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const showEvery = g.n > 9 ? 2 : 1;
    for (let i = 0; i < g.n; i++) {
      if (i % showEvery !== 0 && i !== g.n - 1) continue;
      ctx.fillText(String(categories[i]), g.left + i * g.stride + g.stride / 2, baseY + 4);
    }
  }

  function setFromPointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const g = geom(rect.width, rect.height);
    let idx = Math.floor((clientX - rect.left - g.left) / g.stride);
    idx = Math.max(0, Math.min(g.n - 1, idx));
    const h = 1 - (clientY - rect.top - g.top) / g.plotH;
    const next = valueRef.current.slice();
    next[idx] = Math.max(0, Math.min(1, h));
    onChange(next);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, showTruth, truth, disabled, categories]);

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPointer(e.clientX, e.clientY);
  }
  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current || disabled) return;
    setFromPointer(e.clientX, e.clientY);
  }
  function onUp(e: PointerEvent<HTMLCanvasElement>) {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      data-height="156"
      className="draw-canvas"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
}
