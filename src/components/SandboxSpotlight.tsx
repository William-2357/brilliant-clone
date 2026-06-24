import { simulations } from '../simulations';
import { dailySim } from '../content/daily';
import { dayKey } from '../store/progress';
import { navigate } from '../lib/router';
import { InlineText } from './LectureContent';

/**
 * A single sandbox simulation, surfaced on Home in free-play `explore` mode. The
 * featured sim is date-seeded (stable for the day, rotates tomorrow) and links out
 * to the full Sandbox for the rest of the catalog.
 */
export default function SandboxSpotlight() {
  const today = dayKey(new Date().getTime());
  const sim = dailySim(today);
  const Sim = simulations[sim.type];

  return (
    <section className="panel home-sim">
      <div className="home-sim-head">
        <div>
          <p className="potd-eyebrow">Simulation to try</p>
          <h3 className="potd-title">{sim.label}</h3>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/sandbox')}>
          Open in Sandbox →
        </button>
      </div>
      <p className="home-sim-blurb">
        <InlineText text={sim.blurb} />
      </p>
      <Sim key={sim.type} config={sim.config} mode="explore" runSignal={0} />
    </section>
  );
}
