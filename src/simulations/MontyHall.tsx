import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { cssVar, setupCanvas } from './canvasUtils';

/**
 * Monty Hall. Plays the game many times for a fixed strategy and tracks the
 * running win rate, which converges to (doors-1)/doors for switching and
 * 1/doors for staying. Strategy is set by `config.strategy` (1 = switch, 0 = stay)
 * in verify mode, or toggled by the learner while exploring.
 */
export default function MontyHall({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doors = config.doors ?? 3;
  const [strategy, setStrategy] = useState<'switch' | 'stay'>('switch');
  const [games, setGames] = useState(500);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef(runSignal);
  const stateRef = useRef({
    wins: 0,
    processed: 0,
    total: 0,
    strategy: 'switch' as 'switch' | 'stay',
    car: -1,
    pick: -1,
    opened: -1,
    final: -1,
  });

  function playGame(useSwitch: boolean) {
    const car = Math.floor(Math.random() * doors);
    const pick = Math.floor(Math.random() * doors);
    // The host opens every door except the player's and one other, always
    // revealing goats. The single remaining "other" door is the car when the
    // player guessed wrong, or a random goat when the player guessed right.
    let other: number;
    if (pick === car) {
      do {
        other = Math.floor(Math.random() * doors);
      } while (other === pick);
    } else {
      other = car;
    }
    // Pick one opened door (a goat that is neither the pick nor the other) for display.
    let opened = -1;
    for (let d = 0; d < doors; d++) {
      if (d !== pick && d !== other) {
        opened = d;
        break;
      }
    }
    const final = useSwitch ? other : pick;
    return { car, pick, opened, final, win: final === car };
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

    // Doors
    const n = Math.min(doors, 5);
    const gap = 12;
    const dw = Math.min(64, (width - 48 - (n - 1) * gap) / n);
    const dh = 86;
    const totalW = n * dw + (n - 1) * gap;
    const startX = (width - totalW) / 2;
    const dy = 12;
    for (let d = 0; d < n; d++) {
      const x = startX + d * (dw + gap);
      const isOpened = d === s.opened && s.processed > 0;
      const isFinal = d === s.final && s.processed > 0;
      ctx.fillStyle = isOpened ? '#0f0c1a' : '#1b1530';
      ctx.strokeStyle = isFinal ? cyan : border;
      ctx.lineWidth = isFinal ? 2 : 1;
      if (isFinal) {
        ctx.shadowColor = cyan;
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.roundRect(x, dy, dw, dh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '24px system-ui, sans-serif';
      if (s.processed > 0 && (isOpened || isFinal)) {
        ctx.fillText(d === s.car ? '\u{1F697}' : '\u{1F410}', x + dw / 2, dy + dh / 2);
      } else {
        ctx.fillStyle = text;
        ctx.fillText(`${d + 1}`, x + dw / 2, dy + dh / 2);
      }
    }

    // Win-rate bar
    const rate = s.processed > 0 ? s.wins / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = 124;
    const barH = 22;
    ctx.fillStyle = border;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 11);
    ctx.fill();
    if (rate > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#b14dff');
      grad.addColorStop(1, '#ff4dd8');
      ctx.save();
      ctx.shadowColor = '#ff4dd8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * rate), barH, 11);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = textH;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rate.toFixed(3), width / 2, barY + barH + 30);
    ctx.fillStyle = text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      s.processed > 0
        ? `${s.strategy} \u00b7 won ${s.wins} of ${s.processed}`
        : 'press run to play',
      width / 2,
      barY + barH + 50,
    );
  }

  function run(total: number, strat: 'switch' | 'stay') {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.wins = 0;
    s.processed = 0;
    s.total = total;
    s.strategy = strat;
    const small = total <= 20;
    const perFrame = small ? 1 : Math.ceil(total / 80);
    let frame = 0;
    const tick = () => {
      const step = small ? (frame % 6 === 0 ? 1 : 0) : perFrame;
      for (let i = 0; i < step && s.processed < total; i++) {
        const g = playGame(strat === 'switch');
        if (g.win) s.wins++;
        s.car = g.car;
        s.pick = g.pick;
        s.opened = g.opened;
        s.final = g.final;
        s.processed++;
      }
      draw();
      frame++;
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
      const strat = (config.strategy ?? 1) === 1 ? 'switch' : 'stay';
      run(config.trials ?? 1000, strat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="208" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <div className="sim-toggle">
            <button
              type="button"
              className={`btn ${strategy === 'switch' ? '' : 'btn-ghost'}`}
              onClick={() => setStrategy('switch')}
            >
              Always switch
            </button>
            <button
              type="button"
              className={`btn ${strategy === 'stay' ? '' : 'btn-ghost'}`}
              onClick={() => setStrategy('stay')}
            >
              Always stay
            </button>
          </div>
          <label className="sim-slider">
            <span>Games: {games}</span>
            <input
              type="range"
              min={10}
              max={2000}
              step={10}
              value={games}
              onChange={(e) => setGames(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(games, strategy)}>
            Play {games}×
          </button>
        </div>
      )}
    </div>
  );
}
