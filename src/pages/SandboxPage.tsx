import { useState } from 'react';
import { simulations } from '../simulations';
import type { SimulationType } from '../types/lesson';
import { wheelConfig, EV_WHEEL } from '../content/simData';
import SpeedControl from '../components/SpeedControl';
import { InlineText } from '../components/LectureContent';

interface SandboxSim {
  type: SimulationType;
  label: string;
  blurb: string;
  config: Record<string, number>;
}

/**
 * Free-play surface: every simulation in explore mode, no prediction or grading.
 * Configs use mid-range, interactive counts so each sim is lively on open.
 */
const SANDBOX_SIMS: SandboxSim[] = [
  {
    type: 'coinFlip',
    label: 'Coin Flip',
    blurb: 'Watch the running fraction settle inside the $\\pm 2\\sqrt{p(1-p)/N}$ convergence band.',
    config: { flips: 200, p: 0.5 },
  },
  {
    type: 'diceRoll',
    label: 'Two Dice',
    blurb: 'Roll two dice and build the triangular distribution of their sums.',
    config: { rolls: 300 },
  },
  {
    type: 'galtonBoard',
    label: 'Galton Board',
    blurb: 'Drop balls through the pegs — skew the right-bounce chance to lean the bell.',
    config: { rows: 12, balls: 300, p: 0.5 },
  },
  {
    type: 'randomWalk',
    label: 'Random Walk',
    blurb: 'Send a fan of $\\pm 1$ walks drifting and spreading like $\\sqrt{n}$.',
    config: { steps: 120, p: 0.5 },
  },
  {
    type: 'clt',
    label: 'Central Limit',
    blurb: 'Average samples from any parent and watch the means go normal.',
    config: { parent: 0, m: 8, samples: 600 },
  },
  {
    type: 'expectedValue',
    label: 'Expected Value',
    blurb: 'Spin a weighted wheel and track the running average toward its EV.',
    config: wheelConfig(EV_WHEEL),
  },
  {
    type: 'birthday',
    label: 'Birthday',
    blurb: 'Fill a room and see how soon a shared birthday appears.',
    config: { people: 23 },
  },
  {
    type: 'conditional',
    label: 'Conditional',
    blurb: 'Draw cards without replacement and watch the odds update.',
    config: { metric: 0, scaleMax: 0.15 },
  },
  {
    type: 'montyHall',
    label: 'Monty Hall',
    blurb: 'Pick a door, watch a goat revealed, then switch or stay.',
    config: { doors: 3 },
  },
];

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
