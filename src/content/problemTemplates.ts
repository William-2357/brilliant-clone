/**
 * Parameterized problem pools. Each lesson maps to one template per problem slot
 * (ids match the static problems in `lessons.ts`). At play time the lesson player
 * builds a concrete problem from a template + the attempt's seed, so the numbers
 * and objects vary between playthroughs while the answer is always recomputed from
 * `probability.ts`. The static problems in `lessons.ts` remain the fallback.
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
} from '../lib/probability';
import { wheelConfig } from './simData';

export interface ProblemTemplate {
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

/* ============================ Coin flip (l1) ============================ */

interface CoinScenario {
  setup: (p: number) => string;
  trials: string;
  success: string;
  one: string;
}
const coinScenarios: CoinScenario[] = [
  { setup: (p) => `A trick coin is weighted to land heads ${pct(p)} of the time.`, trials: 'flips', success: 'heads', one: 'flip' },
  { setup: (p) => `A basketball player sinks ${pct(p)} of her free throws.`, trials: 'attempts', success: 'made shots', one: 'attempt' },
  { setup: (p) => `A factory line passes ${pct(p)} of parts through inspection.`, trials: 'parts', success: 'good parts', one: 'part' },
  { setup: (p) => `A spinner lands on red ${pct(p)} of the time.`, trials: 'spins', success: 'reds', one: 'spin' },
  { setup: (p) => `In one city it rains on ${pct(p)} of days.`, trials: 'days', success: 'rainy days', one: 'day' },
];

function coinFractionT(id: string, lo: number, hi: number, fixedScenario?: number): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const sc = fixedScenario != null ? coinScenarios[fixedScenario] : r.pick(coinScenarios);
      const p = r.range(lo, hi, 0.05);
      const n = r.pick([500, 1000, 2000]);
      if (r.chance(0.5)) {
        const cnt = Math.round(p * n);
        return {
          id,
          type: 'problem',
          title: 'Count the successes',
          body: `${sc.setup(p)} You run ${n} independent ${sc.trials}.`,
          simulation: 'coinFlip',
          simConfig: { flips: n, p },
          question: `About how many of the ${n} ${sc.trials} are ${sc.success}? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${pct(p)} of ${n} is about ${cnt}.`,
            incorrect: `Multiply the rate by the count: ${pct(p)} × ${n} ≈ ${cnt}.`,
          },
        };
      }
      return {
        id,
        type: 'problem',
        title: 'Predict the long run',
        body: `${sc.setup(p)} You watch it over ${n} independent ${sc.trials}.`,
        simulation: 'coinFlip',
        simConfig: { flips: n, p },
        question: `What fraction of the ${n} ${sc.trials} are ${sc.success}? (decimal)`,
        answer: longRunFrequency(p),
        tolerance: 0.05,
        unit: 'fraction',
        feedback: {
          correct: `Exactly — the fraction settles on ${f2(p)} over many ${sc.trials}.`,
          incorrect: `Each ${sc.one} is independent with probability ${f2(p)}, so the long-run fraction is ${f2(p)}.`,
        },
      };
    },
  };
}

function coinGamblerT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const sc = r.pick(coinScenarios);
      const p = r.range(0.3, 0.7, 0.05);
      const k = r.int(3, 6);
      return {
        id,
        type: 'problem',
        title: 'The gambler’s trap',
        body: `${sc.setup(p)} By chance, the last ${k} ${sc.trials} were all ${sc.success}.`,
        simulation: 'coinFlip',
        simConfig: { flips: 1000, p },
        question: `What is the probability the very next ${sc.one} is also ${sc.success.replace(/s$/, '')}? (decimal)`,
        answer: longRunFrequency(p),
        tolerance: 0.05,
        unit: 'probability',
        feedback: {
          correct: `Right — independence means past streaks don’t matter. It stays ${f2(p)}.`,
          incorrect: `The ${sc.trials} are independent: a streak doesn’t change the next one. It is still ${f2(p)}.`,
        },
      };
    },
  };
}

/* ============================ Dice (l2) ============================ */

function diceSumT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const sum = r.pick(pool);
      if (r.chance(0.5)) {
        const rolls = 2000;
        const cnt = Math.round(dice[sum] * rolls);
        return {
          id,
          type: 'problem',
          title: `Counting ${sum}s`,
          body: `You roll two fair dice ${rolls} times and tally the sums.`,
          simulation: 'diceRoll',
          simConfig: { rolls },
          question: `About how many of the ${rolls} rolls sum to ${sum}? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${ways(sum)}/36 of ${rolls} ≈ ${cnt}.`,
            incorrect: `Expected count = (${ways(sum)}/36) × ${rolls} ≈ ${cnt}.`,
          },
        };
      }
      return {
        id,
        type: 'problem',
        title: `A sum of ${sum}`,
        body: 'You roll two fair six-sided dice and add the faces.',
        simulation: 'diceRoll',
        simConfig: { rolls: 2000 },
        question: `What is the probability the two dice sum to ${sum}? (decimal)`,
        answer: dice[sum],
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: `Right — ${ways(sum)} of 36 outcomes make ${sum}, so ${f3(dice[sum])}.`,
          incorrect: `Count the ways to roll ${sum}: ${ways(sum)} of 36 outcomes, i.e. ${f3(dice[sum])}.`,
        },
      };
    },
  };
}

const diceDrawT: ProblemTemplate = {
  id: 'l2-s5',
  build: () => ({
    id: 'l2-s5',
    type: 'problem',
    title: 'Sketch the sum distribution',
    body: 'Across the 36 equally likely outcomes, some sums have far more combinations than others.',
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
  }),
};

const diceRankT: ProblemTemplate = {
  id: 'l2-s6',
  build: (r) => {
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
      body: 'Not every sum is equally likely — it comes down to how many of the 36 outcomes produce each one.',
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

function galtonCenterT(id: string, centerBins: number, rowsPool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const rows = r.pick(rowsPool);
      const frac = galtonCenterFraction(rows, centerBins);
      if (r.chance(0.5)) {
        const balls = 1000;
        const cnt = Math.round(frac * balls);
        return {
          id,
          type: 'problem',
          title: centerBins <= 2 ? 'Counting the center' : 'The crowded middle',
          body: `A ${rows}-row Galton board drops ${balls} balls into ${rows + 1} bins.`,
          simulation: 'galtonBoard',
          simConfig: { rows, balls },
          question: `About how many of the ${balls} balls land in the central ${centerBins} bins? (a whole number)`,
          answer: cnt,
          tolerance: Math.max(5, Math.round(cnt * 0.12)),
          unit: 'count',
          feedback: {
            correct: `Right — ${f2(frac)} of ${balls} ≈ ${cnt} balls.`,
            incorrect: `Expected count = ${f2(frac)} × ${balls} ≈ ${cnt}.`,
          },
        };
      }
      return {
        id,
        type: 'problem',
        title: centerBins <= 2 ? 'Where do the balls pile up?' : 'The wider middle',
        body: `A Galton board with ${rows} rows of pegs drops balls into ${rows + 1} bins.`,
        simulation: 'galtonBoard',
        simConfig: { rows, balls: 1000 },
        question: `What fraction of balls land in the central ${centerBins} bins? (decimal)`,
        answer: frac,
        tolerance: 0.05,
        unit: 'fraction',
        feedback: {
          correct: `Right — the binomial puts about ${f2(frac)} of the balls in the middle ${centerBins} bins.`,
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
      const rows = r.pick(rowsPool);
      const ans = binomialPmf(rows, 0, 0.5) + binomialPmf(rows, rows, 0.5);
      return {
        id,
        type: 'problem',
        title: 'The lonely edges',
        body: `On a ${rows}-row board, a ball reaches an outer bin only by bouncing the same way every time.`,
        simulation: 'galtonBoard',
        simConfig: { rows, balls: 1000 },
        question: `What fraction of balls land in the two outermost bins combined? (decimal)`,
        answer: ans,
        tolerance: 0.02,
        unit: 'fraction',
        feedback: {
          correct: `Right — each edge needs all ${rows} bounces one way: 2 × (1/2)^${rows} ≈ ${f3(ans)}.`,
          incorrect: `Each outer bin has probability (1/2)^${rows}; two edges give ≈ ${f3(ans)}.`,
        },
      };
    },
  };
}

const galtonDrawT: ProblemTemplate = {
  id: 'l3-s6',
  build: (r) => {
    const rows = r.pick([10, 12, 14]);
    return {
      id: 'l3-s6',
      type: 'problem',
      title: 'Sketch the bell curve',
      body: `Before dropping the balls, predict the whole shape across the ${rows + 1} bins of a ${rows}-row board.`,
      simulation: 'galtonBoard',
      simConfig: { rows, balls: 1000 },
      question: `Drag to sketch the distribution across the ${rows + 1} bins, then drop the balls to compare.`,
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

function randomWheel(r: Rng): { segs: WheelSegment[]; desc: string } {
  if (r.chance(0.55)) {
    const v = r.pick([5, 10, 20, 50, 100]);
    const p = r.range(0.1, 0.6, 0.1);
    return { segs: [{ value: v, p }, { value: 0, p: 1 - p }], desc: `${money(v)} with probability ${f1(p)}, otherwise nothing` };
  }
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

function evWheelT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const { segs, desc } = randomWheel(r);
      const ev = expectedValue(segs);
      return {
        id,
        type: 'problem',
        title: 'A prize wheel',
        body: `A game pays ${desc}.`,
        simulation: 'expectedValue',
        simConfig: wheelConfig(segs),
        question: 'What is the expected payout of a single play? (dollars)',
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
  { label: 'Wheel: $5 (40%), $10 (20%), else $0', segs: [{ value: 5, p: 0.4 }, { value: 10, p: 0.2 }, { value: 0, p: 0.4 }] },
  { label: 'Scratch card: $20 (30%), else $0', segs: [{ value: 20, p: 0.3 }, { value: 0, p: 0.7 }] },
  { label: 'Jackpot: $40 (20%), else $0', segs: [{ value: 40, p: 0.2 }, { value: 0, p: 0.8 }] },
  { label: 'Lottery: $100 (10%), else $0', segs: [{ value: 100, p: 0.1 }, { value: 0, p: 0.9 }] },
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

/* ============================ Conditional (l6) ============================ */

// The conditional sim highlights aces (metrics 0/1/2/4) or face cards (metric 3),
// so questions vary across ace/face to keep the sim a faithful answer key.
function cardFirstT(id: string): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const c = r.pick([
        { name: 'an ace', count: 4, metric: 0, scale: 0.15 },
        { name: 'a face card (J, Q, or K)', count: 12, metric: 3, scale: 0.4 },
      ]);
      const ans = c.count / 52;
      return {
        id,
        type: 'problem',
        title: 'The first card',
        body: 'You draw one card from a freshly shuffled 52-card deck.',
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
    build: () => ({
      id,
      type: 'problem',
      title: 'Given the first was an ace',
      body: 'Your first card was an ace and you set it aside. Now 51 cards remain, 3 of them aces.',
      simulation: 'conditional',
      simConfig: { metric: 2, scaleMax: 0.15, trials: 8000 },
      question: 'What is the probability the next card is also an ace? (decimal)',
      answer: 3 / 51,
      tolerance: 0.02,
      unit: 'probability',
      feedback: {
        correct: `Yes — 3 aces remain among 51 cards: ${f3(3 / 51)}.`,
        incorrect: `After removing one ace, 3 remain in 51: 3/51 = ${f3(3 / 51)}.`,
      },
    }),
  };
}

function cardBothT(id: string): ProblemTemplate {
  return {
    id,
    build: () => ({
      id,
      type: 'problem',
      title: 'Both at once',
      body: 'You draw two cards from a full deck: an ace first, then an ace again.',
      simulation: 'conditional',
      simConfig: { metric: 1, scaleMax: 0.02, trials: 8000 },
      question: 'What is the probability both cards are aces? (decimal)',
      answer: (4 / 52) * (3 / 51),
      tolerance: 0.004,
      unit: 'probability',
      feedback: {
        correct: `Exactly — (4/52)(3/51) ≈ ${f3((4 / 52) * (3 / 51))}.`,
        incorrect: `Chain the draws: (4/52)(3/51) ≈ ${f3((4 / 52) * (3 / 51))}.`,
      },
    }),
  };
}

function cardCondNotT(id: string): ProblemTemplate {
  return {
    id,
    build: () => ({
      id,
      type: 'problem',
      title: 'When the first is not an ace',
      body: 'The first card you draw is not an ace and you set it aside. Now 51 cards remain, all 4 aces still in the deck.',
      simulation: 'conditional',
      simConfig: { metric: 4, scaleMax: 0.15, trials: 8000 },
      question: 'What is the probability the next card is an ace? (decimal)',
      answer: 4 / 51,
      tolerance: 0.02,
      unit: 'probability',
      feedback: {
        correct: `Yes — all 4 aces remain among 51 cards: ${f3(4 / 51)}.`,
        incorrect: `No ace was removed, so 4 aces remain in 51: 4/51 = ${f3(4 / 51)}.`,
      },
    }),
  };
}

const condRankT: ProblemTemplate = {
  id: 'l6-s6',
  build: () => ({
    id: 'l6-s6',
    type: 'problem',
    title: 'Rank the events',
    body: 'Conditioning reshapes the odds: removing a card changes what is left.',
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
    answerOrder: rankBy([0, 1, 2, 3], (i) => [4 / 52, 3 / 51, 4 / 51, 12 / 52][i]),
    unit: 'order',
    feedback: {
      correct: 'Right — face card .231 > ace-given-non-ace .078 > ace .077 > ace-given-ace .059.',
      incorrect: 'Compare the fractions: 12/52, then 4/51, then 4/52, then 3/51.',
    },
  }),
};

/* ============================ Monty Hall (l7) ============================ */

function montyT(id: string, kind: 'stay' | 'switch', pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const doors = r.pick(pool);
      const ans = kind === 'switch' ? montyHallSwitchWin(doors) : 1 / doors;
      if (r.chance(0.5)) {
        const trials = 1500;
        const cnt = Math.round(ans * trials);
        return {
          id,
          type: 'problem',
          title: kind === 'switch' ? 'Counting switch wins' : 'Counting stay wins',
          body: `You play ${trials} games with ${doors} doors, always ${kind === 'switch' ? 'switching' : 'staying'} after the host reveals ${doors - 2} goats.`,
          simulation: 'montyHall',
          simConfig: { doors, strategy: kind === 'switch' ? 1 : 0, trials },
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
        title: kind === 'switch' ? 'Always switching' : 'Sticking with your door',
        body: `With ${doors} doors, you pick one and the host opens ${doors - 2} goats, leaving yours and one other. You ${kind === 'switch' ? 'switch' : 'stay'}.`,
        simulation: 'montyHall',
        simConfig: { doors, strategy: kind === 'switch' ? 1 : 0, trials: 1500 },
        question: `What fraction of games do you win by ${kind === 'switch' ? 'switching' : 'staying'}? (decimal)`,
        answer: ans,
        tolerance: kind === 'switch' ? 0.05 : 0.03,
        unit: 'fraction',
        feedback: {
          correct:
            kind === 'switch'
              ? `Yes — switching wins whenever your first pick was wrong: ${doors - 1}/${doors} = ${f2(ans)}.`
              : `Right — staying wins only if your 1-in-${doors} first pick was the car: ${f2(ans)}.`,
          incorrect:
            kind === 'switch'
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
    const all = [3, 5, 10, 50, 100];
    for (let i = all.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [all[i], all[j]] = [all[j], all[i]];
    }
    const doors = all.slice(0, 3).sort((a, b) => a - b);
    const labels: Record<number, string> = {};
    doors.forEach((d) => (labels[d] = `${d} doors`));
    return {
      id: 'l7-s6',
      type: 'problem',
      title: 'Rank the switch advantage',
      body: 'Switching wins whenever your first pick was wrong — and that gets more likely as doors are added.',
      simulation: 'montyHall',
      simConfig: { doors: doors[1], strategy: 1, trials: 1500 },
      question: 'Rank these games by your win chance if you always switch, highest first.',
      interaction: 'order',
      orderItems: doors,
      orderLabels: labels,
      answerOrder: rankBy(doors, (d) => montyHallSwitchWin(d)),
      unit: 'order',
      feedback: {
        correct: 'Right — switching wins (n−1)/n, which grows with the number of doors.',
        incorrect: 'Switching wins (n−1)/n, so more doors means a bigger edge.',
      },
    };
  },
};

/* ============================ Random walk (l8) ============================ */

function walkRmsT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const n = r.pick(pool);
      const ans = randomWalkRMS(n, 0.5);
      return {
        id,
        type: 'problem',
        title: 'How far from home?',
        body: `A fair walk takes ${n} steps of +1 or −1, each equally likely. It drifts nowhere on average — but it strays.`,
        simulation: 'randomWalk',
        simConfig: { steps: n, p: 0.5 },
        question: `About how far from the start is a typical walk after ${n} steps? (number of steps)`,
        answer: ans,
        tolerance: Math.max(1, ans * 0.12),
        unit: 'distance',
        feedback: {
          correct: `Exactly — typical distance is √${n} = ${f1(ans)} steps.`,
          incorrect: `Typical distance is the standard deviation √n = √${n} = ${f1(ans)}.`,
        },
      };
    },
  };
}

const walkDriftFairT: ProblemTemplate = {
  id: 'l8-s2',
  build: (r) => {
    const n = r.pick([64, 100, 256, 400]);
    return {
      id: 'l8-s2',
      type: 'problem',
      title: 'Where does it end up?',
      body: `A fair walk takes ${n} steps of +1 or −1, each equally likely.`,
      simulation: 'randomWalk',
      simConfig: { steps: n, p: 0.5 },
      question: `On average, what is the final position after ${n} steps? (number of steps from the start)`,
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
    const p = r.range(0.55, 0.7, 0.05);
    const n = r.pick([50, 100, 200]);
    const ans = randomWalkDrift(n, p);
    return {
      id: 'l8-s5',
      type: 'problem',
      title: 'A walk with a lean',
      body: `Now each step is +1 with probability ${pct(p)} and −1 otherwise — a biased walk over ${n} steps.`,
      simulation: 'randomWalk',
      simConfig: { steps: n, p },
      question: `On average, what is the final position after ${n} biased steps? (number of steps)`,
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
    return {
      id: 'l8-s6',
      type: 'problem',
      title: 'Sketch where they land',
      body: p === 0.5 ? `A fair 100-step walk drifts nowhere but spreads out.` : `Each step leans +1 with probability ${pct(p)}, over 100 steps.`,
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

const cltCenterT: ProblemTemplate = {
  id: 'l9-s2',
  build: (r) => {
    const m = r.pick([8, 10, 12, 20]);
    return {
      id: 'l9-s2',
      type: 'problem',
      title: 'Center of the bell',
      body: `You average ${m} die rolls, then repeat thousands of times to build the distribution of sample means.`,
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
  },
};

function cltSeT(id: string, pool: number[]): ProblemTemplate {
  return {
    id,
    build: (r) => {
      const m = r.pick(pool);
      const ans = standardError(dieSD(), m);
      return {
        id,
        type: 'problem',
        title: `Samples of ${m}`,
        body: `The die’s standard deviation is about 1.71. Now you average ${m} rolls at a time.`,
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
      body: `Average ${m} die rolls and repeat thousands of times. A flat die turns into a bell.`,
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

export const problemTemplates: Record<string, ProblemTemplate[]> = {
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
  'l5-expected-value': [evWheelT('l5-s2'), evWheelT('l5-s3'), evWheelT('l5-s4'), evWheelT('l5-s5'), evRankT],
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
  const variants = problemTemplates[lessonId]?.filter((x) => x.id === base.id);
  if (!variants?.length) return base;
  // `cycle` advances on each retry (second try) and each lesson replay, so the
  // pulled problem changes rather than repeating.
  const cycle = attempt * 2 + retry;
  const t = variants[cycle % variants.length];
  return t.build(makeRng((seed ^ hashString(base.id) ^ Math.imul(cycle + 1, 0x9e3779b1)) >>> 0));
}
