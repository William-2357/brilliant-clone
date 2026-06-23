import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];

/**
 * Conditional probability with a deck of cards. Draws cards without replacement
 * over many trials and tracks a fraction selected by `config.metric`:
 *   0 = P(first card is an ace)
 *   1 = P(both of two cards are aces)
 *   2 = P(second is an ace | first was an ace)  -- only ace-first trials count
 * `config.scaleMax` sets the bar's full-scale value so small probabilities read well.
 */
export default function ConditionalProbability({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metric = config.metric ?? 0;
  const scaleMax = config.scaleMax ?? 0.15;
  const [trials, setTrials] = useState(3000);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({ num: 0, den: 0, processed: 0, total: 0, last: [-1, -1] as number[] });

  const isAce = (card: number) => card % 13 === 0;

  function drawTrial(): { cards: number[]; num: number; den: number } {
    const a = Math.floor(Math.random() * 52);
    let b = Math.floor(Math.random() * 52);
    while (b === a) b = Math.floor(Math.random() * 52);
    if (metric === 0) {
      return { cards: [a], num: isAce(a) ? 1 : 0, den: 1 };
    }
    if (metric === 1) {
      return { cards: [a, b], num: isAce(a) && isAce(b) ? 1 : 0, den: 1 };
    }
    // metric 2: condition on first being an ace
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
    const cyan = cssVar('--cyan', '#36e2ff');
    const text = cssVar('--text', '#b9b3cc');
    const textH = cssVar('--text-h', '#ffffff');
    const border = cssVar('--border', '#2c2542');
    ctx.clearRect(0, 0, width, height);

    // Cards
    const show = metric === 0 ? 1 : 2;
    const cw = 56;
    const ch = 78;
    const gap = 14;
    const totalW = show * cw + (show - 1) * gap;
    const startX = (width - totalW) / 2;
    const cardY = 12;
    for (let i = 0; i < show; i++) {
      const x = startX + i * (cw + gap);
      const card = s.last[i] ?? -1;
      ctx.fillStyle = '#161226';
      ctx.strokeStyle = card >= 0 && isAce(card) ? cyan : border;
      ctx.lineWidth = card >= 0 && isAce(card) ? 2 : 1;
      if (card >= 0 && isAce(card)) {
        ctx.shadowColor = cyan;
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.roundRect(x, cardY, cw, ch, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (card >= 0) {
        const { rank, suit, red } = cardLabel(card);
        ctx.fillStyle = red ? '#ff6b9d' : textH;
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rank + suit, x + cw / 2, cardY + ch / 2);
      } else {
        ctx.fillStyle = text;
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
    const barY = 132;
    const barH = 22;
    ctx.fillStyle = border;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 11);
    ctx.fill();
    if (frac > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#b14dff');
      grad.addColorStop(1, '#ff4dd8');
      ctx.save();
      ctx.shadowColor = '#ff4dd8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, (barW * Math.min(frac, scaleMax)) / scaleMax), barH, 11);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = textH;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(frac.toFixed(4), width / 2, barY + barH + 30);
    ctx.fillStyle = text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0 ? `${s.num} of ${s.den} qualifying draws` : 'press run to deal',
      width / 2,
      barY + barH + 50,
    );
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.num = 0;
    s.den = 0;
    s.processed = 0;
    s.total = total;
    const tick = () => {
      const chunk = Math.ceil(total / 70);
      for (let i = 0; i < chunk && s.processed < total; i++) {
        const t = drawTrial();
        s.num += t.num;
        s.den += t.den;
        s.last = t.cards;
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
      <canvas ref={canvasRef} data-height="216" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <label className="sim-slider">
            <span>Draws: {trials}</span>
            <input
              type="range"
              min={100}
              max={8000}
              step={100}
              value={trials}
              onChange={(e) => setTrials(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(trials)}>
            Deal {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
