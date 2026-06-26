import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';
import {
  ACE,
  TEN,
  RANKS,
  cardValue,
  cardLabel,
  handValue,
  freshShoe,
  shoeTotal,
  decksRemaining,
  composition,
  runningCount,
  trueCount,
  dealerDistribution,
  dealerBustChance,
  evaluate,
  evGap,
  isOptimalChoice,
  legalActions,
  compareHands,
  settleNet,
  type BlackjackState,
} from './blackjack';

/** Sample a rank index from a composition vector using a uniform r in [0,1). */
function sampleRank(comp: number[], r: number): number {
  let x = r;
  for (let i = 0; i < comp.length; i++) {
    x -= comp[i];
    if (x < 0) return i;
  }
  return comp.length - 1;
}

/** Play the dealer out (S17) sampling with replacement from `comp`. Returns final total. */
function dealerFinalTotalWR(comp: number[], up: number, rng: () => number): number {
  const cards = [up];
  while (handValue(cards).total < 17) cards.push(sampleRank(comp, rng()));
  return handValue(cards).total;
}

describe('card values and labels', () => {
  it('maps rank indices to blackjack values', () => {
    expect(cardValue(ACE)).toBe(11);
    expect(cardValue(TEN)).toBe(10);
    expect(cardValue(1)).toBe(2);
    expect(cardValue(8)).toBe(9);
    expect(cardLabel(ACE)).toBe('A');
    expect(cardLabel(TEN)).toBe('10');
    expect(cardLabel(5)).toBe('6');
  });
});

describe('handValue', () => {
  it('hard totals and bust', () => {
    expect(handValue([9, 5])).toMatchObject({ total: 16, soft: false, bust: false }); // 10 + 6
    expect(handValue([9, 9, 1])).toMatchObject({ total: 22, bust: true }); // 10 + 10 + 2
  });
  it('soft totals demote aces as needed', () => {
    expect(handValue([ACE, 5])).toMatchObject({ total: 17, soft: true }); // A + 6
    expect(handValue([ACE, 5, 9])).toMatchObject({ total: 17, soft: false }); // A,6,10 -> 17 hard
    expect(handValue([ACE, ACE])).toMatchObject({ total: 12, soft: true });
    expect(handValue([ACE, ACE, 8])).toMatchObject({ total: 21, soft: true }); // 11+1+9
  });
  it('detects blackjack only on two cards', () => {
    expect(handValue([ACE, TEN]).blackjack).toBe(true);
    expect(handValue([ACE, 9, 1]).blackjack).toBe(false); // 3-card 21
    expect(handValue([9, 9, 1]).blackjack).toBe(false);
  });
});

describe('shoe + counting', () => {
  it('fresh shoe has the right composition', () => {
    const shoe = freshShoe(6);
    expect(shoeTotal(shoe)).toBe(312);
    expect(shoe[ACE]).toBe(24);
    expect(shoe[TEN]).toBe(96);
    expect(shoe[1]).toBe(24);
    expect(decksRemaining(shoe)).toBeCloseTo(6, 10);
    const comp = composition(shoe);
    expect(comp.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(comp[TEN]).toBeCloseTo(96 / 312, 10);
  });
  it('Hi-Lo running and true count reflect dealt cards', () => {
    const decks = 6;
    const shoe = freshShoe(decks);
    // Deal out five low cards (2..6) -> running count +5.
    for (const idx of [1, 2, 3, 4, 5]) shoe[idx] -= 1;
    expect(runningCount(shoe, decks)).toBe(5);
    // Deal out two tens and an ace -> count drops by 3 to +2.
    shoe[TEN] -= 2;
    shoe[ACE] -= 1;
    expect(runningCount(shoe, decks)).toBe(2);
    const dr = decksRemaining(shoe);
    expect(trueCount(shoe, decks)).toBeCloseTo(2 / dr, 10);
  });
});

describe('dealer distribution', () => {
  it('sums to one for every upcard', () => {
    const comp = composition(freshShoe(8));
    for (let up = 0; up < RANKS; up++) {
      const dist = dealerDistribution(comp, up);
      expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });
  it('bust probabilities match the known infinite-deck S17 values', () => {
    const comp = composition(freshShoe(8)); // ~ infinite deck
    expect(dealerBustChance(comp, 5)).toBeCloseTo(0.423, 2); // upcard 6 busts ~42%
    expect(dealerBustChance(comp, 6)).toBeCloseTo(0.262, 2); // upcard 7
    expect(dealerBustChance(comp, TEN)).toBeCloseTo(0.213, 2); // upcard 10
    expect(dealerBustChance(comp, ACE)).toBeCloseTo(0.117, 2); // upcard A (S17)
  });
  it('agrees with a Monte-Carlo dealer playout (upcard 9)', () => {
    const comp = composition(freshShoe(6));
    const dist = dealerDistribution(comp, 8); // upcard 9
    const rng = makeRng(12345).next;
    const tally = [0, 0, 0, 0, 0, 0];
    const N = 80000;
    for (let i = 0; i < N; i++) {
      const t = dealerFinalTotalWR(comp, 8, rng);
      tally[t > 21 ? 5 : t - 17] += 1;
    }
    for (let k = 0; k < 6; k++) expect(Math.abs(tally[k] / N - dist[k])).toBeLessThan(0.01);
  });
});

describe('legal actions', () => {
  it('offers double only when allowed', () => {
    const base: BlackjackState = {
      shoe: freshShoe(6),
      decks: 6,
      player: [9, 5],
      dealerUp: 8,
      canDouble: true,
    };
    expect(legalActions(base)).toEqual(['hit', 'stand', 'double']);
    expect(legalActions({ ...base, canDouble: false })).toEqual(['hit', 'stand']);
  });
});

describe('optimal action matches basic strategy', () => {
  function stateFor(player: number[], up: number, canDouble = true): BlackjackState {
    const decks = 6;
    const shoe = freshShoe(decks);
    for (const c of player) shoe[c] -= 1;
    shoe[up] -= 1;
    return { shoe, decks, player, dealerUp: up, canDouble };
  }
  it('stands on strong totals', () => {
    expect(evaluate(stateFor([TEN, TEN], 5)).optimalAction).toBe('stand'); // 20 v 6
    expect(evaluate(stateFor([TEN, 5], 5)).optimalAction).toBe('stand'); // 15 v 6 (stiff vs weak)
  });
  it('hits weak/stiff hands against strong upcards', () => {
    expect(evaluate(stateFor([4, 1], 5)).optimalAction).toBe('hit'); // 8 v 6 (must improve)
    expect(evaluate(stateFor([TEN, 1], TEN)).optimalAction).toBe('hit'); // 12 v 10
  });
  it('doubles 11 vs 6, but only when doubling is legal', () => {
    expect(evaluate(stateFor([8, 1], 5, true)).optimalAction).toBe('double'); // 9+2 = 11 v 6
    expect(evaluate(stateFor([8, 1], 5, false)).optimalAction).toBe('hit');
  });
  it('handles soft hands (soft 18)', () => {
    expect(evaluate(stateFor([ACE, 6], 8, false)).optimalAction).toBe('hit'); // soft 18 v 9 -> hit
    expect(evaluate(stateFor([ACE, 6], 5, false)).optimalAction).toBe('stand'); // soft 18 v 6 -> stand
  });
});

describe('evGap / isOptimalChoice', () => {
  it('zero gap for the optimal action, positive for worse ones', () => {
    const decks = 6;
    const shoe = freshShoe(decks);
    const player = [TEN, TEN];
    for (const c of player) shoe[c] -= 1;
    shoe[5] -= 1;
    const evaluation = evaluate({ shoe, decks, player, dealerUp: 5, canDouble: true });
    expect(evaluation.optimalAction).toBe('stand');
    expect(isOptimalChoice(evaluation, 'stand')).toBe(true);
    expect(evGap(evaluation, 'stand')).toBeCloseTo(0, 10);
    expect(evGap(evaluation, 'hit')).toBeGreaterThan(0.1);
  });
});

describe('bust chance if hit', () => {
  it('equals the composition mass of busting ranks for hard 16', () => {
    const decks = 6;
    const shoe = freshShoe(decks);
    const player = [9, 5]; // 10 + 6 = 16
    for (const c of player) shoe[c] -= 1;
    shoe[8] -= 1; // dealer up 9
    const evaluation = evaluate({ shoe, decks, player, dealerUp: 8, canDouble: false });
    const comp = composition(shoe);
    // 16 busts on a 6,7,8,9,10 (indices 5..9); an ace makes 17 (soft), small cards stay <=21.
    const expected = comp[5] + comp[6] + comp[7] + comp[8] + comp[9];
    expect(evaluation.bustChanceIfHit).toBeCloseTo(expected, 10);
  });
});

describe('Monte-Carlo cross-check: action EVs converge to the engine', () => {
  const decks = 6;
  const shoe = freshShoe(decks);
  const player = [9, 5]; // hard 16
  const dealerUp = 8; // 9
  for (const c of player) shoe[c] -= 1;
  shoe[dealerUp] -= 1;
  const comp = composition(shoe);
  const playerTotal = handValue(player).total;

  const evalDouble = evaluate({ shoe, decks, player, dealerUp, canDouble: true });
  const evalNoDouble = evaluate({ shoe, decks, player, dealerUp, canDouble: false });

  it('stand EV matches simulation (with replacement, same model)', () => {
    const rng = makeRng(1).next;
    let sum = 0;
    const N = 120000;
    for (let i = 0; i < N; i++) {
      const dt = dealerFinalTotalWR(comp, dealerUp, rng);
      sum += dt > 21 ? 1 : playerTotal > dt ? 1 : playerTotal === dt ? 0 : -1;
    }
    expect(Math.abs(sum / N - evalDouble.ev.stand)).toBeLessThan(0.02);
  });

  it('double EV matches simulation', () => {
    const rng = makeRng(2).next;
    let sum = 0;
    const N = 120000;
    for (let i = 0; i < N; i++) {
      const c = sampleRank(comp, rng());
      const v = handValue([...player, c]);
      if (v.bust) {
        sum += -2;
      } else {
        const dt = dealerFinalTotalWR(comp, dealerUp, rng);
        const outcome = dt > 21 ? 1 : v.total > dt ? 1 : v.total === dt ? 0 : -1;
        sum += 2 * outcome;
      }
    }
    expect(evalDouble.ev.double).not.toBeNull();
    expect(Math.abs(sum / N - (evalDouble.ev.double as number))).toBeLessThan(0.03);
  });

  it('hit EV matches simulation of the engine-optimal continuation', () => {
    // The "hit" action takes one card, then plays optimally (hit/stand). Simulating
    // the DP's own policy must realize the DP's claimed value — a faithful check of
    // the recursion's arithmetic.
    const rng = makeRng(3).next;
    let sum = 0;
    const N = 80000;
    for (let i = 0; i < N; i++) {
      const hand = [...player, sampleRank(comp, rng())];
      let net = 0;
      let resolved = false;
      while (!resolved) {
        const v = handValue(hand);
        if (v.bust) {
          net = -1;
          break;
        }
        const decision = evaluate({ shoe, decks, player: hand, dealerUp, canDouble: false });
        if (decision.optimalAction === 'hit') {
          hand.push(sampleRank(comp, rng()));
        } else {
          const dt = dealerFinalTotalWR(comp, dealerUp, rng);
          net = dt > 21 ? 1 : v.total > dt ? 1 : v.total === dt ? 0 : -1;
          resolved = true;
        }
      }
      sum += net;
    }
    expect(Math.abs(sum / N - evalNoDouble.ev.hit)).toBeLessThan(0.03);
  });

  it("stand EV under real without-replacement play stays within tolerance (the approximation is sound)", () => {
    const rng = makeRng(7).next;
    let sum = 0;
    const N = 60000;
    for (let i = 0; i < N; i++) {
      // Rebuild a real shoe each trial and deplete it as the dealer draws.
      const real = freshShoe(decks);
      for (const c of player) real[c] -= 1;
      real[dealerUp] -= 1;
      const cards = [dealerUp];
      while (handValue(cards).total < 17) {
        const localComp = composition(real);
        const idx = sampleRank(localComp, rng());
        real[idx] -= 1;
        cards.push(idx);
      }
      const dt = handValue(cards).total;
      sum += dt > 21 ? 1 : playerTotal > dt ? 1 : playerTotal === dt ? 0 : -1;
    }
    expect(Math.abs(sum / N - evalDouble.ev.stand)).toBeLessThan(0.03);
  });
});

describe('settlement helpers', () => {
  it('compareHands resolves player vs dealer', () => {
    expect(compareHands(20, [9, 8])).toBe('player'); // 20 vs 18
    expect(compareHands(18, [9, 9])).toBe('dealer'); // 18 vs 19
    expect(compareHands(19, [9, 8, 5])).toBe('dealer-bust'); // 10 + 9 + 6 = 25
    expect(compareHands(19, [9, 8])).toBe('push'); // 19 vs 19
  });
  it('settleNet pays 3:2 on blackjack and doubles the stake on a double', () => {
    expect(settleNet(100, 'blackjack')).toBe(150);
    expect(settleNet(100, 'player')).toBe(100);
    expect(settleNet(100, 'player', true)).toBe(200);
    expect(settleNet(100, 'dealer', true)).toBe(-200);
    expect(settleNet(100, 'push')).toBe(0);
  });
});
