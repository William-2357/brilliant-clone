interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  disabled?: boolean;
  /** The true value, shown as a marker once revealed. */
  truth?: number;
  showTruth?: boolean;
}

function fmt(v: number, step: number, unit?: string): string {
  if (unit === 'dollars') return `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
  if (unit === 'count' || Number.isInteger(step)) return String(Math.round(v));
  return v.toFixed(step < 0.02 ? 3 : 2);
}

/**
 * Drag-to-predict scale: the learner commits a numeric value by dragging a handle
 * along a labeled track instead of typing. Graded exactly like a numeric answer
 * (value vs `answer` within `tolerance`). Once revealed, the true value is marked.
 */
export default function PredictScale({ min, max, step, value, onChange, unit, disabled, truth, showTruth }: Props) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

  return (
    <div className="pscale">
      <div className="pscale-bubble" style={{ left: `${pct(value)}%` }}>
        {fmt(value, step, unit)}
      </div>
      <div className="pscale-track">
        {showTruth && truth != null && (
          <span className="pscale-truth" style={{ left: `${pct(truth)}%` }} aria-hidden />
        )}
        <input
          type="range"
          className="pscale-range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Drag to your prediction"
        />
      </div>
      <div className="pscale-ends">
        <span>{fmt(min, step, unit)}</span>
        {showTruth && truth != null && <span className="pscale-answer">answer {fmt(truth, step, unit)}</span>}
        <span>{fmt(max, step, unit)}</span>
      </div>
    </div>
  );
}
