/**
 * Dealer-coach narration. The coach explains *why* the engine's optimal play wins,
 * referencing the EV numbers the engine already produced — it never computes or
 * contradicts them. `templateExplanation` is the deterministic, offline fallback
 * (PRD FR-10.3 / NFR-7): when the AI coach is disabled or unreachable, this is
 * what the learner sees, built from the same numbers the AI would have narrated.
 * It is also the grounding context handed to the server-side model.
 */
import type { Action, Evaluation } from './blackjack';
import { cardLabel } from './blackjack';

/** Everything the coach needs, as a flat, serializable object (sent to the AI too). */
export interface CoachInput {
  playerCards: string[];
  playerTotal: number;
  playerSoft: boolean;
  dealerUpcard: string;
  ev: { hit: number; stand: number; double: number | null };
  optimalAction: Action;
  /** The action the learner actually took, or null for a pre-decision tip. */
  chosenAction: Action | null;
  dealerBustChance: number;
  bustChanceIfHit: number;
  trueCount: number;
}

/** Format an EV as a signed two-decimal string, e.g. "+0.02" or "-0.05". */
export function fmtEv(x: number): string {
  return `${x >= 0 ? '+' : '-'}${Math.abs(x).toFixed(2)}`;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

const VERB_ING: Record<Action, string> = { hit: 'Hitting', stand: 'Standing', double: 'Doubling' };
const VERB: Record<Action, string> = { hit: 'hitting', stand: 'standing', double: 'doubling' };
const NOUN: Record<Action, string> = { hit: 'hit', stand: 'stand', double: 'double' };

function evOf(ev: CoachInput['ev'], action: Action): number {
  if (action === 'double') return ev.double ?? ev.stand;
  return ev[action];
}

/** Map a full engine Evaluation to a coach input for a given hand + (optional) choice. */
export function buildCoachInput(
  evaluation: Evaluation,
  params: { playerCards: number[]; dealerUp: number; chosenAction?: Action | null },
): CoachInput {
  return {
    playerCards: params.playerCards.map(cardLabel),
    playerTotal: evaluation.playerValue.total,
    playerSoft: evaluation.playerValue.soft,
    dealerUpcard: cardLabel(params.dealerUp),
    ev: evaluation.ev,
    optimalAction: evaluation.optimalAction,
    chosenAction: params.chosenAction ?? null,
    dealerBustChance: evaluation.dealerBustChance,
    bustChanceIfHit: evaluation.bustChanceIfHit,
    trueCount: evaluation.trueCount,
  };
}

/**
 * Deterministic, plain-language explanation built purely from the engine's numbers.
 * Returns 2–4 short sentences. This is the offline fallback and the AI grounding.
 */
export function templateExplanation(input: CoachInput): string {
  const { optimalAction, ev, dealerUpcard, playerTotal, playerSoft } = input;
  const optEv = evOf(ev, optimalAction);

  // Strongest alternative, for contrast.
  const alts: Array<[Action, number]> = [];
  (['hit', 'stand', 'double'] as Action[]).forEach((a) => {
    if (a === optimalAction) return;
    if (a === 'double' && ev.double === null) return;
    alts.push([a, evOf(ev, a)]);
  });
  alts.sort((a, b) => b[1] - a[1]);
  const alt = alts[0];

  // Why this play wins.
  let why: string;
  if (optimalAction === 'stand') {
    why = `the dealer's ${dealerUpcard} busts about ${pct(input.dealerBustChance)} of the time, so it's better to let them draw than to risk busting your ${playerTotal}`;
  } else if (playerSoft) {
    why = `your soft ${playerTotal} can't bust on the next card, so taking one more is upside with no downside risk`;
  } else if (input.bustChanceIfHit < 0.4) {
    why = `you only bust about ${pct(input.bustChanceIfHit)} of the time on the next card, while standing on ${playerTotal} rarely wins outright`;
  } else {
    why = `standing on ${playerTotal} against a ${dealerUpcard} loses too often, so drawing is the lesser of two evils`;
  }
  if (optimalAction === 'double') {
    why += `, and the edge is large enough to justify putting out a second chip`;
  }

  const sentences: string[] = [];
  sentences.push(
    alt
      ? `${VERB_ING[optimalAction]} is the long-run play here: ${fmtEv(optEv)} EV versus ${fmtEv(alt[1])} for ${VERB[alt[0]]}.`
      : `${VERB_ING[optimalAction]} is the long-run play here at ${fmtEv(optEv)} EV.`,
  );
  sentences.push(`That's because ${why}.`);

  if (input.chosenAction) {
    if (input.chosenAction === optimalAction) {
      sentences.push(`You chose to ${NOUN[input.chosenAction]} — that's the EV-optimal call.`);
    } else {
      const gap = optEv - evOf(ev, input.chosenAction);
      sentences.push(
        `You chose to ${NOUN[input.chosenAction]} (${fmtEv(evOf(ev, input.chosenAction))} EV), giving up about ${gap.toFixed(2)} per chip over the long run.`,
      );
    }
  }

  if (Math.abs(input.trueCount) >= 2) {
    sentences.push(
      input.trueCount > 0
        ? `The shoe is running rich (true count ${input.trueCount.toFixed(1)}), tilting the edge your way.`
        : `The shoe is running lean (true count ${input.trueCount.toFixed(1)}), tilting the edge toward the house.`,
    );
  }

  return sentences.join(' ');
}
