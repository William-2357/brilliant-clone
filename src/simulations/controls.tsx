import RangeField from '../components/RangeField';

/**
 * Declarative explore-mode controls shared by every simulation. A `range` spec
 * renders a RangeField slider; a `toggle` spec renders a `.sim-toggle` button
 * group (the MontyHall pattern). Controls drive local state that overrides the
 * sim's `config` in `explore` mode only — the verify path still reads `config`.
 */
export type ControlSpec =
  | {
      kind: 'range';
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      default?: number;
    }
  | {
      kind: 'toggle';
      key: string;
      label?: string;
      default?: number;
      options: { value: number; label: string }[];
    };

/** Seed control state from the config (falling back to a default / the min / first option). */
// initParams is a helper shipped alongside the SimControls component; mirror the
// repo's deliberate eslint-disable pattern rather than splitting the tiny module.
// eslint-disable-next-line react-refresh/only-export-components
export function initParams(
  config: Record<string, number>,
  specs: ControlSpec[],
): Record<string, number> {
  const p: Record<string, number> = {};
  for (const s of specs) {
    const fromCfg = config[s.key];
    if (typeof fromCfg === 'number') p[s.key] = fromCfg;
    else if (typeof s.default === 'number') p[s.key] = s.default;
    else p[s.key] = s.kind === 'range' ? s.min : s.options[0].value;
  }
  return p;
}

interface Props {
  specs: ControlSpec[];
  params: Record<string, number>;
  set: (key: string, value: number) => void;
}

/** Render the control row for a sim's explore mode. */
export default function SimControls({ specs, params, set }: Props) {
  return (
    <>
      {specs.map((s) =>
        s.kind === 'range' ? (
          <RangeField
            key={s.key}
            label={s.label}
            value={params[s.key] ?? s.min}
            min={s.min}
            max={s.max}
            step={s.step ?? 1}
            onChange={(v) => set(s.key, v)}
          />
        ) : (
          <div key={s.key} className="sim-toggle" role="group" aria-label={s.label}>
            {s.options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`btn ${params[s.key] === o.value ? '' : 'btn-ghost'}`}
                onClick={() => set(s.key, o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        ),
      )}
    </>
  );
}
