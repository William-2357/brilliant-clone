interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

/**
 * A labelled control pairing a slider with a number box, so a count can be set
 * by dragging *or* typed in exactly. Typed values are clamped to [min, max] and
 * snapped to the step.
 */
export default function RangeField({ label, value, min, max, step = 1, onChange }: Props) {
  function commit(raw: number) {
    if (!Number.isFinite(raw)) return;
    const snapped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, snapped)));
  }

  return (
    <label className="sim-slider">
      <span className="sim-slider-head">
        <span>{label}</span>
        <input
          type="number"
          className="sim-num"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => commit(Number(e.target.value))}
          aria-label={label}
        />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
