/**
 * Deterministic blackjack engine — the single source of truth for every number
 * the Arcade trainer shows. Hand values, legal actions, dealer behavior, the
 * exact expected value (EV) of each action, the optimal play, bust chances, and
 * the Hi-Lo card count are ALL computed here. The live dealer-coach only narrates
 * these numbers; it never decides them (PRD FR-10.2 applied to the Arcade).
 *
 * Rule set (v1):
 *   - Configurable shoe (default 6 decks), drawn without replacement.
 *   - Dealer stands on all 17s, including soft 17 (S17).
 *   - Blackjack (two-card 21) pays 3:2.
 *   - Player actions: hit / stand / double. Split, insurance, and surrender are
 *     deferred — see the TODOs in `legalActions`.
 *   - No dealer "peek": the dealer plays out the hole card. The action EVs are
 *     computed for exactly this rule set, and the Monte-Carlo test cross-checks
 *     against the same model, so the math and the simulation always agree.
 *
 * EV model: action EVs are computed by exact recursion (DP) over the *current
 * shoe composition*. Draws inside the recursion are modelled as i.i.d. samples
 * from the present composition (the cards already on the table are removed from
 * the shoe first). For a multi-deck shoe this is indistinguishable from strict
 * without-replacement play, yet it keeps the recursion memoizable and fast, and
 * — crucially for teaching counting — the EV genuinely shifts as the shoe
 * depletes (a ten/ace-rich shoe raises the player's edge). The without-
 * replacement Monte-Carlo test confirms the approximation stays within tolerance.
 */

export type Action = 'hit' | 'stand' | 'double';

/** Card rank groups, indexed 0..9. Suits are irrelevant to blackjack math. */
export const RANKS = 10;
/** Index of the Ace (counts as 11 or 1). */
export const ACE = 0;
/** Index of the ten-group (10, J, Q, K — all worth 10). */
export const TEN = 9;

/** Blackjack value of a rank index: Ace = 11, ten-group = 10, else face value. */
export function cardValue(idx: number): number {
  if (idx === ACE) return 11;
  if (idx === TEN) return 10;
  return idx + 1;
}

/** Short label for a rank index ("A", "2".."9", "10"). */
export function cardLabel(idx: number): string {
  if (idx === ACE) return 'A';
  if (idx === TEN) return '10';
  return String(idx + 1);
}

export interface HandValue {
  /** Best total ≤ 21 when possible (aces demoted from 11 to 1 as needed). */
  total: number;
  /** True when an ace is still counted as 11 (a "soft" hand). */
  soft: boolean;
  bust: boolean;
  /** A natural: exactly two cards totalling 21. */
  blackjack: boolean;
}

/** Evaluate a hand given as a list of rank indices. */
export function handValue(cards: number[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const idx of cards) {
    if (idx === ACE) {
      total += 11;
      aces += 1;
    } else {
      total += cardValue(idx);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return {
    total,
    soft: aces > 0,
    bust: total > 21,
    blackjack: cards.length === 2 && total === 21,
  };
}

/** A shoe is a length-10 vector of remaining card counts, indexed by rank. */
export type Shoe = number[];

/** A fresh, full shoe of `decks` decks (52 cards each: four of each rank, 16 tens). */
export function freshShoe(decks = 6): Shoe {
  const shoe = new Array<number>(RANKS).fill(0);
  for (let i = 0; i < RANKS; i++) shoe[i] = (i === TEN ? 16 : 4) * decks;
  return shoe;
}

export function shoeTotal(shoe: Shoe): number {
  let t = 0;
  for (let i = 0; i < RANKS; i++) t += shoe[i];
  return t;
}

/** Decks still in the shoe (cards remaining / 52). */
export function decksRemaining(shoe: Shoe): number {
  return shoeTotal(shoe) / 52;
}

/** Draw probability of each rank under the current composition (sums to 1). */
export function composition(shoe: Shoe): number[] {
  const t = shoeTotal(shoe);
  if (t <= 0) return new Array<number>(RANKS).fill(0);
  return shoe.map((c) => c / t);
}

// Hi-Lo tags: 2–6 = +1, 7–9 = 0, 10 & Ace = −1. Indexed by rank.
const HILO: number[] = [-1, 1, 1, 1, 1, 1, 0, 0, 0, -1];

/** Hi-Lo running count implied by the cards already dealt out of the shoe. */
export function runningCount(shoe: Shoe, decks: number): number {
  const fresh = freshShoe(decks);
  let rc = 0;
  for (let i = 0; i < RANKS; i++) rc += HILO[i] * (fresh[i] - shoe[i]);
  return rc;
}

/** Hi-Lo true count: running count normalized per deck remaining. */
export function trueCount(shoe: Shoe, decks: number): number {
  const dr = decksRemaining(shoe);
  return dr > 0 ? runningCount(shoe, decks) / dr : 0;
}

// --- internal hand-state arithmetic (total + number of aces still worth 11) ---

interface HState {
  total: number;
  softAces: number;
}

function reduceHand(cards: number[]): HState {
  let total = 0;
  let softAces = 0;
  for (const idx of cards) {
    if (idx === ACE) {
      total += 11;
      softAces += 1;
    } else {
      total += cardValue(idx);
    }
  }
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  return { total, softAces };
}

function addCard(total: number, softAces: number, idx: number): HState {
  if (idx === ACE) {
    total += 11;
    softAces += 1;
  } else {
    total += cardValue(idx);
  }
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  return { total, softAces };
}

/**
 * Dealer final-total distribution as a length-6 vector:
 * [P(17), P(18), P(19), P(20), P(21), P(bust)]. Computed by exact recursion from
 * the upcard under S17, sampling each draw from the fixed composition `p`.
 */
export type DealerDist = number[];

function bucket(total: number): number {
  return total > 21 ? 5 : total - 17;
}

export function dealerDistribution(p: number[], upcard: number): DealerDist {
  const memo = new Map<number, DealerDist>();
  function rec(total: number, softAces: number): DealerDist {
    if (total >= 17) {
      const d = [0, 0, 0, 0, 0, 0];
      d[bucket(total)] = 1;
      return d;
    }
    const key = total * 2 + (softAces > 0 ? 1 : 0);
    const cached = memo.get(key);
    if (cached) return cached;
    const d = [0, 0, 0, 0, 0, 0];
    for (let idx = 0; idx < RANKS; idx++) {
      const pi = p[idx];
      if (pi <= 0) continue;
      const ns = addCard(total, softAces, idx);
      const sub = rec(ns.total, ns.softAces);
      for (let k = 0; k < 6; k++) d[k] += pi * sub[k];
    }
    memo.set(key, d);
    return d;
  }
  const start = addCard(0, 0, upcard);
  return rec(start.total, start.softAces);
}

/** Probability the dealer busts given an upcard and composition. */
export function dealerBustChance(p: number[], upcard: number): number {
  return dealerDistribution(p, upcard)[5];
}

/** EV of standing on `playerTotal` against a known dealer distribution. */
function standEvFromDist(dist: DealerDist, playerTotal: number): number {
  let ev = dist[5]; // dealer busts → player wins one unit
  for (let i = 0; i < 5; i++) {
    const dealerTotal = 17 + i;
    ev += dist[i] * (playerTotal > dealerTotal ? 1 : playerTotal === dealerTotal ? 0 : -1);
  }
  return ev;
}

interface ActionEV {
  hit: number;
  stand: number;
  /** null when doubling is not legal for this decision. */
  double: number | null;
}

export interface BlackjackState {
  shoe: Shoe;
  decks: number;
  player: number[];
  dealerUp: number;
  /** Whether doubling is offered for this decision (first action, funds permitting). */
  canDouble: boolean;
}

export interface Evaluation {
  ev: ActionEV;
  optimalAction: Action;
  /** EV of the optimal action. */
  optimalEv: number;
  /** Chance the player busts if they take exactly one more card. */
  bustChanceIfHit: number;
  /** Chance the dealer busts from the current upcard. */
  dealerBustChance: number;
  dealerDist: DealerDist;
  runningCount: number;
  trueCount: number;
  playerValue: HandValue;
}

/** Legal actions for a decision. Split/insurance/surrender are v1 TODOs. */
export function legalActions(state: BlackjackState): Action[] {
  const actions: Action[] = ['hit', 'stand'];
  if (state.canDouble) actions.push('double');
  // TODO(v1+): 'split' when player has a pair (state.player[0] === state.player[1]).
  // TODO(v1+): 'insurance' / even-money when state.dealerUp === ACE.
  // TODO(v1+): 'surrender' (late) on the first decision.
  return actions;
}

/**
 * Fully evaluate a decision: exact EV of each legal action, the optimal action,
 * bust chances, and the running/true count. This is the answer key the trainer
 * grades play against and the coach narrates.
 */
export function evaluate(state: BlackjackState): Evaluation {
  const p = composition(state.shoe);
  const playerValue = handValue(state.player);
  const dist = dealerDistribution(p, state.dealerUp);
  const start = reduceHand(state.player);

  // playEv(total, softAces) = best EV continuing optimally with hit/stand only.
  const memo = new Map<number, number>();
  function playEv(total: number, softAces: number): number {
    const key = total * 2 + (softAces > 0 ? 1 : 0);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const standEv = standEvFromDist(dist, total);
    let hitEv = 0;
    for (let idx = 0; idx < RANKS; idx++) {
      const pi = p[idx];
      if (pi <= 0) continue;
      const ns = addCard(total, softAces, idx);
      hitEv += pi * (ns.total > 21 ? -1 : playEv(ns.total, ns.softAces));
    }
    const best = Math.max(standEv, hitEv);
    memo.set(key, best);
    return best;
  }

  const standEv = standEvFromDist(dist, playerValue.total);

  let hitEv = 0;
  let bustChanceIfHit = 0;
  for (let idx = 0; idx < RANKS; idx++) {
    const pi = p[idx];
    if (pi <= 0) continue;
    const ns = addCard(start.total, start.softAces, idx);
    if (ns.total > 21) {
      bustChanceIfHit += pi;
      hitEv += pi * -1;
    } else {
      hitEv += pi * playEv(ns.total, ns.softAces);
    }
  }

  let doubleEv: number | null = null;
  if (state.canDouble) {
    let oneCard = 0;
    for (let idx = 0; idx < RANKS; idx++) {
      const pi = p[idx];
      if (pi <= 0) continue;
      const ns = addCard(start.total, start.softAces, idx);
      oneCard += pi * (ns.total > 21 ? -1 : standEvFromDist(dist, ns.total));
    }
    doubleEv = 2 * oneCard;
  }

  // Argmax over legal actions, tie-break order stand > hit > double (stable).
  let optimalAction: Action = 'stand';
  let optimalEv = standEv;
  if (hitEv > optimalEv) {
    optimalAction = 'hit';
    optimalEv = hitEv;
  }
  if (doubleEv !== null && doubleEv > optimalEv) {
    optimalAction = 'double';
    optimalEv = doubleEv;
  }

  return {
    ev: { hit: hitEv, stand: standEv, double: doubleEv },
    optimalAction,
    optimalEv,
    bustChanceIfHit,
    dealerBustChance: dist[5],
    dealerDist: dist,
    runningCount: runningCount(state.shoe, state.decks),
    trueCount: trueCount(state.shoe, state.decks),
    playerValue,
  };
}

/** EV the player gave up by choosing `chosen` instead of the optimal action (≥ 0). */
export function evGap(evaluation: Evaluation, chosen: Action): number {
  const chosenEv = chosen === 'double' ? evaluation.ev.double ?? evaluation.ev.stand : evaluation.ev[chosen];
  return Math.max(0, evaluation.optimalEv - chosenEv);
}

/** Whether `chosen` matches the optimal action within a tiny EV tolerance. */
export function isOptimalChoice(evaluation: Evaluation, chosen: Action, eps = 1e-6): boolean {
  return evGap(evaluation, chosen) <= eps;
}

// --- dealing (stateful helpers; pass an rng for deterministic tests) ---

/**
 * Draw one card from the shoe, removing it (mutates `shoe`). `r` is a uniform in
 * [0, 1). Returns the rank index drawn.
 */
export function drawIndex(shoe: Shoe, r: number): number {
  const total = shoeTotal(shoe);
  let x = r * total;
  for (let i = 0; i < RANKS; i++) {
    x -= shoe[i];
    if (x < 0) {
      shoe[i] -= 1;
      return i;
    }
  }
  for (let i = RANKS - 1; i >= 0; i--) {
    if (shoe[i] > 0) {
      shoe[i] -= 1;
      return i;
    }
  }
  return TEN;
}

/**
 * Play the dealer out under S17, drawing from and depleting `shoe`. Returns the
 * dealer's final cards (input cards plus any draws).
 */
export function playDealer(shoe: Shoe, dealer: number[], rng: () => number): number[] {
  const cards = dealer.slice();
  while (handValue(cards).total < 17) {
    cards.push(drawIndex(shoe, rng()));
  }
  return cards;
}

/** True once the shoe is depleted past the penetration point — time to reshuffle. */
export function needsReshuffle(shoe: Shoe, decks: number, penetration = 0.25): boolean {
  return shoeTotal(shoe) < 52 * decks * penetration;
}

/** Blackjack pays 3:2. Net chips for a settled round, given the bet and outcome. */
export type RoundOutcome = 'player-bust' | 'dealer-bust' | 'player' | 'dealer' | 'push' | 'blackjack';

export function settleNet(bet: number, outcome: RoundOutcome, doubled = false): number {
  const stake = doubled ? bet * 2 : bet;
  switch (outcome) {
    case 'blackjack':
      return bet * 1.5;
    case 'player':
    case 'dealer-bust':
      return stake;
    case 'dealer':
    case 'player-bust':
      return -stake;
    case 'push':
      return 0;
  }
}

/**
 * Resolve a completed hand (player not bust, blackjacks already handled) against a
 * finished dealer hand. Pure comparison used by both the table and the tests.
 */
export function compareHands(playerTotal: number, dealerCards: number[]): RoundOutcome {
  const dealer = handValue(dealerCards);
  if (dealer.bust) return 'dealer-bust';
  if (playerTotal > dealer.total) return 'player';
  if (playerTotal < dealer.total) return 'dealer';
  return 'push';
}
