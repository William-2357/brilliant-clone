import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];

/**
 * Conditional probability with a deck of cards. Draws cards without replacement
 * over many trials and tracks a fraction selected by `config.metric`:
 *   0 = P(first card is an ace)
 *   1 = P(both of two cards are aces)
 *   2 = P(second is an ace | first was an ace)  -- only ace-first trials count
 *   3 = P(first card is a face card: J/Q/K)
 *   4 = P(second is an ace | first was NOT an ace) -- only non-ace-first trials count
 * `config.scaleMax` sets the bar's full-scale value so small probabilities read well.
 */
export default function ConditionalProbability({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metric = config.metric ?? 0;
  const scaleMax = config.scaleMax ?? 0.15;
  const [trials, setTrials] = useState(3000);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({
    num: 0,
    den: 0,
    processed: 0,
    total: 0,
    last: [-1, -1] as number[],
    // Running tally of every card dealt, bucketed by rank (index 0=A … 12=K).
    rankCounts: new Array(13).fill(0) as number[],
  });

  const isAce = (card: number) => card % 13 === 0;
  const isFace = (card: number) => card % 13 >= 10;

  function drawTrial(): { cards: number[]; num: number; den: number } {
    const a = Math.floor(Math.random() * 52);
    let b = Math.floor(Math.random() * 52);
    while (b === a) b = Math.floor(Math.random() * 52);
    if (metric === 0) {
      return { cards: [a], num: isAce(a) ? 1 : 0, den: 1 };
    }
    if (metric === 3) {
      return { cards: [a], num: isFace(a) ? 1 : 0, den: 1 };
    }
    if (metric === 1) {
      return { cards: [a, b], num: isAce(a) && isAce(b) ? 1 : 0, den: 1 };
    }
    if (metric === 4) {
      if (isAce(a)) return { cards: [a, b], num: 0, den: 0 };
      return { cards: [a, b], num: isAce(b) ? 1 : 0, den: 1 };
    }
    if (!isAce(a)) return { cards: [a, b], num: 0, den: 0 };
    return { cards: [a, b], num: isAce(b) ? 1 : 0, den: 1 };
  }

  function cardLabel(card: number): { rank: string; suit: string; red: boolean } {
    const rank = RANKS[card % 13];
    const suitIdx = Math.floor(card / 13);
    return { rank, suit: SUITS[suitIdx], red: suitIdx === 1 || suitIdx === 2 };
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    const highlight = (card: number) => (metric === 3 ? isFace(card) : isAce(card));
    const show = metric === 0 || metric === 3 ? 1 : 2;
    const cw = 56;
    const ch = 78;
    const gap = 14;
    const totalW = show * cw + (show - 1) * gap;
    const startX = (width - totalW) / 2;
    const cardY = 12;
    for (let i = 0; i < show; i++) {
      const x = startX + i * (cw + gap);
      const card = s.last[i] ?? -1;
      const hit = card >= 0 && highlight(card);

      ctx.fillStyle = c.surface;
      ctx.strokeStyle = hit ? c.accent : c.border;
      ctx.lineWidth = hit ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cw, ch, 8);
      ctx.fill();
      ctx.stroke();

      if (card >= 0) {
        const { rank, suit, red } = cardLabel(card);
        ctx.fillStyle = red ? c.bad : c.textH;
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rank + suit, x + cw / 2, cardY + ch / 2);
      } else {
        ctx.fillStyle = c.muted;
        ctx.font = '24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + cw / 2, cardY + ch / 2);
      }
    }

    // Fraction bar
    const frac = s.den > 0 ? s.num / s.den : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = 102;
    const barH = 20;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, (barW * Math.min(frac, scaleMax)) / scaleMax), barH, 10);
      ctx.fill();
    }

    ctx.fillStyle = c.textH;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(frac.toFixed(4), width / 2, barY + barH + 24);
    ctx.fillStyle = c.text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? `${s.num} of ${s.den} qualifying draws` : 'press run to deal',
      width / 2,
      barY + barH + 42,
    );

    // Per-rank tally: one counter per rank A..K, incremented for every card dealt.
    const histLeft = 22;
    const histRight = width - 14;
    const histBase = height - 32;
    const histTop = 192;
    const histH = histBase - histTop;
    const n = 13;
    const histGap = 4;
    const plotW = histRight - histLeft;
    const bw = (plotW - histGap * (n - 1)) / n;
    const maxCount = Math.max(1, ...s.rankCounts);
    const relevant = (rank: number) => (metric === 3 ? rank >= 10 : rank === 0);

    for (let i = 0; i < n; i++) {
      const x = histLeft + i * (bw + histGap);
      const h = (s.rankCounts[i] / maxCount) * histH;
      ctx.fillStyle = c.surface3;
      ctx.beginPath();
      ctx.roundRect(x, histTop, bw, histH, 3);
      ctx.fill();
      if (s.rankCounts[i] > 0) {
        ctx.fillStyle = relevant(i) ? c.accent : c.borderStrong;
        ctx.beginPath();
        ctx.roundRect(x, histBase - h, bw, h, 3);
        ctx.fill();
      }
      // Live counter value above each bar (only when bars are wide enough to read).
      if (bw >= 24 && s.processed > 0) {
        ctx.fillStyle = relevant(i) ? c.accentStrong : c.muted;
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(s.rankCounts[i]), x + bw / 2, histBase - h - 2);
      }
      // Rank label
      ctx.fillStyle = relevant(i) ? c.accentStrong : c.muted;
      ctx.font = relevant(i) ? '700 11px system-ui, sans-serif' : '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(RANKS[i], x + bw / 2, histBase + 5);
    }

    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('cards dealt, by rank', width / 2, histBase + 19);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.num = 0;
    s.den = 0;
    s.processed = 0;
    s.total = total;
    s.rankCounts = new Array(13).fill(0);
    accRef.current = 0;
    const tick = () => {
      const chunk = Math.ceil(total / 70);
      const todo = scaledStep(accRef, chunk);
      for (let i = 0; i < todo && s.processed < total; i++) {
        const t = drawTrial();
        s.num += t.num;
        s.den += t.den;
        s.last = t.cards;
        for (const card of t.cards) s.rankCounts[card % 13]++;
        s.processed++;
      }
      draw();
      if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
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
      run(config.trials ?? 8000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="336" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField label="Draws" value={trials} min={1} max={8000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Deal {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
