import type { Lesson } from '../types/lesson';
import {
  reachTargetProbability,
  ruinProbability,
  markovStationary,
  extinctionProbability,
} from '../lib/probability';

/** Build sim config for an n-state transition matrix. */
function matCfg(M: number[][], targetState: number): Record<string, number> {
  const cfg: Record<string, number> = { states: M.length, targetState, trials: 4000 };
  M.forEach((row, i) => row.forEach((v, j) => (cfg[`t${i}${j}`] = v)));
  return cfg;
}

/** Build sim config for a branching offspring distribution. */
function offCfg(probs: number[]): Record<string, number> {
  const cfg: Record<string, number> = { maxOffspring: probs.length - 1, trials: 3000 };
  probs.forEach((p, i) => (cfg[`p${i}`] = p));
  return cfg;
}

const weather = [
  [0.8, 0.2],
  [0.5, 0.5],
];
const sticky = [
  [0.9, 0.1],
  [0.1, 0.9],
];
const m3 = [
  [0.5, 0.5, 0],
  [0.2, 0.5, 0.3],
  [0, 0.4, 0.6],
];

export const stochasticLessons: Lesson[] = [
  {
    id: 's7-gamblers-ruin',
    index: 0,
    title: 'Gambler’s Ruin',
    concept: 'Walks between two barriers',
    status: 'built',
    prerequisiteId: null,
    steps: [
      {
        id: 's7-gamblers-ruin-s1',
        type: 'concept',
        title: 'Reaching the goal before going broke',
        body: 'Start with some chips and bet $1 at a time until you either hit a target N or go broke at 0. Where you start, and any house edge, decides how often each ending happens.',
        simulation: 'randomWalk',
        simConfig: { steps: 80, p: 0.5 },
        lecture: [
          {
            heading: 'Reaching the target',
            text: 'For a fair game starting at $i$ with target $N$, the chance of reaching $N$ before $0$ is simply the fraction of the way there.',
            formula: 'P(\\text{reach } N) = \\frac{i}{N}',
          },
          {
            heading: 'A house edge',
            text: 'When each step is up with probability $p \\ne \\tfrac12$, the ratio $r = (1-p)/p$ enters and small edges compound badly over many bets.',
            formula: 'P(\\text{reach } N) = \\frac{1 - r^{i}}{1 - r^{N}}',
          },
          {
            heading: 'Common mistake',
            text: 'Even a fair game ends in ruin with high probability when your bankroll is small relative to the target.',
          },
        ],
      },
      {
        id: 's7-gamblers-ruin-s2',
        type: 'problem',
        title: 'Halfway there',
        body: 'A fair game: you start with $5 and aim for $10, betting $1 each round.',
        question: 'What is the probability you reach $10 before going broke? (decimal)',
        answer: reachTargetProbability(5, 10, 0.5),
        tolerance: 0.03,
        unit: 'probability',
        feedback: {
          correct: 'Right — for a fair game it is i/N = 5/10 = 0.5.',
          incorrect: 'Fair game: P(reach N) = i/N = 5/10 = 0.5.',
        },
      },
      {
        id: 's7-gamblers-ruin-s3',
        type: 'problem',
        title: 'A smaller stake',
        body: 'Fair game, but now you start with $3 aiming for $10.',
        question: 'What is the probability you reach $10? (decimal)',
        answer: reachTargetProbability(3, 10, 0.5),
        tolerance: 0.03,
        unit: 'probability',
        feedback: {
          correct: 'Right — 3/10 = 0.3.',
          incorrect: 'Fair game: i/N = 3/10 = 0.3.',
        },
      },
      {
        id: 's7-gamblers-ruin-s4',
        type: 'problem',
        title: 'Probability of ruin',
        body: 'Same fair game, starting at $3 aiming for $10.',
        question: 'What is the probability you go broke first? (decimal)',
        answer: ruinProbability(3, 10, 0.5),
        tolerance: 0.03,
        unit: 'probability',
        feedback: {
          correct: 'Right — ruin is 1 − 0.3 = 0.7. A small stake is usually lost.',
          incorrect: 'Ruin = 1 − P(reach N) = 1 − 0.3 = 0.7.',
        },
      },
      {
        id: 's7-gamblers-ruin-s5',
        type: 'problem',
        title: 'A house edge',
        body: 'Each $1 bet wins with probability 0.45. You start at $10 aiming for $20.',
        question: 'What is the probability you reach $20? (decimal)',
        answer: reachTargetProbability(10, 20, 0.45),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Right — only about 0.12. A 5% edge is devastating over many bets.',
          incorrect: 'With r = 0.55/0.45, P(reach 20) = (1 − r¹⁰)/(1 − r²⁰) ≈ 0.12.',
        },
      },
      {
        id: 's7-gamblers-ruin-s6',
        type: 'problem',
        title: 'A long shot',
        body: 'Fair game: you start with $1 aiming for $4.',
        question: 'What is the probability you reach $4? (decimal)',
        answer: reachTargetProbability(1, 4, 0.5),
        tolerance: 0.03,
        unit: 'probability',
        feedback: {
          correct: 'Right — 1/4 = 0.25.',
          incorrect: 'Fair game: i/N = 1/4 = 0.25.',
        },
      },
    ],
  },
  {
    id: 's7-markov',
    index: 0,
    title: 'Markov Chains',
    concept: 'Long-run state fractions',
    status: 'built',
    prerequisiteId: null,
    steps: [
      {
        id: 's7-markov-s1',
        type: 'concept',
        title: 'Where it settles',
        body: 'A Markov chain hops between states using only the current state. Over time the fraction of visits to each state settles into a stationary distribution. Walk the chain and watch it converge.',
        simulation: 'markov',
        simConfig: matCfg(weather, 0),
        lecture: [
          {
            heading: 'The Markov property',
            text: 'The next state depends only on the current one, not the path taken to reach it — the chain is memoryless.',
          },
          {
            heading: 'Stationary distribution',
            text: 'The long-run fraction of time in each state is the stationary distribution π, the vector unchanged by one more step.',
            formula: '\\pi P = \\pi',
          },
          {
            heading: 'Expected return time',
            text: 'A state visited a fraction π of the time is revisited on average every 1/π steps.',
            formula: 'E[\\text{return}] = 1/\\pi_i',
          },
        ],
      },
      {
        id: 's7-markov-s2',
        type: 'problem',
        title: 'Sunny days',
        body: 'Weather chain: a sunny day stays sunny with prob 0.8; a rainy day becomes sunny with prob 0.5.',
        simulation: 'markov',
        simConfig: matCfg(weather, 0),
        question: 'What long-run fraction of days are sunny? (decimal)',
        answer: markovStationary(weather)[0],
        tolerance: 0.04,
        unit: 'fraction',
        feedback: {
          correct: 'Right — π_sunny = 0.5/(0.2 + 0.5) ≈ 0.714.',
          incorrect: 'Stationary: π_sunny = b/(a+b) = 0.5/0.7 ≈ 0.714.',
        },
      },
      {
        id: 's7-markov-s3',
        type: 'problem',
        title: 'Rainy days',
        body: 'Same weather chain.',
        simulation: 'markov',
        simConfig: matCfg(weather, 1),
        question: 'What long-run fraction of days are rainy? (decimal)',
        answer: markovStationary(weather)[1],
        tolerance: 0.04,
        unit: 'fraction',
        feedback: {
          correct: 'Right — π_rainy ≈ 0.286, the complement of sunny.',
          incorrect: 'π_rainy = 0.2/0.7 ≈ 0.286.',
        },
      },
      {
        id: 's7-markov-s4',
        type: 'problem',
        title: 'A sticky chain',
        body: 'Now each state stays put with prob 0.9 and switches with prob 0.1 (symmetric).',
        simulation: 'markov',
        simConfig: matCfg(sticky, 0),
        question: 'What long-run fraction of time is spent in state 1? (decimal)',
        answer: markovStationary(sticky)[0],
        tolerance: 0.04,
        unit: 'fraction',
        feedback: {
          correct: 'Right — symmetry gives 0.5 each, however sticky the states are.',
          incorrect: 'Symmetric switching means π = 0.5 for each state.',
        },
      },
      {
        id: 's7-markov-s5',
        type: 'problem',
        title: 'Three states',
        body: 'A 3-state chain cycles with the transition probabilities shown in the diagram.',
        simulation: 'markov',
        simConfig: matCfg(m3, 1),
        question: 'What long-run fraction of time is spent in state 2? (decimal)',
        answer: markovStationary(m3)[1],
        tolerance: 0.05,
        unit: 'fraction',
        feedback: {
          correct: 'Right — solving πP = π gives state 2 the largest share, about 0.45.',
          incorrect: 'Solve πP = π (or watch the sim): state 2 ≈ 0.45.',
        },
      },
    ],
  },
  {
    id: 's7-branching',
    index: 0,
    title: 'Branching Processes',
    concept: 'Survival or extinction',
    status: 'built',
    prerequisiteId: null,
    steps: [
      {
        id: 's7-branching-s1',
        type: 'concept',
        title: 'Will the lineage survive?',
        body: 'Each individual leaves a random number of offspring. Whether a family name dies out hinges on the mean offspring m — and even above 1, extinction is possible. Run many lineages and watch the extinction fraction settle.',
        simulation: 'branching',
        simConfig: offCfg([0.25, 0.25, 0.5]),
        lecture: [
          {
            heading: 'The mean decides survival',
            text: 'If the mean offspring $m \\le 1$, the lineage dies out with certainty. Only $m > 1$ allows survival.',
            formula: 'm = \\sum_i i\\,p_i',
          },
          {
            heading: 'Extinction probability',
            text: 'The extinction probability is the smallest solution in $[0,1]$ of $q = G(q)$, where $G$ is the offspring generating function.',
            formula: 'q = \\sum_i p_i\\,q^{i}',
          },
          {
            heading: 'Common mistake',
            text: 'At exactly $m = 1$ (critical) the lineage still dies out with probability 1 — survival needs a strict surplus.',
          },
        ],
      },
      {
        id: 's7-branching-s2',
        type: 'problem',
        title: 'Too few offspring',
        body: 'Each individual has 0 children with prob 0.6 and 1 child with prob 0.4 (mean 0.4).',
        simulation: 'branching',
        simConfig: offCfg([0.6, 0.4]),
        question: 'What is the probability the lineage eventually dies out? (decimal)',
        answer: extinctionProbability([0.6, 0.4]),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Right — m = 0.4 < 1, so extinction is certain: 1.',
          incorrect: 'With mean below 1, extinction is certain (probability 1).',
        },
      },
      {
        id: 's7-branching-s3',
        type: 'problem',
        title: 'Room to grow',
        body: 'Offspring counts 0, 1, 2 have probabilities 0.25, 0.25, 0.5 (mean 1.25).',
        simulation: 'branching',
        simConfig: offCfg([0.25, 0.25, 0.5]),
        question: 'What is the extinction probability? (decimal)',
        answer: extinctionProbability([0.25, 0.25, 0.5]),
        tolerance: 0.05,
        unit: 'probability',
        feedback: {
          correct: 'Right — solving q = 0.25 + 0.25q + 0.5q² gives q = 0.5.',
          incorrect: 'Smallest root of q = 0.25 + 0.25q + 0.5q² is 0.5.',
        },
      },
      {
        id: 's7-branching-s4',
        type: 'problem',
        title: 'Right at the edge',
        body: 'Offspring 0 or 2, each with probability 0.5 (mean exactly 1).',
        simulation: 'branching',
        simConfig: offCfg([0.5, 0, 0.5]),
        question: 'What is the extinction probability? (decimal)',
        answer: extinctionProbability([0.5, 0, 0.5]),
        tolerance: 0.05,
        unit: 'probability',
        feedback: {
          correct: 'Right — at the critical mean m = 1, extinction is still certain: 1.',
          incorrect: 'Critical (m = 1) lineages die out with probability 1.',
        },
      },
      {
        id: 's7-branching-s5',
        type: 'problem',
        title: 'A clear surplus',
        body: 'Offspring 0 or 2, with probabilities 0.4 and 0.6 (mean 1.2).',
        simulation: 'branching',
        simConfig: offCfg([0.4, 0, 0.6]),
        question: 'What is the extinction probability? (decimal)',
        answer: extinctionProbability([0.4, 0, 0.6]),
        tolerance: 0.05,
        unit: 'probability',
        feedback: {
          correct: 'Right — solving q = 0.4 + 0.6q² gives q = 2/3 ≈ 0.667.',
          incorrect: 'Smallest root of q = 0.4 + 0.6q² is 2/3 ≈ 0.667.',
        },
      },
    ],
  },
];
