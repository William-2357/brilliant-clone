import { useEffect, useRef, useState } from 'react';
import {
  evaluate,
  evGap,
  isOptimalChoice,
  handValue,
  freshShoe,
  drawIndex,
  needsReshuffle,
  compareHands,
  settleNet,
  trueCount,
  cardLabel,
  TEN,
  type Action,
  type RoundOutcome,
  type Shoe,
} from '../lib/blackjack';
import { buildCoachInput, templateExplanation, fmtEv } from '../lib/coach';
import { fetchAiCoach } from '../lib/coachClient';
import { simPalette, setupCanvas } from '../simulations/canvasUtils';
import { useProgress } from '../hooks/useProgress';
import { useCoachAI } from '../hooks/useCoachAI';
import { fireConfetti } from '../lib/confetti';
import { ARCADE_STARTING_BANKROLL } from '../lib/storage';

const DECKS = 6;
const MIN_BET = 5;
const CHIPS = [5, 25, 100];
const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663']; // ♠ ♥ ♦ ♣
const TENS = ['10', 'J', 'Q', 'K'];

type Phase = 'idle' | 'player' | 'dealer' | 'settled';

interface DealtCard {
  id: number;
  idx: number;
  rank: string;
  suit: string;
}

interface LastDecision {
  chosen: Action;
  optimal: Action;
  chosenEv: number;
  optimalEv: number;
  gap: number;
  correct: boolean;
}

interface CoachState {
  text: string;
  source: 'offline' | 'ai' | 'loading';
}

interface RoundResult {
  outcome: RoundOutcome;
  net: number;
}

const ACTION_LABEL: Record<Action, string> = { hit: 'Hit', stand: 'Stand', double: 'Double' };

// A visual-only face-down card shown in the dealer's hole position during the
// player's turn. The real hole card isn't drawn until the dealer reveals (so the
// EV model treats it as unknown); this is purely the classic up-card + face-down look.
const HOLE_CARD: DealtCard = { id: -1, idx: 0, rank: '', suit: '' };

// Cosmetic-only card id counter + factory (suit/face are flavor; the engine only
// ever uses the rank index). Kept at module scope so the impure Math.random calls
// are outside the component render path.
let CARD_ID = 0;
function makeCard(idx: number): DealtCard {
  const suit = SUITS[(Math.random() * SUITS.length) | 0];
  const rank = idx === TEN ? TENS[(Math.random() * TENS.length) | 0] : cardLabel(idx);
  return { id: CARD_ID++, idx, rank, suit };
}
function drawCard(shoe: Shoe): DealtCard {
  return makeCard(drawIndex(shoe, Math.random()));
}

function formatChips(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** A single card. Entrance is transition-driven (no keyframes); reduced-motion shows it instantly. */
function Card({ card, index, hidden }: { card: DealtCard; index: number; hidden?: boolean }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const red = card.suit === '\u2665' || card.suit === '\u2666';
  return (
    <div
      className={`bj-card${shown ? ' in' : ''}${hidden ? ' face-down' : ''}${red ? ' red' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 6) * 55}ms` }}
    >
      {hidden ? (
        <span className="bj-card-back" aria-hidden />
      ) : (
        <>
          <span className="bj-card-rank">{card.rank}</span>
          <span className="bj-card-suit">{card.suit}</span>
        </>
      )}
    </div>
  );
}

/** Compact canvas sparkline of cumulative net chips across this session's hands. */
function NetCurve({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    function draw() {
      if (!canvas) return;
      const { ctx, width, height } = setupCanvas(canvas);
      const c = simPalette();
      ctx.clearRect(0, 0, width, height);
      const padX = 6;
      const padY = 8;
      const w = width - padX * 2;
      const h = height - padY * 2;
      let maxAbs = 10;
      for (const v of data) maxAbs = Math.max(maxAbs, Math.abs(v));
      maxAbs *= 1.15;
      const yOf = (v: number) => padY + h * (0.5 - v / (2 * maxAbs));
      const xOf = (i: number) => padX + (data.length > 1 ? (w * i) / (data.length - 1) : 0);
      // zero baseline
      ctx.strokeStyle = c.border;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, yOf(0));
      ctx.lineTo(width - padX, yOf(0));
      ctx.stroke();
      ctx.setLineDash([]);
      if (data.length > 1) {
        const last = data[data.length - 1];
        ctx.strokeStyle = last >= 0 ? c.good : c.bad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = xOf(i);
          const y = yOf(data[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [data]);
  return <canvas ref={ref} data-height="56" className="bj-netcurve" />;
}

export default function BlackjackTable() {
  const progress = useProgress();
  const [coachAI, setCoachAI] = useCoachAI();

  // Bankroll is owned by a ref (synchronous source of truth) mirrored to state.
  const bankrollRef = useRef(ARCADE_STARTING_BANKROLL);
  const [bankroll, setBankrollState] = useState(ARCADE_STARTING_BANKROLL);
  const seededRef = useRef(false);

  const shoeRef = useRef<Shoe>(freshShoe(DECKS));
  const playerRef = useRef<DealtCard[]>([]);
  const dealerRef = useRef<DealtCard[]>([]);
  const handBetRef = useRef(0);
  const doubledRef = useRef(false);
  const upRef = useRef(0);
  const coachSeqRef = useRef(0);
  const dealerTimerRef = useRef<number | null>(null);

  const [player, setPlayerState] = useState<DealtCard[]>([]);
  const [dealer, setDealerState] = useState<DealtCard[]>([]);
  const [holeHidden, setHoleHidden] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(25);
  const [handBet, setHandBet] = useState(0);
  const [tc, setTc] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [coach, setCoach] = useState<CoachState | null>(null);
  const [lastDecision, setLastDecision] = useState<LastDecision | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [shuffled, setShuffled] = useState(false);

  // Seed the bankroll from saved Arcade stats once progress has loaded.
  useEffect(() => {
    if (progress.loaded && !seededRef.current) {
      seededRef.current = true;
      const saved = progress.stats.arcade?.bankroll ?? ARCADE_STARTING_BANKROLL;
      bankrollRef.current = saved;
      setBankrollState(saved);
      setBet((b) => Math.max(MIN_BET, Math.min(b, Math.max(MIN_BET, saved))));
    }
  }, [progress.loaded, progress.stats.arcade]);

  useEffect(() => {
    return () => {
      if (dealerTimerRef.current !== null) window.clearTimeout(dealerTimerRef.current);
    };
  }, []);

  const arcade = progress.stats.arcade;
  const accuracy = arcade && arcade.decisionsTotal > 0
    ? Math.round((arcade.decisionsCorrect / arcade.decisionsTotal) * 100)
    : null;

  function refreshCount() {
    setTc(trueCount(shoeRef.current, DECKS));
  }
  function setBankroll(v: number) {
    bankrollRef.current = v;
    setBankrollState(v);
  }
  function addBankroll(delta: number) {
    setBankroll(Math.round((bankrollRef.current + delta) * 100) / 100);
  }
  function setPlayer(cards: DealtCard[]) {
    playerRef.current = cards;
    setPlayerState(cards);
  }
  function setDealer(cards: DealtCard[]) {
    dealerRef.current = cards;
    setDealerState(cards);
  }
  function draw(): DealtCard {
    return drawCard(shoeRef.current);
  }

  function deal() {
    if (phase !== 'idle' && phase !== 'settled') return;
    if (bet < MIN_BET || bet > bankrollRef.current) return;
    if (dealerTimerRef.current !== null) window.clearTimeout(dealerTimerRef.current);

    let didShuffle = false;
    if (needsReshuffle(shoeRef.current, DECKS)) {
      shoeRef.current = freshShoe(DECKS);
      didShuffle = true;
    }
    setShuffled(didShuffle);

    handBetRef.current = bet;
    setHandBet(bet);
    doubledRef.current = false;
    setResult(null);
    setCoach(null);
    setLastDecision(null);
    addBankroll(-bet);

    const p = [draw(), draw()];
    const upCard = draw();
    upRef.current = upCard.idx;
    setPlayer(p);
    setDealer([upCard]);
    setHoleHidden(true);

    if (handValue(p.map((c) => c.idx)).blackjack) {
      // Player natural: reveal the hole and settle immediately (3:2, push vs dealer BJ).
      const hole = draw();
      setDealer([upCard, hole]);
      setHoleHidden(false);
      refreshCount();
      const dealerBJ = handValue([upCard.idx, hole.idx]).blackjack;
      settle(dealerBJ ? 'push' : 'blackjack', bet, false);
      return;
    }
    refreshCount();
    setPhase('player');
  }

  function gradeAndCoach(chosen: Action) {
    const playerIdx = playerRef.current.map((c) => c.idx);
    const canDouble = playerRef.current.length === 2 && bankrollRef.current >= handBetRef.current;
    const evaluation = evaluate({
      shoe: shoeRef.current,
      decks: DECKS,
      player: playerIdx,
      dealerUp: upRef.current,
      canDouble,
    });
    const correct = isOptimalChoice(evaluation, chosen);
    progress.recordArcadeDecision(correct);
    const chosenEv =
      chosen === 'double' ? evaluation.ev.double ?? evaluation.ev.stand : evaluation.ev[chosen];
    setLastDecision({
      chosen,
      optimal: evaluation.optimalAction,
      chosenEv,
      optimalEv: evaluation.optimalEv,
      gap: evGap(evaluation, chosen),
      correct,
    });

    const input = buildCoachInput(evaluation, {
      playerCards: playerIdx,
      dealerUp: upRef.current,
      chosenAction: chosen,
    });
    const template = templateExplanation(input);
    const seq = ++coachSeqRef.current;
    if (coachAI) {
      // AI on: show only a "thinking" state and WITHHOLD the offline template —
      // it's revealed solely as a fallback if the AI is unreachable or returns nothing.
      setCoach({ text: '', source: 'loading' });
      void fetchAiCoach(input).then((ai) => {
        if (seq !== coachSeqRef.current) return;
        setCoach(ai ? { text: ai, source: 'ai' } : { text: template, source: 'offline' });
      });
    } else {
      // AI off: the deterministic explanation is the coach.
      setCoach({ text: template, source: 'offline' });
    }
  }

  function hit() {
    if (phase !== 'player') return;
    gradeAndCoach('hit');
    const next = [...playerRef.current, draw()];
    setPlayer(next);
    refreshCount();
    if (handValue(next.map((c) => c.idx)).bust) {
      settle('player-bust', handBetRef.current, doubledRef.current);
    }
  }

  function stand() {
    if (phase !== 'player') return;
    gradeAndCoach('stand');
    startDealerTurn(handBetRef.current, doubledRef.current);
  }

  function double() {
    if (phase !== 'player') return;
    if (playerRef.current.length !== 2 || bankrollRef.current < handBetRef.current) return;
    gradeAndCoach('double');
    doubledRef.current = true;
    addBankroll(-handBetRef.current);
    const next = [...playerRef.current, draw()];
    setPlayer(next);
    refreshCount();
    if (handValue(next.map((c) => c.idx)).bust) {
      settle('player-bust', handBetRef.current, true);
    } else {
      startDealerTurn(handBetRef.current, true);
    }
  }

  function startDealerTurn(bjHandBet: number, isDoubled: boolean) {
    setPhase('dealer');
    const hole = draw();
    const working = [...dealerRef.current, hole];
    setDealer(working);
    setHoleHidden(false);
    refreshCount();
    const delay = prefersReducedMotion() ? 0 : 480;

    const step = () => {
      if (handValue(working.map((c) => c.idx)).total < 17) {
        working.push(draw());
        setDealer([...working]);
        refreshCount();
        dealerTimerRef.current = window.setTimeout(step, delay);
        return;
      }
      const playerTotal = handValue(playerRef.current.map((c) => c.idx)).total;
      settle(compareHands(playerTotal, working.map((c) => c.idx)), bjHandBet, isDoubled);
    };
    dealerTimerRef.current = window.setTimeout(step, delay);
  }

  function settle(outcome: RoundOutcome, handBet: number, isDoubled: boolean) {
    const stakeOut = handBet * (isDoubled ? 2 : 1);
    const net = settleNet(handBet, outcome, isDoubled);
    addBankroll(net + stakeOut); // return stake + winnings; bankroll already had stakeOut removed
    const newBankroll = bankrollRef.current;
    progress.recordArcadeRound(net, newBankroll);
    setHistory((h) => [...h, (h.length ? h[h.length - 1] : 0) + net]);
    setResult({ outcome, net });
    setPhase('settled');
    setBet((b) => Math.max(MIN_BET, Math.min(b, Math.max(0, newBankroll))));
    if (outcome === 'blackjack') fireConfetti({ count: 90 });
  }

  function resetBankroll() {
    progress.resetArcadeBankroll();
    setBankroll(ARCADE_STARTING_BANKROLL);
    setBet((b) => Math.min(Math.max(MIN_BET, b), ARCADE_STARTING_BANKROLL));
  }

  if (!progress.loaded) {
    return <div className="center-note">Loading the table…</div>;
  }

  const playerVal = handValue(player.map((c) => c.idx));
  const dealerVal = handValue(dealer.map((c) => c.idx));
  const canDoubleNow = phase === 'player' && player.length === 2 && bankroll >= handBet;
  const betting = phase === 'idle' || phase === 'settled';
  const broke = bankroll < MIN_BET;

  const resultText = result ? resultBanner(result) : null;

  return (
    <div className="bj">
      <div className="bj-main">
        <div className="bj-felt">
          <div className="bj-row">
            <div className="bj-row-head">
              <span className="bj-who">Dealer</span>
              <span className="bj-total">
                {dealer.length === 0
                  ? ''
                  : holeHidden
                    ? `${dealer[0] ? cardLabel(dealer[0].idx) : ''} + ?`
                    : dealerVal.total}
                {!holeHidden && dealerVal.bust ? ' · bust' : ''}
              </span>
            </div>
            <div className="bj-hand">
              {dealer.map((card, i) => (
                <Card key={card.id} card={card} index={i} />
              ))}
              {holeHidden && dealer.length === 1 && (
                <Card key="hole" card={HOLE_CARD} index={1} hidden />
              )}
              {dealer.length === 0 && <div className="bj-card placeholder" />}
            </div>
          </div>

          {resultText && (
            <div className={`bj-banner ${resultText.tone}`} role="status">
              {resultText.label}
            </div>
          )}
          {shuffled && betting && !result && (
            <div className="bj-banner neutral" role="status">
              Shoe reshuffled — {DECKS} fresh decks.
            </div>
          )}
          {phase === 'idle' && (
            <div className="bj-banner neutral" role="status">
              Place a bet and deal. Play chips only — for learning, not gambling.
            </div>
          )}

          <div className="bj-row">
            <div className="bj-row-head">
              <span className="bj-who">You</span>
              <span className="bj-total">
                {player.length === 0
                  ? ''
                  : playerVal.bust
                    ? `${playerVal.total} · bust`
                    : playerVal.blackjack
                      ? 'Blackjack!'
                      : `${playerVal.total}${playerVal.soft ? ' soft' : ''}`}
              </span>
            </div>
            <div className="bj-hand">
              {player.map((card, i) => (
                <Card key={card.id} card={card} index={i} />
              ))}
              {player.length === 0 && <div className="bj-card placeholder" />}
            </div>
          </div>
        </div>

        <div className="bj-controls">
          {betting ? (
            <div className="bj-bet">
              <div className="bj-chips">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`bj-chip chip-${chip}`}
                    disabled={bet >= Math.floor(bankroll)}
                    onClick={() => setBet((b) => Math.min(b + chip, Math.floor(bankroll)))}
                    aria-label={`Add ${chip} chips to the bet`}
                  >
                    {chip}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost bj-chip-clear"
                  onClick={() => setBet(0)}
                  disabled={bet === 0}
                >
                  Clear
                </button>
              </div>
              <div className="bj-bet-row">
                <span className="bj-bet-amount">
                  Bet <strong>{formatChips(bet)}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={deal}
                  disabled={bet < MIN_BET || bet > bankroll}
                >
                  {phase === 'settled' ? 'Next hand' : 'Deal'} →
                </button>
              </div>
              {broke && (
                <p className="bj-broke">
                  Out of chips.{' '}
                  <button type="button" className="back-link" onClick={resetBankroll}>
                    Reset bankroll
                  </button>
                </p>
              )}
            </div>
          ) : phase === 'player' ? (
            <div className="bj-actions">
              <button type="button" className="btn btn-primary" onClick={hit}>
                Hit
              </button>
              <button type="button" className="btn" onClick={stand}>
                Stand
              </button>
              <button type="button" className="btn" onClick={double} disabled={!canDoubleNow}>
                Double
              </button>
            </div>
          ) : (
            <div className="bj-actions bj-dealer-wait">Dealer drawing…</div>
          )}
        </div>
      </div>

      <aside className="bj-panel">
        <div className="bj-stats">
          <div className="bj-stat">
            <span className="bj-stat-v">{formatChips(bankroll)}</span>
            <span className="bj-stat-l">Bankroll</span>
          </div>
          <div className="bj-stat">
            <span className="bj-stat-v">{accuracy === null ? '—' : `${accuracy}%`}</span>
            <span className="bj-stat-l">Decision accuracy</span>
          </div>
          <div className="bj-stat">
            <span className="bj-stat-v">{tc >= 0 ? `+${tc.toFixed(1)}` : tc.toFixed(1)}</span>
            <span className="bj-stat-l">True count</span>
          </div>
          <div className="bj-stat">
            <span className="bj-stat-v">{arcade?.handsPlayed ?? 0}</span>
            <span className="bj-stat-l">Hands played</span>
          </div>
        </div>

        {history.length > 0 && (
          <div className="bj-curve">
            <div className="bj-curve-head">
              <span>Session net</span>
              <span className={history[history.length - 1] >= 0 ? 'pos' : 'neg'}>
                {history[history.length - 1] >= 0 ? '+' : ''}
                {formatChips(history[history.length - 1])} chips
              </span>
            </div>
            <NetCurve data={history} />
          </div>
        )}

        {lastDecision && (
          <div className={`bj-reveal ${lastDecision.correct ? 'good' : 'warn'}`}>
            <span className="bj-reveal-tag">{lastDecision.correct ? 'Optimal play' : 'Not optimal'}</span>
            <span className="bj-reveal-body">
              EV-best: <strong>{ACTION_LABEL[lastDecision.optimal]}</strong> ({fmtEv(lastDecision.optimalEv)})
              {' · '}you: {ACTION_LABEL[lastDecision.chosen]} ({fmtEv(lastDecision.chosenEv)})
              {lastDecision.gap > 0.001 && <> · gap {lastDecision.gap.toFixed(2)}</>}
            </span>
          </div>
        )}

        <div className="bj-coach">
          <div className="bj-coach-head">
            <span className="bj-coach-title">Dealer-coach</span>
            <span className={`bj-coach-src src-${coach?.source ?? 'idle'}`}>
              {coach?.source === 'ai'
                ? 'AI'
                : coach?.source === 'loading'
                  ? 'thinking…'
                  : coach
                    ? 'offline'
                    : ''}
            </span>
          </div>
          <p className="bj-coach-text" aria-live="polite">
            {coach?.source === 'loading' ? (
              <span className="bj-coach-thinking">
                Reading the EV math
                <span className="bj-think-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            ) : coach ? (
              coach.text
            ) : (
              'Make a move — I’ll explain the EV-optimal play and why it wins in the long run.'
            )}
          </p>
        </div>

        <label className="bj-toggle">
          <input type="checkbox" checked={coachAI} onChange={(e) => setCoachAI(e.target.checked)} />
          <span className="unlock-track" aria-hidden="true" />
          <span className="bj-toggle-text">
            AI dealer-coach
            <span className="bj-toggle-sub">
              {coachAI
                ? 'Narrates each play (falls back to the offline template if unavailable).'
                : 'Off — using the deterministic offline explanation only.'}
            </span>
          </span>
        </label>

        <div className="bj-panel-foot">
          <button type="button" className="back-link" onClick={resetBankroll}>
            Reset bankroll
          </button>
          <span className="bj-disclaimer">Play chips only · no real money · for learning, not gambling</span>
        </div>
      </aside>
    </div>
  );
}

function resultBanner(result: RoundResult): { label: string; tone: string } {
  const net = result.net;
  const amt = `${net >= 0 ? '+' : ''}${formatChips(net)}`;
  switch (result.outcome) {
    case 'blackjack':
      return { label: `Blackjack! ${amt} chips`, tone: 'good' };
    case 'player':
      return { label: `You win ${amt} chips`, tone: 'good' };
    case 'dealer-bust':
      return { label: `Dealer busts — you win ${amt} chips`, tone: 'good' };
    case 'push':
      return { label: 'Push — bet returned', tone: 'neutral' };
    case 'dealer':
      return { label: `Dealer wins ${amt} chips`, tone: 'bad' };
    case 'player-bust':
      return { label: `Bust — you lose ${amt} chips`, tone: 'bad' };
  }
}
