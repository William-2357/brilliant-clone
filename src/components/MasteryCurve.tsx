interface Props {
  /** Cumulative mastery fractions (0..1), one per lesson plus a leading 0. */
  points: number[];
}

const W = 280;
const H = 120;
const PAD = 8;

/**
 * Small "learning curve" sparkline: cumulative course mastery climbing toward
 * the present. All colors come from CSS tokens (see App.css .prog-curve-*), so
 * it adapts to light/dark. Drawn in a fixed viewBox and scaled uniformly (no
 * preserveAspectRatio stretch) so the end dot stays circular.
 */
export default function MasteryCurve({ points }: Props) {
  const n = points.length;
  const x = (i: number) => PAD + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD * 2));
  const y = (f: number) => PAD + (1 - Math.max(0, Math.min(1, f))) * (H - PAD * 2);

  const line = points.map((f, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(f).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const lastX = x(n - 1);
  const lastY = y(points[n - 1] ?? 0);

  return (
    <svg
      className="prog-curve"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Course mastery over time"
    >
      <line className="prog-curve-grid" x1="0" y1={y(1 / 3)} x2={W} y2={y(1 / 3)} />
      <line className="prog-curve-grid" x1="0" y1={y(2 / 3)} x2={W} y2={y(2 / 3)} />
      <path className="prog-curve-area" d={area} />
      <path className="prog-curve-line" d={line} />
      <circle className="prog-curve-dot" cx={lastX} cy={lastY} r="3.6" />
    </svg>
  );
}
