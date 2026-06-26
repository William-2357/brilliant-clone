import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';
import {
  evaluate,
  freshShoe,
  drawIndex,
  playDealer,
  handValue,
  compareHands,
  settleNet,
  needsReshuffle,
  type Action,
  type Shoe,
} from '../lib/blackjack';

/**
 * Blackjack house edge — "the long run" made visible. Plays a large number of hands
 * of perfect, EV-optimal basic strategy (every decision still comes from the same
 * `evaluate` engine the trainer uses) and animates the cumulative net chips. Even
 * with flawless play the line drifts below zero: the small negative house edge is
 * inescapable over enough hands. The running edge (average net per hand) is hidden
 * until the run starts so it reads as predict-then-verify rather than a spoiler.
 *
 * The house edge (~0.5%) is tiny next to the per-hand swing (~1 chip), so it only
 * separates from the noise after thousands of hands — hence the high default count.
 * To stay at 60fps for 100k+ hands, the EV-optimal action is memoized by hand state
 * (total / soft / dealer upcard / can-double); the first time each state appears it
 * is computed by the engine, then reused. The decision is still the engine's, just
 * cached — which is exactly the basic strategy the chart is meant to demonstrate.
 */
export default function BlackjackEdge({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decks = Math.max(1, Math.round(config.decks ?? 6));
  const [hands, setHands] = useState(Math.round(config.hands ?? 100000));

  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const shoeRef = useRef<Shoe>(freshShoe(decks));
  const actionCacheRef = useRef<Map<string, Action>>(new Map());
  const stateRef = useRef({ processed: 0, total: 0, net: 0, maxAbs: 1, series: [] as number[] });
  const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(
    null,
  );

  function ensureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    dimsRef.current = setupCanvas(canvas);
    return dimsRef.current;
  }

  /** EV-optimal action, memoized by coarse hand state so big runs stay fast. */
  function chooseAction(shoe: Shoe, player: number[], up: number, canDouble: boolean): Action {
    const v = handValue(player);
    const key = `${v.total}|${v.soft ? 1 : 0}|${up}|${canDouble ? 1 : 0}`;
    const cache = actionCacheRef.current;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const action = evaluate({ shoe, decks, player, dealerUp: up, canDouble }).optimalAction;
    cache.set(key, action);
    return action;
  }

  /** Play one full hand with EV-optimal strategy; returns net chips for a 1-chip bet. */
  function playHand(shoe: Shoe, rng: () => number): number {
    if (needsReshuffle(shoe, decks)) {
      const fresh = freshShoe(decks);
      for (let i = 0; i < fresh.length; i++) shoe[i] = fresh[i];
    }
    const player = [drawIndex(shoe, rng()), drawIndex(shoe, rng())];
    const up = drawIndex(shoe, rng());

    if (handValue(player).blackjack) {
      const dealer = [up, drawIndex(shoe, rng())];
      return handValue(dealer).blackjack ? 0 : settleNet(1, 'blackjack');
    }

    let doubled = false;
    let canDouble = true;
    let resolved = false;
    while (!resolved) {
      const action = chooseAction(shoe, player, up, canDouble);
      if (action === 'double' && canDouble) {
        doubled = true;
        player.push(drawIndex(shoe, rng()));
        resolved = true;
      } else if (action === 'hit') {
        player.push(drawIndex(shoe, rng()));
        canDouble = false;
        if (handValue(player).bust) return settleNet(1, 'player-bust', doubled);
      } else {
        resolved = true;
      }
    }

    const pv = handValue(player);
    if (pv.bust) return settleNet(1, 'player-bust', doubled);

    const dealer = playDealer(shoe, [up, drawIndex(shoe, rng())], rng);
    return settleNet(1, compareHands(pv.total, dealer), doubled);
  }

  function draw() {
    const dims = dimsRef.current ?? ensureCanvas();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    const padL = 16;
    const padR = 16;
    const chartTop = 70;
    const chartBottom = height - 24;
    const chartH = chartBottom - chartTop;
    const chartW = width - padL - padR;
    const reveal = mode === 'explore' || s.processed > 0;
    const edge = s.processed > 0 ? s.net / s.processed : 0;
    const down = s.net < 0;

    // Headline: running edge (average net per hand). Hidden until a run starts.
    ctx.textAlign = 'left';
    ctx.fillStyle = reveal ? (down ? c.bad : c.good) : c.textH;
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText(reveal ? `${(edge * 100).toFixed(2)}%` : '—', padL, 32);
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('house edge (average net per hand)', padL, 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = down ? c.bad : c.text;
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? `${s.net >= 0 ? '+' : ''}${Math.round(s.net).toLocaleString()} chips` : 'press run',
      width - padR,
      28,
    );
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`over ${s.processed.toLocaleString()} hands`, width - padR, 48);

    const maxAbs = s.maxAbs * 1.15;
    const yOf = (net: number) => chartTop + chartH * (0.5 - net / (2 * maxAbs));
    const xOf = (i: number, n: number) => padL + (n > 1 ? (chartW * i) / (n - 1) : 0);
    const zeroY = yOf(0);

    // Zero baseline ("break even").
    ctx.strokeStyle = c.borderStrong;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(width - padR, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('break even', padL, zeroY - 5);

    if (reveal && s.series.length > 1) {
      const n = s.series.length;
      // Shaded "house's take": area between the curve and break-even.
      ctx.beginPath();
      ctx.moveTo(xOf(0, n), zeroY);
      for (let i = 0; i < n; i++) ctx.lineTo(xOf(i, n), yOf(s.series[i]));
      ctx.lineTo(xOf(n - 1, n), zeroY);
      ctx.closePath();
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = down ? c.bad : c.good;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Cumulative-net curve.
      ctx.strokeStyle = c.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xOf(i, n);
        const y = yOf(s.series[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // End dot, tinted by sign.
      ctx.fillStyle = down ? c.bad : c.good;
      ctx.beginPath();
      ctx.arc(xOf(n - 1, n), yOf(s.series[n - 1]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    shoeRef.current = freshShoe(decks);
    actionCacheRef.current = new Map();
    const rng = Math.random;
    const s = stateRef.current;
    s.processed = 0;
    s.total = total;
    s.net = 0;
    s.maxAbs = 1;
    s.series = [];
    accRef.current = 0;
    ensureCanvas();
    // Animate over ~110 frames regardless of size; downsample stored points so the
    // polyline never exceeds ~1200 vertices no matter how many hands are played.
    const perFrame = Math.max(1, Math.ceil(total / 110));
    const sampleEvery = Math.max(1, Math.floor(total / 1200));
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        s.net += playHand(shoeRef.current, rng);
        s.processed++;
        const abs = Math.abs(s.net);
        if (abs > s.maxAbs) s.maxAbs = abs;
        if (s.processed % sampleEvery === 0) s.series.push(s.net);
      }
      if (s.processed >= total && s.series[s.series.length - 1] !== s.net) s.series.push(s.net);
      draw();
      if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    ensureCanvas();
    draw();
    const onResize = () => {
      ensureCanvas();
      draw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(Math.round(config.hands ?? hands));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="248" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField
            label="Hands"
            value={hands}
            min={5000}
            max={250000}
            step={5000}
            onChange={setHands}
          />
          <button type="button" className="btn" onClick={() => run(hands)}>
            Play {hands.toLocaleString()} hands
          </button>
        </div>
      )}
    </div>
  );
}
