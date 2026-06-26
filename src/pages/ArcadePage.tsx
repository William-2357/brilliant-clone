import { useState } from 'react';
import BlackjackTable from '../components/BlackjackTable';
import { simulations } from '../simulations';
import SpeedControl from '../components/SpeedControl';
import { InlineText } from '../components/LectureContent';

const EDGE_SIM_CONFIG = { decks: 6, hands: 100000 };

/**
 * Arcade / Apply — where the probability ideas get played, not just predicted.
 * v1 is one game: a Blackjack trainer (play chips only) framed around expected
 * value, variance, and the house edge "in the long run". A deterministic engine
 * (src/lib/blackjack.ts) is the source of truth for every number; a live
 * dealer-coach narrates the EV-optimal play (with an offline fallback).
 */
export default function ArcadePage() {
  const EdgeSim = simulations.blackjackEdge;
  const [showEdge, setShowEdge] = useState(false);

  return (
    <div className="page arcade">
      <header className="page-head">
        <p className="page-eyebrow">Arcade · Apply</p>
        <h1 className="page-title">Play the long run</h1>
        <p className="page-sub">
          Put expected value to work at the table. Every hand, predict your best move — then the
          engine reveals the EV-optimal play and a coach explains why. Play chips only; this is for
          building intuition about variance and the house edge, not for gambling.
        </p>
      </header>

      <BlackjackTable />

      <section className="arcade-edge">
        <div className="arcade-edge-head">
          <div>
            <p className="page-eyebrow">Why the house always wins</p>
            <h2 className="arcade-edge-title">A tiny edge, buried by variance</h2>
            <p className="arcade-edge-sub">
              <InlineText text="Blackjack feels almost fair — your choices genuinely matter, and good play keeps the house's edge to around a percent of each bet. But a permanent tilt is baked into the rules, and in any single session it's drowned out by swings (about $\sigma \approx 1.1$ chips of noise per hand against a $\sim 0.01$ chip drift). Where the edge comes from:" />
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setShowEdge((v) => !v)}>
            {showEdge ? 'Hide simulation' : 'Show the long run'}
          </button>
        </div>

        <ul className="arcade-why">
          <li>
            <strong>You act first.</strong> If you bust, you lose your bet immediately — even on
            the hands where the dealer would have gone on to bust too. That “you both break, you
            still lose” asymmetry is the single biggest source of the edge (players bust on roughly
            a quarter of hands).
          </li>
          <li>
            <strong>The dealer only risks busting after you already have.</strong> They follow a
            fixed script — draw until 17 — but they never get the chance to bust on the hands you’ve
            already lost by busting first.
          </li>
          <li>
            <strong>Blackjack pays 3:2, and a few rules refund you</strong> — doubling down, the
            occasional push — which claw back a lot of the gap, but never quite all of it.
          </li>
          <li>
            <strong>The leftover is about a 1% edge per hand</strong> in this v1 game (allowing
            splits would trim it toward the ~0.5% of a full-rules table). Over a night it’s invisible
            under the luck; over tens of thousands of hands the average net per hand settles firmly
            in the red. Run the simulation — even flawless basic strategy drifts below break-even.
          </li>
        </ul>

        {showEdge && (
          <div className="arcade-edge-stage">
            <EdgeSim config={EDGE_SIM_CONFIG} mode="explore" runSignal={0} />
            <SpeedControl />
          </div>
        )}
      </section>

      <section className="arcade-soon">
        <p className="page-eyebrow">Coming soon</p>
        <p className="arcade-soon-text">
          More applied games (poker odds, betting under uncertainty) will join the Arcade. Still play
          money, still grounded in the same owned probability engine — never a way to beat a casino.
        </p>
      </section>
    </div>
  );
}
