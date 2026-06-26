import { describe, it, expect } from 'vitest';
import { templateExplanation, buildCoachInput, fmtEv, type CoachInput } from './coach';
import { evaluate, freshShoe, TEN, type BlackjackState } from './blackjack';

const stand16v6: CoachInput = {
  playerCards: ['10', '6'],
  playerTotal: 16,
  playerSoft: false,
  dealerUpcard: '6',
  ev: { hit: -0.5, stand: -0.15, double: -1.0 },
  optimalAction: 'stand',
  chosenAction: 'hit',
  dealerBustChance: 0.42,
  bustChanceIfHit: 0.62,
  trueCount: 0,
};

describe('fmtEv', () => {
  it('signs and rounds to two decimals', () => {
    expect(fmtEv(0.02)).toBe('+0.02');
    expect(fmtEv(-0.05)).toBe('-0.05');
    expect(fmtEv(0)).toBe('+0.00');
  });
});

describe('templateExplanation', () => {
  it('explains a stand with the dealer bust chance and the EV gap', () => {
    const text = templateExplanation(stand16v6);
    expect(text).toContain('Standing');
    expect(text).toContain('-0.15'); // stand EV rendered
    expect(text).toContain('42%'); // dealer 6 bust chance
    expect(text).toContain('hit'); // mentions the chosen (suboptimal) action
    // It gave up stand(-0.15) - hit(-0.50) = 0.35 EV.
    expect(text).toContain('0.35');
  });

  it('affirms when the chosen action is optimal', () => {
    const text = templateExplanation({ ...stand16v6, chosenAction: 'stand' });
    expect(text).toContain('EV-optimal call');
  });

  it('explains a double and references the second chip', () => {
    const text = templateExplanation({
      playerCards: ['9', '2'],
      playerTotal: 11,
      playerSoft: false,
      dealerUpcard: '6',
      ev: { hit: 0.2, stand: -0.1, double: 0.4 },
      optimalAction: 'double',
      chosenAction: null,
      dealerBustChance: 0.42,
      bustChanceIfHit: 0.0,
      trueCount: 0,
    });
    expect(text).toContain('Doubling');
    expect(text).toContain('second chip');
  });

  it('mentions the count only when it is notable', () => {
    expect(templateExplanation({ ...stand16v6, trueCount: 0 })).not.toContain('true count');
    expect(templateExplanation({ ...stand16v6, trueCount: 3 })).toContain('true count');
  });

  it('never contradicts the engine: the optimal verb leads the explanation', () => {
    const decks = 6;
    const shoe = freshShoe(decks);
    const player = [TEN, TEN]; // 20
    for (const c of player) shoe[c] -= 1;
    shoe[5] -= 1; // dealer up 6
    const state: BlackjackState = { shoe, decks, player, dealerUp: 5, canDouble: true };
    const evaluation = evaluate(state);
    const input = buildCoachInput(evaluation, { playerCards: player, dealerUp: 5, chosenAction: 'stand' });
    const text = templateExplanation(input);
    expect(evaluation.optimalAction).toBe('stand');
    expect(text.startsWith('Standing')).toBe(true);
    expect(text).toContain('EV-optimal call');
  });
});
