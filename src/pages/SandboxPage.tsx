import { useState } from 'react';
import { simulations } from '../simulations';
import { SANDBOX_SIMS, type SandboxSim } from '../content/sandboxSims';
import SpeedControl from '../components/SpeedControl';
import { InlineText } from '../components/LectureContent';

export default function SandboxPage() {
  const [active, setActive] = useState<SandboxSim>(SANDBOX_SIMS[0]);
  const Sim = simulations[active.type];

  return (
    <div className="page sandbox">
      <header className="page-head">
        <p className="page-eyebrow">Sandbox</p>
        <h1 className="page-title">Play freely</h1>
        <p className="page-sub">
          Every simulation, no grading. Tweak the controls and run it as many times as you like.
        </p>
      </header>

      <div className="sandbox-tabs" role="tablist" aria-label="Choose a simulation">
        {SANDBOX_SIMS.map((s) => (
          <button
            key={s.type}
            type="button"
            role="tab"
            aria-selected={s.type === active.type}
            className={`sandbox-tab ${s.type === active.type ? 'active' : ''}`}
            onClick={() => setActive(s)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="sandbox-blurb">
        <InlineText text={active.blurb} />
      </p>

      <div className="sandbox-stage">
        <Sim key={active.type} config={active.config} mode="explore" runSignal={0} />
        <SpeedControl />
      </div>
    </div>
  );
}
