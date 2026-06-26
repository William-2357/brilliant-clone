/**
 * Parameterized problem pools. Each lesson maps to one template per problem slot
 * (ids match the static problems in `lessons.ts`). At play time the lesson player
 * builds a concrete problem from a template + the attempt's seed, so the numbers,
 * objects, and *narrative scenario* vary between playthroughs while the answer is
 * always recomputed from `probability.ts`. The static problems in `lessons.ts`
 * remain the fallback.
 *
 * Scenario harvesting (see SOURCES.md): each template family carries a bank of
 * real-world contexts (QA/manufacturing, epidemiology, sports, polling, insurance,
 * ecology, finance, games…). The prose is original/hand-written; only the *archetype*
 * is borrowed from openly-licensed texts (OpenStax, Grinstead & Snell, NIST, MIT
 * OCW, LibreTexts). Every context is re-derived through this app's engine: it must
 * map to an existing SimulationType and recompute its answer from `probability.ts`,
 * matching that sim's behavior. Scenarios that need math we don't own live in
 * BACKLOG.md, not here.
 */
import type { LessonStep } from '../types/lesson';
import { makeRng, hashString, type Rng } from '../lib/rng';
import type { WheelSegment } from '../lib/probability';
import {
  longRunFrequency,
  diceSumDistribution,
  binomialPmf,
  galtonCenterFraction,
  montyHallSwitchWin,
  sumsByLikelihood,
  rankBy,
  randomWalkDrift,
  randomWalkRMS,
  randomWalkEndDistribution,
  dieMean,
  dieSD,
  standardError,
  diceSampleMeanDistribution,
  expectedValue,
  drawProbability,
  drawMatchesNoReplacement,
} from '../lib/probability';
import { wheelConfig } from './simData';
import { generatedBySlot } from './generated';

interface ProblemTemplate {
  /** Stable slot id — must match a problem step id in lessons.ts. */
  id: string;
  build: (r: Rng) => LessonStep;
}

const dice = diceSumDistribution();
const pct = (p: number) => `${Math.round(p * 100)}%`;
const f0 = (x: number) => (x >= 0 ? '+' : '') + Math.round(x);
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const f3 = (x: number) => x.toFixed(3);
const money = (x: number) => `$${Number.isInteger(x) ? x.toFixed(0) : x.toFixed(2)}`;
const ways = (sum: number) => Math.round(dice[sum] * 36);

/** ~40% of the time, present a numeric problem as a drag-to-predict slider instead. */
function withSlider(step: LessonStep, r: Rng, min: number, max: number, stp: number, prompt: string): LessonStep {
  if (r.chance(0.4)) {
    step.interaction = 'slider';
    step.sliderMin = min;
    step.sliderMax = max;
    step.sliderStep = stp;
    step.question = prompt;
  }
  return step;
}

/* ============================ Coin flip (l1) ============================ */

/**
 * A long-run-frequency scenario: a process of independent, identical Bernoulli(p)
 * trials. The coin sim shows the fraction of "successes" converging to p, so the
 * fraction answer is longRunFrequency(p) and the count answer is p·n.
 *   trials  — plural noun for all n repetitions ("flips", "units", "voters")
 *   success — plural noun for the favorable ones ("heads", "passing units")
 *   one     — singular noun for one repetition ("flip", "unit")
 */
interface CoinScenario {
  setup: (p: number) => string;
  trials: string;
  success: string;
  /** Plural/predicate noun for the complementary outcome, e.g. "tails", "claim-free". */
  fail: string;
  one: string;
}

const coinScenarios: CoinScenario[] = [
  {
    setup: (p) => `A novelty coin is weighted to land heads ${pct(p)} of the time, and the mint insists every toss is independent of the last.`,
    trials: 'flips', success: 'heads', fail: 'tails', one: 'flip',
  },
  {
    setup: (p) => `On an assembly line, each finished unit clears final inspection with probability ${pct(p)}, independently of the others coming down the belt.`,
    trials: 'units', success: 'passing units', fail: 'rejects', one: 'unit',
  },
  {
    setup: (p) => `A seed supplier guarantees that each seed germinates with probability ${pct(p)} in standard soil, independently of the rest of the packet.`,
    trials: 'seeds', success: 'sprouted seeds', fail: 'duds', one: 'seed',
  },
  {
    setup: (p) => `A basketball guard converts free throws at a ${pct(p)} rate over the season; model each attempt as independent at that same rate.`,
    trials: 'attempts', success: 'made shots', fail: 'misses', one: 'attempt',
  },
  {
    setup: (p) => `A pollster phones voters at random, and each person reached independently says they support the measure with probability ${pct(p)}.`,
    trials: 'voters', success: 'supporters', fail: 'non-supporters', one: 'voter',
  },
  {
    setup: (p) => `An insurer's actuaries model each policyholder as filing a claim in a given year with probability ${pct(p)}, treating the policies as independent.`,
    trials: 'policyholders', success: 'claimants', fail: 'claim-free', one: 'policyholder',
  },
  {
    setup: (p) => `In a field trial, a vaccine blocks infection on each documented exposure with probability ${pct(p)}, and exposures are treated as independent events.`,
    trials: 'exposures', success: 'blocked exposures', fail: 'breakthrough infections', one: 'exposure',
  },
  {
    setup: (p) => `A solar-cell fab tests panels one at a time; each meets the efficiency spec with probability ${pct(p)}, independently of the rest.`,
    trials: 'panels', success: 'in-spec panels', fail: 'out of spec', one: 'panel',
  },
  {
    setup: (p) => `A spam filter scans incoming mail and correctly flags each junk message with probability ${pct(p)}, treating successive messages as independent.`,
    trials: 'junk messages', success: 'flagged messages', fail: 'missed', one: 'message',
  },
  {
    setup: (p) => `In one coastal town, forecasters model each day as rainy with probability ${pct(p)}, independent of its neighbours, for the sake of a back-of-envelope estimate.`,
    trials: 'days', success: 'rainy days', fail: 'dry', one: 'day',
  },
  {
    setup: (p) => `A hatchery releases tagged salmon; each fish survives the run upstream with probability ${pct(p)}, independently of the others.`,
    trials: 'salmon', success: 'survivors', fail: 'lost', one: 'fish',
  },
  {
    setup: (p) => `A web service handles requests one by one; each request independently succeeds (returns no error) with probability ${pct(p)}.`,
    trials: 'requests', success: 'successful requests', fail: 'errors', one: 'request',
  },
  {
    setup: (p) => `A striker scores on each penalty kick with probability ${pct(p)}; treat the kicks as independent attempts at the same rate.`,
    trials: 'penalty kicks', success: 'conversions', fail: 'misses', one: 'kick',
  },
];

function coinFractionT(id: string, lo: number, hi: number): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const sc = r.pick(coinScenarios);
      const p = r.range(lo, hi, 0.05);
      const n = r.pick([500, 1000, 2000]);
      // Usually ask about the complementary event ("not heads", "claim-free"),
      // which forces a 1 − p step instead of reading the stated rate straight off.
      // The sim tracks whatever rate it's handed, so feeding it `rate` (= 1 − p
      // here) keeps the answer honest — it genuinely converges to the asked value.
      const complement = r.chance(0.7);
      const rate = complement ? 1 - p : p;
      const noun = complement ? sc.fail : sc.success;

      if (r.chance(0.5)) {
        const cnt = Math.round(longRunFrequency(rate) * n);
        const step: LessonStep = {
          id,
          type: 'problem',
          title: 'Count the outcomes',
          body: `${sc.setup(p)} Consider a run of ${n} independent ${sc.trials}.`,
          simulation: 'coinFlip',
          simConfig: { flips: n, p: rate },
          question: `About how many of the ${n} ${sc.trials} are ${noun}? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(Math.max(1, cnt) * 0.12)),
          unit: 'count',
          feedback: {
            correct: complement
              ? `Right — ${pct(p)} are ${sc.success}, so ${pct(rate)} are ${sc.fail}: about ${cnt} of ${n}.`
              : `Right — ${pct(p)} of ${n} is about ${cnt}.`,
            incorrect: complement
              ? `Take the complement first: ${pct(p)} are ${sc.success}, so ${pct(rate)} are ${sc.fail} — and ${pct(rate)} × ${n} ≈ ${cnt}.`
              : `Multiply the rate by the count: ${pct(rate)} × ${n} ≈ ${cnt}.`,
          },
        };
        return withSlider(step, r, 0, n, Math.max(1, Math.round(n / 100)), `Drag to predict: about how many of the ${n} ${sc.trials} are ${noun}?`);
      }
      const step: LessonStep = {
        id,
        type: 'problem',
        title: 'Predict the long run',
        body: `${sc.setup(p)} You record the outcomes of ${n} independent ${sc.trials}.`,
        simulation: 'coinFlip',
        simConfig: { flips: n, p: rate },
        question: `What fraction of the ${n} ${sc.trials} are ${noun}? (decimal)`,
        answer: longRunFrequency(rate),
        tolerance: 0.05,
        unit: 'fraction',
        feedback: {
          correct: complement
            ? `Exactly — ${pct(p)} are ${sc.success}, so the remaining ${f2(rate)} are ${sc.fail} over the long run.`
            : `Exactly — the fraction settles near ${f2(rate)} over many ${sc.trials}.`,
          incorrect: complement
            ? `${pct(p)} are ${sc.success}, so the rest are ${sc.fail}: 1 − ${f2(p)} = ${f2(rate)}.`
            : `Each ${sc.one} is independent with probability ${f2(rate)}, so the long-run fraction is ${f2(rate)}.`,
        },
      };
      return withSlider(step, r, 0, 1, 0.01, `Drag the slider to the fraction of ${sc.trials} that are ${noun}.`);
    },
  };
}

/**
 * Gambler's-fallacy scenarios are restricted to genuinely memoryless devices
 * (coins, spinners, roulette, slots) so the "streak doesn't matter" point is
 * honest. The answer is still longRunFrequency(p): independence means the next
 * trial ignores the streak.
 */
interface GamblerScenario {
  setup: (p: number) => string;
  one: string;
  many: string;
  outcome: string;
}

const gamblerScenarios: GamblerScenario[] = [
  { setup: (p) => `A coin is weighted to land heads with probability ${pct(p)} on every independent toss.`, one: 'toss', many: 'tosses', outcome: 'heads' },
  { setup: (p) => `A carnival spinner stops on red with probability ${pct(p)} on each spin, with no memory of earlier spins.`, one: 'spin', many: 'spins', outcome: 'red' },
  { setup: (p) => `A roulette-style wheel drops the ball into a red pocket with probability ${pct(p)} on each independent spin.`, one: 'spin', many: 'spins', outcome: 'red' },
  { setup: (p) => `A slot machine pays its small jackpot with probability ${pct(p)} on each pull, every pull independent of the last.`, one: 'pull', many: 'pulls', outcome: 'a jackpot' },
  { setup: (p) => `An electronic dice game flashes a winning symbol with probability ${pct(p)} on each play, independently each time.`, one: 'play', many: 'plays', outcome: 'a win' },
  { setup: (p) => `A lottery ball machine shows your colour with probability ${pct(p)} on each independent draw.`, one: 'draw', many: 'draws', outcome: 'your colour' },
];

function coinGamblerT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const sc = r.pick(gamblerScenarios);
      const p = r.range(0.3, 0.7, 0.05);
      const k = r.int(3, 6);
      // The complementary phrasing ("is NOT X") still hinges on independence — the
      // streak is irrelevant — but adds a 1 − p step. The sim verifies whichever
      // event we ask about, so it runs at `rate`.
      const complement = r.chance(0.7);
      const rate = complement ? 1 - p : p;
      return {
        id,
        type: 'problem',
        title: 'The gambler’s trap',
        body: `${sc.setup(p)} By a quirk of chance, the last ${k} ${sc.many} in a row all came up ${sc.outcome}.`,
        simulation: 'coinFlip',
        simConfig: { flips: 1000, p: rate },
        question: complement
          ? `What is the probability the very next ${sc.one} is NOT ${sc.outcome}? (decimal)`
          : `What is the probability the very next ${sc.one} also comes up ${sc.outcome}? (decimal)`,
        answer: longRunFrequency(rate),
        tolerance: 0.05,
        unit: 'probability',
        feedback: {
          correct: complement
            ? `Right — the streak is irrelevant: each ${sc.one} is ${f2(p)} to be ${sc.outcome}, so 1 − ${f2(p)} = ${f2(rate)} to be otherwise.`
            : `Right — independence means past streaks don’t matter. It stays ${f2(p)}.`,
          incorrect: complement
            ? `The ${sc.many} are independent, so the streak changes nothing: ${pct(p)} come up ${sc.outcome}, leaving 1 − ${f2(p)} = ${f2(rate)} that do not.`
            : `The ${sc.many} are independent: a streak doesn’t change the next one. It is still ${f2(p)}.`,
        },
      };
    },
  };
}

/* ============================ Dice (l2) ============================ */

// The dice sim is hard-wired to two fair six-sided dice (sums 2..12), so every
// scenario must genuinely be "two fair d6, summed" — only the framing varies.
interface DiceContext {
  intro: string;
}
const diceContexts: DiceContext[] = [
  { intro: 'A classic board game moves your token forward by the total of two fair six-sided dice. Some squares get landed on far more often than others, purely because of how the two dice combine.' },
  { intro: 'In backgammon every turn opens by throwing two fair six-sided dice and reading their sum. Veterans feel which totals show up most without ever counting.' },
  { intro: 'At the craps table the shooter throws two fair six-sided dice and the come-out total decides the round. The pit boss has watched these sums fall thousands of times.' },
  { intro: 'A settlers-style strategy game tags each hex with a number, and you harvest resources when the total of two fair six-sided dice matches it. The dreaded seven sends the robber instead.' },
  { intro: 'A tabletop RPG resolves a move by dropping two fair six-sided dice down a dice tower and adding the faces. The game master cares only about the total.' },
  { intro: 'A statistics class hands every student two fair six-sided dice and asks them to add the faces. Pooling everyone’s rolls reveals a striking pattern in the totals.' },
  { intro: 'A casino pit uses two precisely machined fair six-sided dice, and players bet on the total of the pair. Over a long night the totals trace out a familiar silhouette.' },
];

function diceSumT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const ctx = r.pick(diceContexts);
      const sum = r.pick(pool);
      if (r.chance(0.5)) {
        const rolls = 2000;
        const cnt = Math.round(dice[sum] * rolls);
        return {
          id,
          type: 'problem',
          title: `Counting ${sum}s`,
          body: `${ctx.intro} The pair is thrown ${rolls} times and every total is tallied.`,
          simulation: 'diceRoll',
          simConfig: { rolls },
          question: `About how many of the ${rolls} rolls land on a total of ${sum}? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${ways(sum)}/36 of ${rolls} ≈ ${cnt}.`,
            incorrect: `Expected count = (${ways(sum)}/36) × ${rolls} ≈ ${cnt}.`,
          },
        };
      }
      const step: LessonStep = {
        id,
        type: 'problem',
        title: `A sum of ${sum}`,
        body: ctx.intro,
        simulation: 'diceRoll',
        simConfig: { rolls: 2000 },
        question: `What is the probability the two dice show a total of ${sum}? (decimal)`,
        answer: dice[sum],
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: `Right — ${ways(sum)} of 36 outcomes make ${sum}, so ${f3(dice[sum])}.`,
          incorrect: `Count the ways to roll ${sum}: ${ways(sum)} of 36 outcomes, i.e. ${f3(dice[sum])}.`,
        },
      };
      return withSlider(step, r, 0, 0.3, 0.005, `Drag to the probability of a total of ${sum}.`);
    },
  };
}

const diceDrawT: ProblemTemplate = {
  id: 'l2-s5',
  build: (r) => {
    const ctx = r.pick(diceContexts);
    return {
      id: 'l2-s5',
      type: 'problem',
      title: 'Sketch the sum distribution',
      body: `${ctx.intro} Across the 36 equally likely outcomes, some totals have far more combinations than others.`,
      simulation: 'diceRoll',
      simConfig: { rolls: 2000 },
      question: 'Sketch how often each sum from 2 to 12 should appear, then roll to compare.',
      interaction: 'draw',
      drawCategories: Array.from({ length: 11 }, (_, i) => i + 2),
      answerShape: Array.from({ length: 11 }, (_, i) => dice[i + 2]),
      tolerance: 0.18,
      unit: 'shape',
      feedback: {
        correct: 'Exactly — a symmetric triangle peaking at 7, tapering to the rare 2 and 12.',
        incorrect: 'The shape is a triangle: 7 is most likely (6 ways), falling to 2 and 12 (one way each).',
      },
    };
  },
};

const diceRankT: ProblemTemplate = {
  id: 'l2-s6',
  build: (r) => {
    const ctx = r.pick(diceContexts);
    const distances = [0, 1, 2, 3, 4, 5];
    for (let i = distances.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [distances[i], distances[j]] = [distances[j], distances[i]];
    }
    const sums = distances.slice(0, 4).map((d) => 7 - d);
    return {
      id: 'l2-s6',
      type: 'problem',
      title: 'Rank the sums',
      body: `${ctx.intro} It comes down to how many of the 36 outcomes produce each total.`,
      simulation: 'diceRoll',
      simConfig: { rolls: 2000 },
      question: 'Rank these four sums from most to least likely, then roll to check.',
      interaction: 'order',
      orderItems: sums,
      answerOrder: sumsByLikelihood(sums),
      unit: 'order',
      feedback: {
        correct: 'Exactly — more combinations means higher probability, and counts peak at 7.',
        incorrect: 'Count the ways to make each sum; that count is the ranking, most to least likely.',
      },
    };
  },
};

/* ============================ Galton (l3) ============================ */

// The board is symmetric (each peg a fair 50/50 bounce), so galtonCenterFraction
// and binomialPmf(·, ·, 0.5) are the matching answers. Only the physical framing
// varies; every context is a genuine fair left/right bouncer with `rows` rows.
interface GaltonContext {
  intro: (rows: number) => string;
  ball: string;
  balls: string;
  binOne: string;
  bins: string;
}
const galtonContexts: GaltonContext[] = [
  {
    intro: (rows) => `Francis Galton’s original “bean machine” drops a bead through ${rows} staggered rows of pins; at each pin it caroms left or right with equal chance.`,
    ball: 'bead', balls: 'beads', binOne: 'slot', bins: 'slots',
  },
  {
    intro: (rows) => `On a Plinko board a chip tumbles down ${rows} rows of pegs, kicking left or right with a fair 50–50 bounce at each peg.`,
    ball: 'chip', balls: 'chips', binOne: 'bin', bins: 'bins',
  },
  {
    intro: (rows) => `A pachinko-style board sends a steel ball past ${rows} rows of brass pins, each pin deflecting it left or right with equal probability.`,
    ball: 'ball', balls: 'balls', binOne: 'channel', bins: 'channels',
  },
  {
    intro: (rows) => `A science-museum exhibit lets visitors pour marbles through ${rows} rows of pegs, where every peg is a fair coin flip between left and right.`,
    ball: 'marble', balls: 'marbles', binOne: 'bin', bins: 'bins',
  },
  {
    intro: (rows) => `A pollen grain jostled by water takes ${rows} tiny left-or-right hops, each direction equally likely, before settling into a row of collection channels.`,
    ball: 'grain', balls: 'grains', binOne: 'channel', bins: 'channels',
  },
  {
    intro: (rows) => `Raindrops strike the ridge of a notched roof and, at each of ${rows} notches, run left or right with equal chance before spilling into the gutters below.`,
    ball: 'raindrop', balls: 'raindrops', binOne: 'gutter', bins: 'gutters',
  },
  {
    intro: (rows) => `A wooden pin-drop toy guides each disc through ${rows} rows of pins, with a fair left/right bounce at every pin.`,
    ball: 'disc', balls: 'discs', binOne: 'bin', bins: 'bins',
  },
];

function galtonCenterT(id: string, centerBins: number, rowsPool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const ctx = r.pick(galtonContexts);
      const rows = r.pick(rowsPool);
      const frac = galtonCenterFraction(rows, centerBins);
      if (r.chance(0.5)) {
        const balls = 1000;
        const cnt = Math.round(frac * balls);
        return {
          id,
          type: 'problem',
          title: centerBins <= 2 ? 'Counting the center' : 'The crowded middle',
          body: `${ctx.intro(rows)} You release ${balls} ${ctx.balls} into the ${rows + 1} ${ctx.bins}.`,
          simulation: 'galtonBoard',
          simConfig: { rows, balls },
          question: `About how many of the ${balls} ${ctx.balls} land in the central ${centerBins} ${ctx.bins}? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${f2(frac)} of ${balls} ≈ ${cnt} ${ctx.balls}.`,
            incorrect: `Expected count = ${f2(frac)} × ${balls} ≈ ${cnt}.`,
          },
        };
      }
      return {
        id,
        type: 'problem',
        title: centerBins <= 2 ? 'Where do they pile up?' : 'The wider middle',
        body: `${ctx.intro(rows)} The ${ctx.balls} pile up across ${rows + 1} ${ctx.bins}.`,
        simulation: 'galtonBoard',
        simConfig: { rows, balls: 1000 },
        question: `What fraction of the ${ctx.balls} land in the central ${centerBins} ${ctx.bins}? (decimal)`,
        answer: frac,
        tolerance: 0.05,
        unit: 'fraction',
        feedback: {
          correct: `Right — the binomial puts about ${f2(frac)} of the ${ctx.balls} in the middle ${centerBins} ${ctx.bins}.`,
          incorrect: `Add the central ${centerBins} binomial probabilities for ${rows} rows: about ${f2(frac)}.`,
        },
      };
    },
  };
}

function galtonEdgeT(id: string, rowsPool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const ctx = r.pick(galtonContexts);
      const rows = r.pick(rowsPool);
      const ans = binomialPmf(rows, 0, 0.5) + binomialPmf(rows, rows, 0.5);
      return {
        id,
        type: 'problem',
        title: 'The lonely edges',
        body: `${ctx.intro(rows)} A ${ctx.ball} reaches an outer ${ctx.binOne} only by bouncing the same way at all ${rows} rows.`,
        simulation: 'galtonBoard',
        simConfig: { rows, balls: 1000 },
        question: `What fraction of ${ctx.balls} land in the two outermost ${ctx.bins} combined? (decimal)`,
        answer: ans,
        tolerance: 0.02,
        unit: 'fraction',
        feedback: {
          correct: `Right — each edge needs all ${rows} bounces one way: 2 × (1/2)^${rows} ≈ ${f3(ans)}.`,
          incorrect: `Each outer ${ctx.binOne} has probability (1/2)^${rows}; two edges give ≈ ${f3(ans)}.`,
        },
      };
    },
  };
}

const galtonDrawT: ProblemTemplate = {
  id: 'l3-s6',
  build: (r) => {
    const ctx = r.pick(galtonContexts);
    const rows = r.pick([10, 12, 14]);
    return {
      id: 'l3-s6',
      type: 'problem',
      title: 'Sketch the bell curve',
      body: `${ctx.intro(rows)} Before releasing the ${ctx.balls}, predict the whole shape across the ${rows + 1} ${ctx.bins}.`,
      simulation: 'galtonBoard',
      simConfig: { rows, balls: 1000 },
      question: `Drag to sketch the distribution across the ${rows + 1} ${ctx.bins}, then release the ${ctx.balls} to compare.`,
      interaction: 'draw',
      drawCategories: Array.from({ length: rows + 1 }, (_, k) => k),
      answerShape: Array.from({ length: rows + 1 }, (_, k) => binomialPmf(rows, k, 0.5)),
      tolerance: 0.18,
      unit: 'shape',
      feedback: {
        correct: 'Beautiful — a tall, symmetric bell, tallest in the middle and vanishing at the edges.',
        incorrect: 'The true shape is a symmetric bell: tallest in the center, near zero at the edges.',
      },
    };
  },
};

/* ============================ Expected value (l5) ============================ */

// Payout wheels carry non-negative values so the sim's running-average bar reads
// cleanly; the answer is always expectedValue(segs). Variety comes from the payout
// structure and the framing (raffle, loot box, insurance payout, claw machine…).
function randomWheel(r: Rng): { segs: WheelSegment[]; desc: string } {
  const kind = r.int(0, 3);
  if (kind === 0) {
    // One prize or nothing.
    const v = r.pick([5, 10, 20, 50, 100]);
    const p = r.range(0.1, 0.6, 0.1);
    return { segs: [{ value: v, p }, { value: 0, p: 1 - p }], desc: `${money(v)} with probability ${f1(p)}, and nothing otherwise` };
  }
  if (kind === 1) {
    // Three-way split with a common "nothing".
    const probs = r.pick([
      [0.5, 0.3, 0.2],
      [0.6, 0.3, 0.1],
      [0.7, 0.2, 0.1],
      [0.4, 0.4, 0.2],
    ]);
    const v1 = r.pick([2, 5, 10]);
    const v2 = r.pick([20, 50]);
    const segs = [{ value: 0, p: probs[0] }, { value: v1, p: probs[1] }, { value: v2, p: probs[2] }];
    return { segs, desc: `nothing ${pct(probs[0])} of the time, ${money(v1)} ${pct(probs[1])}, and ${money(v2)} ${pct(probs[2])}` };
  }
  if (kind === 2) {
    // Two real prizes, no zero — a "tiered" payout.
    const probs = r.pick([
      [0.5, 0.5],
      [0.7, 0.3],
      [0.8, 0.2],
    ]);
    const v1 = r.pick([1, 2, 5]);
    const v2 = r.pick([10, 20, 25]);
    const segs = [{ value: v1, p: probs[0] }, { value: v2, p: probs[1] }];
    return { segs, desc: `${money(v1)} ${pct(probs[0])} of the time and ${money(v2)} the rest of the time` };
  }
  // Likely small win plus a rare big prize.
  const big = r.pick([50, 100, 200]);
  const small = r.pick([2, 5]);
  const pBig = r.range(0.05, 0.2, 0.05);
  const pSmall = r.range(0.3, 0.5, 0.1);
  const pNothing = Math.round((1 - pBig - pSmall) * 100) / 100;
  const segs = [{ value: 0, p: pNothing }, { value: small, p: pSmall }, { value: big, p: pBig }];
  return { segs, desc: `nothing ${pct(pNothing)} of the time, a ${money(small)} consolation ${pct(pSmall)}, and a ${money(big)} jackpot ${pct(pBig)}` };
}

interface EvContext {
  play: string;
  setup: (desc: string) => string;
}
const evContexts: EvContext[] = [
  { play: 'spin', setup: (d) => `A carnival wheel of fortune pays ${d}. A barker waves you over to spin, and you want to know what a single spin is worth on average.` },
  { play: 'ticket', setup: (d) => `A charity raffle ticket pays ${d}. Before buying a stack, you work out the average payout per ticket.` },
  { play: 'card', setup: (d) => `A scratch-off card pays ${d}. The fine print is enough to compute the average prize per card.` },
  { play: 'box', setup: (d) => `A video-game loot box awards ${d}. Players want to know the average value hidden in each box.` },
  { play: 'pull', setup: (d) => `A claw-machine promotion pays ${d} on each attempt, win or lose. You estimate the average payout per pull.` },
  { play: 'round', setup: (d) => `A booth game pays ${d}. You weigh the average return on a single round before committing your tokens.` },
  { play: 'policy', setup: (d) => `A micro-insurance plan pays out ${d} in a covered month. The insurer needs the average payout per policy to set a premium.` },
  { play: 'spin', setup: (d) => `A vending-machine promotion dispenses a bonus that pays ${d}. Management wants the average bonus per play.` },
];

function evWheelT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const { segs, desc } = randomWheel(r);
      const ctx = r.pick(evContexts);
      const ev = expectedValue(segs);
      return {
        id,
        type: 'problem',
        title: 'Weigh the payouts',
        body: ctx.setup(desc),
        simulation: 'expectedValue',
        simConfig: wheelConfig(segs),
        question: `What is the expected payout of a single ${ctx.play}? (dollars)`,
        answer: ev,
        tolerance: Math.max(0.3, Math.round(ev * 10) / 100),
        unit: 'dollars',
        feedback: {
          correct: `Right — weight each payout by its chance and add: ${money(ev)}.`,
          incorrect: `Multiply each payout by its probability and sum them: ${money(ev)}.`,
        },
      };
    },
  };
}

const evGames = [
  { label: 'Coin game: $2 half the time, else $0', segs: [{ value: 2, p: 0.5 }, { value: 0, p: 0.5 }] },
  { label: 'Raffle: $50 with chance 0.05, else $0', segs: [{ value: 50, p: 0.05 }, { value: 0, p: 0.95 }] },
  { label: 'Prize wheel: $5 (40%), $10 (20%), else $0', segs: [{ value: 5, p: 0.4 }, { value: 10, p: 0.2 }, { value: 0, p: 0.4 }] },
  { label: 'Scratch card: $20 (30%), else $0', segs: [{ value: 20, p: 0.3 }, { value: 0, p: 0.7 }] },
  { label: 'Jackpot pull: $40 (20%), else $0', segs: [{ value: 40, p: 0.2 }, { value: 0, p: 0.8 }] },
  { label: 'Lottery: $100 (10%), else $0', segs: [{ value: 100, p: 0.1 }, { value: 0, p: 0.9 }] },
  { label: 'Loot box: $5 (60%), $30 (10%), else $0', segs: [{ value: 5, p: 0.6 }, { value: 30, p: 0.1 }, { value: 0, p: 0.3 }] },
  { label: 'Claw machine: $2 (50%), $25 (10%), else $0', segs: [{ value: 2, p: 0.5 }, { value: 25, p: 0.1 }, { value: 0, p: 0.4 }] },
  { label: 'Insurance payout: $200 (3%), else $0', segs: [{ value: 200, p: 0.03 }, { value: 0, p: 0.97 }] },
];

const evRankT: ProblemTemplate = {
  id: 'l5-s6',
  build: (r) => {
    const pool = evGames.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, 4);
    const labels: Record<number, string> = {};
    chosen.forEach((g, i) => (labels[i] = g.label));
    return {
      id: 'l5-s6',
      type: 'problem',
      title: 'Rank the games by value',
      body: 'Four games, four payout structures. Expected value — each payout times its chance, summed — says which is worth the most per play.',
      simulation: 'expectedValue',
      simConfig: wheelConfig(chosen[0].segs),
      question: 'Rank these games from highest to lowest expected payout.',
      interaction: 'order',
      orderItems: [0, 1, 2, 3],
      orderLabels: labels,
      answerOrder: rankBy([0, 1, 2, 3], (i) => expectedValue(chosen[i].segs)),
      unit: 'order',
      feedback: {
        correct: 'Right — rank by expected value: payout × chance, summed for each game.',
        incorrect: 'Compute each game’s expected value (payout × chance, summed) and order them.',
      },
    };
  },
};

// Drag segment probabilities to make the wheel's expected payout fair (= the price).
const fairThings = ['carnival ticket', 'arcade token', 'raffle ticket', 'booth play'];
function makeFairT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const thing = r.pick(fairThings);
      const price = r.pick([4, 5, 6, 8]);
      const payouts = r.pick([
        [0, 5, 20],
        [0, 10, 25],
        [0, 2, 10, 50],
      ]);
      return {
        id,
        type: 'problem',
        title: 'Make the game fair',
        body: `A ${thing} costs $${price}. The wheel pays one of these prizes — and you get to set how likely each one is.`,
        question: `Drag the dividers so the wheel's expected payout equals the $${price} ${thing} price.`,
        interaction: 'wheel',
        wheelPayouts: payouts,
        answer: price,
        tolerance: 0.4,
        unit: 'dollars',
        feedback: {
          correct: `Fair! Your settings give an expected payout right at the $${price} price.`,
          incorrect: `Not fair yet — shift the chances until payout × probability sums to $${price}.`,
        },
      };
    },
  };
}

/* ============================ Conditional (l6) ============================ */

// The conditional sim deals from a standard 52-card deck and highlights aces
// (metrics 0/1/2/4) or face cards (metric 3). Scenarios re-frame the same deck
// draws; the answers stay drawProbability / drawMatchesNoReplacement with the
// exact card counts the sim uses.
const condIntros = [
  'A blackjack dealer cracks a fresh single deck, shuffles, and squares the 52 cards.',
  'At poker night you take a brand-new deck of 52, shuffle it well, and start dealing.',
  'A magician fans a standard 52-card deck for the audience to confirm it is ordinary, then squares it up.',
  'In a probability lab each student gets a full 52-card deck, shuffles, and draws from the top.',
  'A card-counting instructor runs the drill on a single, freshly shuffled 52-card deck.',
  'A casino pit boss watches a dealer work through one well-shuffled 52-card deck.',
];

function cardFirstT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const intro = r.pick(condIntros);
      const c = r.pick([
        { name: 'an ace', count: 4, metric: 0, scale: 0.15 },
        { name: 'a face card (J, Q, or K)', count: 12, metric: 3, scale: 0.4 },
      ]);
      const ans = drawProbability(c.count, 52);
      return {
        id,
        type: 'problem',
        title: 'The first card',
        body: `${intro} You turn over the very top card.`,
        simulation: 'conditional',
        simConfig: { metric: c.metric, scaleMax: c.scale, trials: 6000 },
        question: `What is the probability it is ${c.name}? (decimal)`,
        answer: ans,
        tolerance: 0.03,
        unit: 'probability',
        feedback: {
          correct: `Right — ${c.count} of 52 cards qualify: ${f3(ans)}.`,
          incorrect: `There are ${c.count} of those in 52 cards: ${c.count}/52 = ${f3(ans)}.`,
        },
      };
    },
  };
}

function cardCondT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const intro = r.pick(condIntros);
      const ans = drawProbability(3, 51);
      return {
        id,
        type: 'problem',
        title: 'Given the first was an ace',
        body: `${intro} The top card is an ace, and you set it aside — 51 cards remain, 3 of them aces.`,
        simulation: 'conditional',
        simConfig: { metric: 2, scaleMax: 0.15, trials: 8000 },
        question: 'What is the probability the next card is also an ace? (decimal)',
        answer: ans,
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: `Yes — 3 aces remain among 51 cards: ${f3(ans)}.`,
          incorrect: `After removing one ace, 3 remain in 51: 3/51 = ${f3(ans)}.`,
        },
      };
    },
  };
}

function cardBothT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const intro = r.pick(condIntros);
      const ans = drawMatchesNoReplacement(4, 52, 2);
      return {
        id,
        type: 'problem',
        title: 'Both at once',
        body: `${intro} You deal the top two cards and hope for a pair of aces.`,
        simulation: 'conditional',
        simConfig: { metric: 1, scaleMax: 0.02, trials: 8000 },
        question: 'What is the probability both cards are aces? (decimal)',
        answer: ans,
        tolerance: 0.004,
        unit: 'probability',
        feedback: {
          correct: `Exactly — (4/52)(3/51) ≈ ${f3(ans)}.`,
          incorrect: `Chain the draws: (4/52)(3/51) ≈ ${f3(ans)}.`,
        },
      };
    },
  };
}

function cardCondNotT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const intro = r.pick(condIntros);
      const ans = drawProbability(4, 51);
      return {
        id,
        type: 'problem',
        title: 'When the first is not an ace',
        body: `${intro} The top card is not an ace, and you set it aside — 51 cards remain, all four aces still among them.`,
        simulation: 'conditional',
        simConfig: { metric: 4, scaleMax: 0.15, trials: 8000 },
        question: 'What is the probability the next card is an ace? (decimal)',
        answer: ans,
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: `Yes — all 4 aces remain among 51 cards: ${f3(ans)}.`,
          incorrect: `No ace was removed, so 4 aces remain in 51: 4/51 = ${f3(ans)}.`,
        },
      };
    },
  };
}

const condRankT: ProblemTemplate = {
  id: 'l6-s6',
  build: (r) => ({
    id: 'l6-s6',
    type: 'problem',
    title: 'Rank the events',
    body: `${r.pick(condIntros)} Conditioning reshapes the odds: removing a card changes what is left.`,
    simulation: 'conditional',
    simConfig: { metric: 3, scaleMax: 0.4, trials: 6000 },
    question: 'Rank these four events from most to least likely.',
    interaction: 'order',
    orderItems: [0, 1, 2, 3],
    orderLabels: {
      0: 'An ace on the first draw',
      1: 'An ace next, given the first card was an ace',
      2: 'An ace next, given the first card was not an ace',
      3: 'A face card on the first draw',
    },
    answerOrder: rankBy(
      [0, 1, 2, 3],
      (i) => [drawProbability(4, 52), drawProbability(3, 51), drawProbability(4, 51), drawProbability(12, 52)][i],
    ),
    unit: 'order',
    feedback: {
      correct: 'Right — face card .231 > ace-given-non-ace .078 > ace .077 > ace-given-ace .059.',
      incorrect: 'Compare the fractions: 12/52, then 4/51, then 4/52, then 3/51.',
    },
  }),
};

/* ============================ Monty Hall (l7) ============================ */

// The sim plays a true n-door Monty game (host opens all-but-one losing option,
// then you switch or stay), so the answer is montyHallSwitchWin(doors) for switch
// and 1/doors for stay. Containers, prize, and host vary; mechanic is fixed.
interface MontyContext {
  game: string;
  host: string;
  door: string;
  doors: string;
  aCar: string;
  empty: string;
  goats: string;
}
const montyContexts: MontyContext[] = [
  { game: 'TV game show', host: 'the host', door: 'door', doors: 'doors', aCar: 'a new car', empty: 'a goat', goats: 'goats' },
  { game: 'street shell game', host: 'a hustler', door: 'shell', doors: 'shells', aCar: 'a pearl', empty: 'nothing', goats: 'empty shells' },
  { game: 'cups-and-ball routine', host: 'a magician', door: 'cup', doors: 'cups', aCar: 'a ball', empty: 'nothing', goats: 'empty cups' },
  { game: 'prize-box game', host: 'the emcee', door: 'box', doors: 'boxes', aCar: 'the grand prize', empty: 'a joke gift', goats: 'joke gifts' },
  { game: 'locker challenge', host: 'the host', door: 'locker', doors: 'lockers', aCar: 'a set of car keys', empty: 'a dud', goats: 'duds' },
  { game: 'treasure-hunt game', host: 'the guide', door: 'chest', doors: 'chests', aCar: 'the gold', empty: 'sand', goats: 'chests of sand' },
  { game: 'briefcase game', host: 'a knowing host', door: 'briefcase', doors: 'briefcases', aCar: 'the cash prize', empty: 'a single penny', goats: 'pennies' },
];

function montyT(id: string, kind: 'stay' | 'switch', pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const ctx = r.pick(montyContexts);
      const doors = r.pick(pool);
      const ans = kind === 'switch' ? montyHallSwitchWin(doors) : 1 / doors;
      const useSwitch = kind === 'switch';
      if (r.chance(0.5)) {
        const trials = 1500;
        const cnt = Math.round(ans * trials);
        return {
          id,
          type: 'problem',
          title: useSwitch ? 'Counting switch wins' : 'Counting stay wins',
          body: `You play ${trials} rounds of a ${ctx.game}. Each round ${ctx.aCar} hides behind one of ${doors} ${ctx.doors}; you pick one, ${ctx.host} opens ${doors - 2} of the others to reveal ${ctx.goats}, and you always ${useSwitch ? 'switch' : 'stay'}.`,
          simulation: 'montyHall',
          simConfig: { doors, strategy: useSwitch ? 1 : 0, trials },
          question: `About how many of the ${trials} games do you win? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(8, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${f2(ans)} × ${trials} ≈ ${cnt} wins.`,
            incorrect: `Expected wins = ${f2(ans)} × ${trials} ≈ ${cnt}.`,
          },
        };
      }
      return {
        id,
        type: 'problem',
        title: useSwitch ? 'Always switching' : 'Sticking with your pick',
        body: `In a ${ctx.game}, ${ctx.host} hides ${ctx.aCar} behind one of ${doors} ${ctx.doors} and ${ctx.empty} behind each of the others. You pick a ${ctx.door}; then ${ctx.host}, who knows the layout, opens ${doors - 2} of the other ${ctx.doors} to reveal ${ctx.goats}, leaving yours and one more. You ${useSwitch ? 'switch to the other unopened ' + ctx.door : 'keep your original ' + ctx.door}.`,
        simulation: 'montyHall',
        simConfig: { doors, strategy: useSwitch ? 1 : 0, trials: 1500 },
        question: `What fraction of games do you win by ${useSwitch ? 'switching' : 'staying'}? (decimal)`,
        answer: ans,
        tolerance: useSwitch ? 0.05 : 0.03,
        unit: 'fraction',
        feedback: {
          correct: useSwitch
            ? `Yes — switching wins whenever your first pick was wrong: ${doors - 1}/${doors} = ${f2(ans)}.`
            : `Right — staying wins only if your 1-in-${doors} first pick was right: ${f2(ans)}.`,
          incorrect: useSwitch
            ? `Switching wins when the first pick was wrong: (${doors}-1)/${doors} = ${f2(ans)}.`
            : `Staying wins only on a correct first pick: 1/${doors} = ${f2(ans)}.`,
        },
      };
    },
  };
}

const montyRankT: ProblemTemplate = {
  id: 'l7-s6',
  build: (r) => {
    const ctx = r.pick(montyContexts);
    const all = [3, 5, 10, 50, 100];
    for (let i = all.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }
    const doors = all.slice(0, 3).sort((a, b) => a - b);
    const labels: Record<number, string> = {};
    doors.forEach((d) => (labels[d] = `${d} ${ctx.doors}`));
    return {
      id: 'l7-s6',
      type: 'problem',
      title: 'Rank the switch advantage',
      body: `In a ${ctx.game}, switching wins whenever your first pick was wrong — and that gets more likely as ${ctx.doors} are added.`,
      simulation: 'montyHall',
      simConfig: { doors: doors[1], strategy: 1, trials: 1500 },
      question: 'Rank these games by your win chance if you always switch, highest first.',
      interaction: 'order',
      orderItems: doors,
      orderLabels: labels,
      answerOrder: rankBy(doors, (d) => montyHallSwitchWin(d)),
      unit: 'order',
      feedback: {
        correct: 'Right — switching wins (n−1)/n, which grows with the number of options.',
        incorrect: 'Switching wins (n−1)/n, so more options means a bigger edge.',
      },
    };
  },
};

/* ============================ Random walk (l8) ============================ */

// Each step is +1 with probability p, else −1: drift = n(2p−1), typical distance
// = randomWalkRMS(n, p). Fair contexts (p = 0.5) and biased contexts (p ≠ 0.5)
// share the same engine; the sim is configured with the matching p.
interface WalkContext {
  intro: (n: number) => string;
  steps: string;
  unit: string;
  home: string;
}
const fairWalkContexts: WalkContext[] = [
  { intro: (n) => `A reveler leaves the pub and staggers for ${n} paces; each pace is equally likely to carry them one square left or right along the street.`, steps: 'paces', unit: 'squares', home: 'the pub door' },
  { intro: (n) => `A dye molecule in still water is knocked one notch left or right at each of ${n} random jostles, both directions equally likely.`, steps: 'jostles', unit: 'notches', home: 'its starting notch' },
  { intro: (n) => `A tipsy ant on a tightrope lurches one millimetre forward or back at each of ${n} steps, each direction a fair coin flip.`, steps: 'steps', unit: 'millimetres', home: 'the center' },
  { intro: (n) => `A board-game token starts on the center square; over ${n} turns a fair coin nudges it one square up or down the track each turn.`, steps: 'turns', unit: 'squares', home: 'the center square' },
  { intro: (n) => `A gambler stakes $1 on a fair coin for ${n} rounds, winning a dollar on heads and losing one on tails.`, steps: 'rounds', unit: 'dollars', home: 'breaking even' },
  { intro: (n) => `A toy stock ticks up or down by one cent each minute for ${n} minutes, every move a fair 50–50 coin flip.`, steps: 'minutes', unit: 'cents', home: 'its opening price' },
];

interface BiasedWalkContext {
  intro: (n: number, p: number) => string;
  steps: string;
  unit: string;
  pos: string;
}
const biasedWalkContexts: BiasedWalkContext[] = [
  { intro: (n, p) => `A gambler bets $1 a round, but the game is tilted: each round pays +$1 with probability ${pct(p)} and −$1 otherwise, over ${n} rounds.`, steps: 'rounds', unit: 'dollars', pos: 'fortune' },
  { intro: (n, p) => `A trending stock ticks +1 cent with probability ${pct(p)} and −1 cent otherwise, each minute, over ${n} minutes.`, steps: 'minutes', unit: 'cents', pos: 'price change' },
  { intro: (n, p) => `A molecular motor steps forward with probability ${pct(p)} and back otherwise, taking ${n} steps along its track.`, steps: 'steps', unit: 'sites', pos: 'net displacement' },
  { intro: (n, p) => `A foraging bird drifts one cell per move over ${n} moves, heading downwind (+1) with probability ${pct(p)} and upwind (−1) otherwise.`, steps: 'moves', unit: 'cells', pos: 'net drift' },
];

function walkRmsT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const ctx = r.pick(fairWalkContexts);
      const n = r.pick(pool);
      const ans = randomWalkRMS(n, 0.5);
      const step: LessonStep = {
        id,
        type: 'problem',
        title: 'How far from home?',
        body: `${ctx.intro(n)} On average it ends up back where it began — but it still strays.`,
        simulation: 'randomWalk',
        simConfig: { steps: n, p: 0.5 },
        question: `About how far from ${ctx.home} does a typical path end after ${n} ${ctx.steps}? (in ${ctx.unit})`,
        answer: ans,
        tolerance: Math.max(1, ans * 0.12),
        unit: 'distance',
        feedback: {
          correct: `Exactly — typical distance is √${n} = ${f1(ans)} ${ctx.unit}.`,
          incorrect: `Typical distance is the standard deviation √n = √${n} = ${f1(ans)}.`,
        },
      };
      return withSlider(step, r, 0, 40, 0.5, `Drag to the typical distance after ${n} ${ctx.steps}.`);
    },
  };
}

const walkDriftFairT: ProblemTemplate = {
  id: 'l8-s2',
  build: (r) => {
    const ctx = r.pick(fairWalkContexts);
    const n = r.pick([64, 100, 256, 400]);
    return {
      id: 'l8-s2',
      type: 'problem',
      title: 'Where does it end up?',
      body: `${ctx.intro(n)} Every step is a fair 50–50, so there is no lean in either direction.`,
      simulation: 'randomWalk',
      simConfig: { steps: n, p: 0.5 },
      question: `On average, where does the path end after ${n} ${ctx.steps}? (position in ${ctx.unit} from ${ctx.home})`,
      answer: randomWalkDrift(n, 0.5),
      tolerance: 1,
      unit: 'position',
      feedback: {
        correct: 'Right — a fair walk has zero drift, so the cloud of endings centers on 0.',
        incorrect: `Each step averages 0, so by linearity the expected position is ${n} × 0 = 0.`,
      },
    };
  },
};

const walkDriftBiasT: ProblemTemplate = {
  id: 'l8-s5',
  build: (r) => {
    const ctx = r.pick(biasedWalkContexts);
    const p = r.range(0.55, 0.7, 0.05);
    const n = r.pick([50, 100, 200]);
    const ans = randomWalkDrift(n, p);
    return {
      id: 'l8-s5',
      type: 'problem',
      title: 'A walk with a lean',
      body: ctx.intro(n, p),
      simulation: 'randomWalk',
      simConfig: { steps: n, p },
      question: `On average, what is the net ${ctx.pos} after ${n} ${ctx.steps}? (in ${ctx.unit}, + or −)`,
      answer: ans,
      tolerance: Math.max(2, Math.abs(ans) * 0.1),
      unit: 'position',
      feedback: {
        correct: `Right — each step averages 2(${f2(p)}) − 1 = ${f2(2 * p - 1)}, so ${n} steps drift to about ${f1(ans)}.`,
        incorrect: `Average step = 2p − 1 = ${f2(2 * p - 1)}. Over ${n} steps the drift is ${f1(ans)}.`,
      },
    };
  },
};

const walkDrawT: ProblemTemplate = {
  id: 'l8-s6',
  build: (r) => {
    const p = r.pick([0.5, 0.6]);
    const n = 100;
    const d = randomWalkEndDistribution(n, p);
    const fair = r.pick(fairWalkContexts);
    const biased = r.pick(biasedWalkContexts);
    return {
      id: 'l8-s6',
      type: 'problem',
      title: 'Sketch where they land',
      body: p === 0.5 ? `${fair.intro(n)} Many such paths spread out around the start.` : biased.intro(n, p),
      simulation: 'randomWalk',
      simConfig: { steps: n, p },
      question: 'Sketch the distribution of final positions, then run the walks to compare.',
      interaction: 'draw',
      drawCategories: d.categories,
      answerShape: d.shape,
      tolerance: 0.2,
      unit: 'shape',
      feedback: {
        correct: `Exactly — a bell centered on the drift ${f0(randomWalkDrift(n, p))} with spread ≈ ${f1(randomWalkRMS(n, p))}.`,
        incorrect: `The bell centers on the drift ${f0(randomWalkDrift(n, p))}, with spread ≈ ${f1(randomWalkRMS(n, p))}.`,
      },
    };
  },
};

/* ============================ CLT (l9) ============================ */

// The CLT sim's verify parent is the fair die (μ = 3.5, σ = √(35/12) ≈ 1.71), so
// answers stay dieMean() and standardError(dieSD(), m). Variety is in the framing
// (each scenario genuinely averages m fair-die rolls) and in m.
const cltContexts: ((m: number) => string)[] = [
  (m) => `A board-game designer rolls a fair six-sided die ${m} times and writes down the average pips, then repeats the whole experiment thousands of times.`,
  (m) => `In a stats class, many groups each roll a fair die ${m} times and report their group’s average roll.`,
  (m) => `A casino auditor samples ${m} fair-die rolls at a time and records the mean, again and again, to chart how averages behave.`,
  (m) => `A game studio stress-tests a dice mechanic by averaging ${m} fair-die rolls per trial across thousands of trials.`,
  (m) => `A teacher simulates ${m} fair-die rolls per student and collects every student’s average.`,
  (m) => `A tabletop RPG resolves an action by averaging ${m} fair-die rolls; the table repeats this across thousands of encounters.`,
  (m) => `A dice-fairness study computes the mean of ${m} rolls per run, logging the result over thousands of runs.`,
];

const cltCenterT: ProblemTemplate = {
  id: 'l9-s2',
  build: (r) => {
    const m = r.pick([8, 10, 12, 20]);
    const step: LessonStep = {
      id: 'l9-s2',
      type: 'problem',
      title: 'Center of the bell',
      body: `${r.pick(cltContexts)(m)} The averages pile into a distribution of their own.`,
      simulation: 'clt',
      simConfig: { parent: 0, m, samples: 600 },
      question: 'Where is this distribution of sample means centered? (a value from 1 to 6)',
      answer: dieMean(),
      tolerance: 0.2,
      unit: 'value',
      feedback: {
        correct: 'Right — averaging is unbiased, so the bell centers on the die’s mean, 3.5, for any sample size.',
        incorrect: 'The sample mean shares the die’s mean: (1+2+3+4+5+6)/6 = 3.5.',
      },
    };
    return withSlider(step, r, 1, 6, 0.1, 'Drag the marker to where the bell of averages is centered.');
  },
};

function cltSeT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const m = r.pick(pool);
      const ans = standardError(dieSD(), m);
      const step: LessonStep = {
        id,
        type: 'problem',
        title: `Samples of ${m}`,
        body: `${r.pick(cltContexts)(m)} A single fair die has standard deviation about 1.71.`,
        simulation: 'clt',
        simConfig: { parent: 0, m, samples: 600 },
        question: `What is the standard error (the SD of the sample mean) for samples of ${m}? (decimal)`,
        answer: ans,
        tolerance: Math.max(0.04, ans * 0.12),
        unit: 'standard error',
        feedback: {
          correct: `Exactly — 1.71 / √${m} ≈ ${f2(ans)}. Larger samples give a narrower bell.`,
          incorrect: `Standard error = σ/√m = 1.71/√${m} ≈ ${f2(ans)}.`,
        },
      };
      return withSlider(step, r, 0, 2, 0.02, `Drag to the standard error for samples of ${m}.`);
    },
  };
}

const cltDrawT: ProblemTemplate = {
  id: 'l9-s6',
  build: (r) => {
    const m = r.pick([6, 10, 16]);
    const d = diceSampleMeanDistribution(m);
    return {
      id: 'l9-s6',
      type: 'problem',
      title: 'Sketch the bell of averages',
      body: `${r.pick(cltContexts)(m)} A flat die turns into a bell.`,
      simulation: 'clt',
      simConfig: { parent: 0, m, samples: 600 },
      question: `Sketch the distribution of the sample mean (averages of ${m} rolls), then run it to compare.`,
      interaction: 'draw',
      drawCategories: d.categories,
      answerShape: d.shape,
      tolerance: 0.18,
      unit: 'shape',
      feedback: {
        correct: `Beautiful — a bell centered on 3.5 (SE ≈ ${f2(standardError(dieSD(), m))}). The CLT in action.`,
        incorrect: `The averages pile into a bell centered on 3.5, SE ≈ ${f2(standardError(dieSD(), m))} — not flat.`,
      },
    };
  },
};

/* ============================ Registry ============================ */

const problemTemplates: Record<string, ProblemTemplate[]> = {
  'l1-coin-flip': [
    coinFractionT('l1-s2', 0.4, 0.6),
    coinFractionT('l1-s3', 0.2, 0.8),
    coinGamblerT('l1-s4'),
    coinFractionT('l1-s5', 0.1, 0.3),
    coinFractionT('l1-s6', 0.7, 0.9),
  ],
  'l2-dice-roll': [
    diceSumT('l2-s2', [6, 7, 8]),
    diceSumT('l2-s3', [5, 9, 6, 8]),
    diceSumT('l2-s4', [2, 3, 11, 12]),
    diceDrawT,
    diceRankT,
  ],
  'l3-galton-board': [
    galtonCenterT('l3-s2', 2, [10, 12, 14, 16]),
    galtonEdgeT('l3-s3', [8, 10, 12]),
    galtonEdgeT('l3-s4', [10, 12, 14]),
    galtonCenterT('l3-s5', 4, [12, 14, 16]),
    galtonDrawT,
  ],
  'l5-expected-value': [evWheelT('l5-s2'), evWheelT('l5-s3'), evWheelT('l5-s4'), makeFairT('l5-s5'), evRankT],
  'l6-conditional': [
    cardFirstT('l6-s2'),
    cardCondT('l6-s3'),
    cardBothT('l6-s4'),
    cardCondNotT('l6-s5'),
    condRankT,
  ],
  'l7-monty-hall': [
    montyT('l7-s2', 'stay', [3, 4, 5]),
    montyT('l7-s3', 'switch', [3, 4, 5]),
    montyT('l7-s4', 'switch', [10, 20, 50, 100]),
    montyT('l7-s5', 'stay', [10, 50, 100]),
    montyRankT,
  ],
  'l9-clt': [cltCenterT, cltSeT('l9-s3', [9, 16, 25]), cltSeT('l9-s4', [36, 40, 64]), cltSeT('l9-s5', [4, 9]), cltDrawT],
  'l8-random-walk': [
    walkDriftFairT,
    walkRmsT('l8-s3', [64, 100, 256, 400]),
    walkRmsT('l8-s4', [16, 25, 36]),
    walkDriftBiasT,
    walkDrawT,
  ],
  // The Final Test: one varying question per slot, spanning every lesson. Only
  // numeric/slider generators are used (the test never runs a sim, since a sim
  // would reveal the answer). Each retake advances `attempt`, re-rolling the set.
  'lf-final-test': [
    coinFractionT('lf-s1', 0.35, 0.65),
    diceSumT('lf-s2', [5, 6, 7, 8, 9]),
    galtonCenterT('lf-s3', 3, [12, 14]),
    evWheelT('lf-s4'),
    cardFirstT('lf-s5'),
    montyT('lf-s6', 'switch', [3, 5, 10]),
    cltSeT('lf-s7', [9, 16, 25]),
    walkRmsT('lf-s8', [64, 100, 256]),
    cardBothT('lf-s9'),
    coinGamblerT('lf-s10'),
  ],
};

/**
 * Build the concrete problem for a slot from the attempt's seed. Concept steps
 * and slots without a template fall back to the static step from `lessons.ts`.
 */
export function generateProblem(
  lessonId: string,
  base: LessonStep,
  seed: number,
  attempt = 0,
  retry = 0,
): LessonStep {
  if (base.type !== 'problem') return base;
  // `cycle` advances on each retry (second try) and each lesson replay, so the
  // pulled problem changes rather than repeating.
  const cycle = attempt * 2 + retry;
  const seedFor = (seed ^ hashString(base.id) ^ Math.imul(cycle + 1, 0x9e3779b1)) >>> 0;
  // Prefer a generated-bank variant for this slot when one exists, so generated problems
  // replace the hand-written question bank slot-by-slot (keeping per-retry/replay
  // variation). Slots without bank entries fall back to the templates below, then static.
  const bank = generatedBySlot[base.id];
  if (bank?.length) {
    const g = bank[makeRng(seedFor).int(0, bank.length - 1)];
    return { ...g.step, id: base.id };
  }
  const variants = problemTemplates[lessonId]?.filter((x) => x.id === base.id);
  if (!variants?.length) return base;
  const t = variants[cycle % variants.length];
  return t.build(makeRng(seedFor));
}
