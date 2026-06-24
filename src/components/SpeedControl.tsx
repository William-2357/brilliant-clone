import { useSimSpeed, MIN_SPEED, MAX_SPEED } from '../lib/simSpeed';

// Logarithmic, but centered on 1×: the left half of the track covers 0.01×→1×
// and the right half 1×→3×. A plain log scale would hand the slow range ~80% of
// the track (and shove 1× far right); centering keeps normal speed in the middle
// while still giving fine, multiplicative control over slow speeds.
const DOWN = -Math.log10(MIN_SPEED); // decades below 1× (0.01× → 2)
const UP = Math.log10(MAX_SPEED); // decades above 1× (3× → ~0.48)

function speedFromPos(t: number): number {
  if (t <= 0.5) return Math.pow(10, (t / 0.5 - 1) * DOWN); // 0.01 → 1
  return Math.pow(10, ((t - 0.5) / 0.5) * UP); // 1 → 3
}

function posFromSpeed(s: number): number {
  const l = Math.log10(s);
  return l <= 0 ? 0.5 + (l / DOWN) * 0.5 : 0.5 + (l / UP) * 0.5;
}

/**
 * Global animation-speed slider. Adjusts how fast every simulation processes
 * trials and animates, applied in real time (even mid-run) via the shared
 * `simSpeed` store.
 */
export default function SpeedControl() {
  const [speed, setSpeed] = useSimSpeed();
  const label = speed < 1 ? speed.toFixed(2) : speed.toFixed(1);
  return (
    <div className="speed-control">
      <span className="speed-label">Speed</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.005}
        value={posFromSpeed(speed)}
        onChange={(e) => setSpeed(speedFromPos(Number(e.target.value)))}
        aria-label="Simulation speed"
      />
      <span className="speed-value">{label}×</span>
    </div>
  );
}
