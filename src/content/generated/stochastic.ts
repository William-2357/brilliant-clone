import type { GeneratedProblem } from './index';

// --- Helpers mirroring the s7 lessons' simConfig shapes exactly ---------------
/** Markov sim config: { states, targetState, trials, t{i}{j} } (rows of M). */
function matCfg(M: number[][], targetState: number): Record<string, number> {
  const cfg: Record<string, number> = { states: M.length, targetState, trials: 4000 };
  M.forEach((row, i) => row.forEach((v, j) => (cfg[`t${i}${j}`] = v)));
  return cfg;
}
/** Flat kernel args for markovStationary: [n, ...rowMajorMatrix, which]. */
function matArgs(M: number[][], which: number): number[] {
  return [M.length, ...M.flat(), which];
}
/** Branching sim config: { maxOffspring, trials, p{i} } (offspring pmf). */
function offCfg(probs: number[]): Record<string, number> {
  const cfg: Record<string, number> = { maxOffspring: probs.length - 1, trials: 3000 };
  probs.forEach((p, i) => (cfg[`p${i}`] = p));
  return cfg;
}

// Markov chains (rows sum to 1; positive diagonals ⇒ ergodic, power iteration converges).
const mkUptime = [[0.9, 0.1], [0.6, 0.4]];
const mkMood = [[0.7, 0.3], [0.4, 0.6]];
const mkPages = [[0.6, 0.4], [0.3, 0.7]];
const mkCache = [[0.85, 0.15], [0.25, 0.75]];
const mkSwitch20 = [[0.8, 0.2], [0.2, 0.8]];
const mkSwitch15 = [[0.85, 0.15], [0.15, 0.85]];
const mk3a = [[0.6, 0.3, 0.1], [0.2, 0.5, 0.3], [0.1, 0.3, 0.6]];
const mk3b = [[0.5, 0.4, 0.1], [0.3, 0.4, 0.3], [0.2, 0.3, 0.5]];

// Branching offspring pmfs (each sums to 1).
const brSub1 = [0.7, 0.3]; // mean 0.3
const brSub2 = [0.5, 0.3, 0.2]; // mean 0.7
const brSup1 = [0.2, 0.3, 0.5]; // mean 1.3
const brSup2 = [0.3, 0.2, 0.5]; // mean 1.2
const brCrit1 = [0.4, 0.2, 0.4]; // mean 1.0
const brCrit2 = [0.3, 0.4, 0.3]; // mean 1.0
const brSurp1 = [0.3, 0, 0.7]; // mean 1.4
const brSurp2 = [0.35, 0, 0.65]; // mean 1.3

export const stochasticProblems: GeneratedProblem[] = [
  {
    step: {
      id: 'gen-s7-0001',
      type: 'problem',
      title: 'How far from home?',
      body: 'A token starts at 0 on a number line. Each of 100 steps moves it +1 or −1, each direction equally likely and independent of the rest. On average it returns to 0, but it usually drifts away.',
      question: 'About how far from the start (the standard deviation of the final position) does it typically end up after 100 steps? (a distance)',
      answer: 10,
      tolerance: 1,
      unit: 'distance',
      interaction: 'slider',
      sliderMin: 0,
      sliderMax: 40,
      sliderStep: 0.5,
      feedback: {
        correct: 'Right — for a fair ±1 walk the typical distance is √n = √100 = 10.',
        incorrect: 'The spread of a fair ±1 walk after n steps grows like √n.',
      },
    },
    sectionId: 's7-stochastic',
    kernel: 'randomWalkRMS',
    args: [100],
    tier: 'mc-chapter',
    difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 71, createdAt: '2026-06-25T15:12:00.000Z' },
  },

  // ---- l8-random-walk: randomWalk-sim-matched variants ----
  {
    step: {
      id: 'gen-l8s2-1', type: 'problem', title: 'Where does it end up?',
      body: 'A reveler leaves the pub and staggers for 100 paces; each pace is equally likely to carry them one square left or right, with no lean either way.',
      question: 'On average, where does the path end after 100 paces? (position in squares from the start)',
      answer: 0, tolerance: 1, unit: 'position', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 100, p: 0.5 },
      feedback: {
        correct: 'Right — a fair walk has zero drift, so the cloud of endings centers on 0.',
        incorrect: 'Each step averages 0, so by linearity the expected position is 100 × 0 = 0.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkDrift', args: [100, 0.5], slotId: 'l8-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 821, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s3-1', type: 'problem', title: 'How far from home?',
      body: 'A dye molecule in still water is knocked one notch left or right at each of 100 random jostles, both directions equally likely.',
      question: 'About how far from its start (the standard deviation) does a typical path end after 100 jostles? (in notches)',
      answer: 10, tolerance: 1, unit: 'distance', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 100, p: 0.5 },
      feedback: {
        correct: 'Exactly — typical distance is √100 = 10 notches.',
        incorrect: 'Typical distance is the standard deviation √n = √100 = 10.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkRMS', args: [100], slotId: 'l8-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 831, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s3-2', type: 'problem', title: 'A longer stagger',
      body: 'A tipsy ant on a tightrope lurches one millimetre forward or back at each of 256 steps, each direction a fair coin flip.',
      question: 'About how far from the center does a typical path end after 256 steps? (in millimetres)',
      answer: 16, tolerance: 1, unit: 'distance', interaction: 'slider',
      sliderMin: 0, sliderMax: 40, sliderStep: 0.5,
      simulation: 'randomWalk', simConfig: { steps: 256, p: 0.5 },
      feedback: {
        correct: 'Exactly — typical distance is √256 = 16.',
        incorrect: 'Typical distance is √n = √256 = 16.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkRMS', args: [256], slotId: 'l8-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 832, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s4-1', type: 'problem', title: 'Sixteen steps',
      body: 'A board-game token starts on the center square; over 16 turns a fair coin nudges it one square up or down the track each turn.',
      question: 'About how far from the center does a typical path end after 16 turns? (in squares)',
      answer: 4, tolerance: 1, unit: 'distance', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 16, p: 0.5 },
      feedback: {
        correct: 'Exactly — √16 = 4 squares.',
        incorrect: 'Typical distance is √n = √16 = 4.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkRMS', args: [16], slotId: 'l8-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 841, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s4-2', type: 'problem', title: 'Thirty-six steps',
      body: 'A toy stock ticks up or down by one cent each minute for 36 minutes, every move a fair 50–50 coin flip.',
      question: 'About how far from its opening price does it typically end after 36 minutes? (in cents)',
      answer: 6, tolerance: 1, unit: 'distance', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 36, p: 0.5 },
      feedback: {
        correct: 'Exactly — √36 = 6 cents.',
        incorrect: 'Typical distance is √n = √36 = 6.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkRMS', args: [36], slotId: 'l8-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 842, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s5-1', type: 'problem', title: 'A walk with a lean',
      body: 'A trending stock ticks +1 cent with probability 60% and −1 cent otherwise, each minute, over 100 minutes.',
      question: 'On average, what is the net price change after 100 minutes? (in cents, + or −)',
      answer: 19.999999999999996, tolerance: 2, unit: 'position', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 100, p: 0.6 },
      feedback: {
        correct: 'Right — each step averages 2(0.6) − 1 = 0.2, so 100 steps drift to about +20.',
        incorrect: 'Average step = 2p − 1 = 0.2. Over 100 steps the drift is about 20.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkDrift', args: [100, 0.6], slotId: 'l8-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 851, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s5-2', type: 'problem', title: 'A tilted game',
      body: 'A gambler bets $1 a round, but the game is tilted: each round pays +$1 with probability 55% and −$1 otherwise, over 50 rounds.',
      question: 'On average, what is the net fortune after 50 rounds? (in dollars, + or −)',
      answer: 5.000000000000004, tolerance: 2, unit: 'position', interaction: 'numeric',
      simulation: 'randomWalk', simConfig: { steps: 50, p: 0.55 },
      feedback: {
        correct: 'Right — each round averages 2(0.55) − 1 = 0.1, so 50 rounds drift to about +5.',
        incorrect: 'Average step = 2p − 1 = 0.1. Over 50 rounds the drift is about 5.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkDrift', args: [50, 0.55], slotId: 'l8-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 852, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l8s6-1', type: 'problem', title: 'Sketch where they land',
      body: 'Many fair 100-step walks (each step +1 or −1 with equal chance) spread out around the start.',
      question: 'Sketch the distribution of final positions, then run the walks to compare.',
      interaction: 'draw',
      drawCategories: [-28, -23, -17, -11, -6, 0, 6, 11, 17, 23, 28],
      answerShape: [0.00601648786268174, 0.022427478957808656, 0.03816134278311626, 0.11749549905974147, 0.1980759085379853, 0.2356465655973332, 0.1980759085379853, 0.11749549905974148, 0.03816134278311626, 0.022427478957808656, 0.0060164878626817395],
      tolerance: 0.2, unit: 'shape',
      simulation: 'randomWalk', simConfig: { steps: 100, p: 0.5 },
      feedback: {
        correct: 'Exactly — a bell centered on 0 with spread ≈ √100 = 10.',
        incorrect: 'The bell centers on the drift 0, with spread ≈ √100 = 10.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'randomWalkDrift', args: [], slotId: 'l8-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 861, createdAt: '2026-06-25T15:44:00.000Z' },
  },

  // ---- s7-gamblers-ruin: numeric reach/ruin variants (no sim, mirroring static) ----
  {
    step: {
      id: 'gen-gr2-1', type: 'problem', title: 'Halfway up',
      body: 'A fair $1 coin-flip game: you sit down with $7 and decide to cash out the moment you reach $14 — or stop when you go broke.',
      question: 'What is the probability you reach $14 before going broke? (decimal)',
      answer: 0.5, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — in a fair game the chance of reaching the target is just the fraction of the way there, i/N = 7/14.',
        incorrect: 'Fair game: P(reach N) = i/N = 7/14.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [7, 14, 0.5], slotId: 's7-gamblers-ruin-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9001, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr2-2', type: 'problem', title: 'Doubling toward the goal',
      body: 'A fair betting game pays ±$1 on a coin flip. You start with $20 and aim to grow your stack to $50.',
      question: 'What is the probability you reach $50 before busting? (decimal)',
      answer: 0.4, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — a fair game reaches the target with probability i/N = 20/50.',
        incorrect: 'Fair game: i/N = 20/50.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [20, 50, 0.5], slotId: 's7-gamblers-ruin-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9002, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr3-1', type: 'problem', title: 'A thin bankroll',
      body: 'A fair ±$1 game. You start with only $2 but aim for $10.',
      question: 'What is the probability you reach $10 before going broke? (decimal)',
      answer: 0.2, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — i/N = 2/10. A small stake rarely reaches a distant goal.',
        incorrect: 'Fair game: i/N = 2/10.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [2, 10, 0.5], slotId: 's7-gamblers-ruin-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9003, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr3-2', type: 'problem', title: 'Chasing a bigger pile',
      body: 'A fair coin-flip wager moves your bankroll ±$1 each round. You begin with $5, chasing a $20 cash-out.',
      question: 'What is the probability you reach $20 before busting? (decimal)',
      answer: 0.25, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — i/N = 5/20. The longer the climb, the lower the odds.',
        incorrect: 'Fair game: i/N = 5/20.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [5, 20, 0.5], slotId: 's7-gamblers-ruin-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9004, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr4-1', type: 'problem', title: 'Odds of going broke',
      body: 'A fair ±$1 game, starting at $4 with a $10 target.',
      question: 'What is the probability you go broke before reaching $10? (decimal)',
      answer: 0.6, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — ruin is 1 − i/N = 1 − 4/10. The shorter stack usually loses.',
        incorrect: 'Ruin = 1 − P(reach N) = 1 − 4/10.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'ruinProbability', args: [4, 10, 0.5], slotId: 's7-gamblers-ruin-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9005, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr4-2', type: 'problem', title: 'A tiny stake swallowed',
      body: 'A fair coin game pays ±$1. You sit down with $2, hoping to build up to $8.',
      question: 'What is the probability you bust before reaching $8? (decimal)',
      answer: 0.75, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — ruin = 1 − i/N = 1 − 2/8. A tiny stake is usually swallowed.',
        incorrect: 'Ruin = 1 − 2/8.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'ruinProbability', args: [2, 8, 0.5], slotId: 's7-gamblers-ruin-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9006, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr5-1', type: 'problem', title: 'A slight house edge',
      body: 'Each $1 bet wins with probability 0.48 — a slight house edge. You start at $10 aiming for $25.',
      question: 'What is the probability you reach $25 before going broke? (decimal)',
      answer: 0.19173069902081183, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — with r = 0.52/0.48, P(reach N) = (1 − r¹⁰)/(1 − r²⁵) ≈ 0.19. A small edge compounds against you.',
        incorrect: 'Use r = (1−p)/p = 0.52/0.48 in (1 − rⁱ)/(1 − rᴺ) ≈ 0.19.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [10, 25, 0.48], slotId: 's7-gamblers-ruin-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9007, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr5-2', type: 'problem', title: 'A steeper edge',
      body: 'A tilted game: each $1 bet wins with probability 0.45. You start at $5, aiming for $15.',
      question: 'What is the probability you reach $15 before busting? (decimal)',
      answer: 0.08955603314647384, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — with r = 0.55/0.45, (1 − r⁵)/(1 − r¹⁵) ≈ 0.09. A 5% edge is brutal over many bets.',
        incorrect: 'With r = (1−p)/p = 0.55/0.45, (1 − rⁱ)/(1 − rᴺ) ≈ 0.09.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [5, 15, 0.45], slotId: 's7-gamblers-ruin-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9008, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr6-1', type: 'problem', title: 'A dollar and a dream',
      body: 'A fair ±$1 game. You start with a single dollar and dream of $5.',
      question: 'What is the probability you reach $5 before going broke? (decimal)',
      answer: 0.2, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — i/N = 1/5. A long shot from a tiny stake.',
        incorrect: 'Fair game: i/N = 1/5.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [1, 5, 0.5], slotId: 's7-gamblers-ruin-s6',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9009, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-gr6-2', type: 'problem', title: 'One against six',
      body: 'A fair coin-flip game pays ±$1. With just $1 in hand, you aim for $6.',
      question: 'What is the probability you reach $6 before busting? (decimal)',
      answer: 0.16666666666666666, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — i/N = 1/6 ≈ 0.167. The farther the target, the longer the odds.',
        incorrect: 'Fair game: i/N = 1/6 ≈ 0.167.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'reachTargetProbability', args: [1, 6, 0.5], slotId: 's7-gamblers-ruin-s6',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9010, createdAt: '2026-06-25T20:40:00.000Z' },
  },

  // ---- s7-markov: markov-sim-matched stationary-fraction variants ----
  {
    step: {
      id: 'gen-mk2-1', type: 'problem', title: 'Server uptime',
      body: 'A server is “up” or “down” each minute. An up minute stays up with probability 0.9; a down minute recovers to up with probability 0.6.',
      simulation: 'markov', simConfig: matCfg(mkUptime, 0),
      question: 'What long-run fraction of minutes is the server up (state 1)? (decimal)',
      answer: 0.8571428571428578, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — for a 2-state chain π_up = 0.6/(0.1 + 0.6) ≈ 0.857.',
        incorrect: 'Stationary 2-state: π_up = b/(a+b) = 0.6/(0.1+0.6) ≈ 0.857.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkUptime, 0), slotId: 's7-markov-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9101, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk2-2', type: 'problem', title: 'Mood chain',
      body: 'A person’s mood each day is “cheerful” or “glum.” A cheerful day stays cheerful with probability 0.7; a glum day turns cheerful with probability 0.4.',
      simulation: 'markov', simConfig: matCfg(mkMood, 0),
      question: 'What long-run fraction of days are cheerful (state 1)? (decimal)',
      answer: 0.571428571428571, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — π_cheerful = 0.4/(0.3 + 0.4) ≈ 0.571.',
        incorrect: 'π_cheerful = b/(a+b) = 0.4/(0.3+0.4) ≈ 0.571.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkMood, 0), slotId: 's7-markov-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9102, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk3-1', type: 'problem', title: 'Two-page browsing',
      body: 'A reader bounces between two pages, A and B. From A they stay with probability 0.6 (else jump to B); from B they stay with probability 0.7 (else jump to A).',
      simulation: 'markov', simConfig: matCfg(mkPages, 1),
      question: 'What long-run fraction of time is spent on page B (state 2)? (decimal)',
      answer: 0.571428571428571, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — π_B = (A→B)/((A→B)+(B→A)) = 0.4/(0.4 + 0.3) ≈ 0.571.',
        incorrect: 'π_B = 0.4/(0.4+0.3) ≈ 0.571.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkPages, 1), slotId: 's7-markov-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9103, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk3-2', type: 'problem', title: 'Hot and cold cache',
      body: 'A cache entry is “hot” or “cold.” A hot entry stays hot with probability 0.85; a cold entry warms to hot with probability 0.25.',
      simulation: 'markov', simConfig: matCfg(mkCache, 1),
      question: 'What long-run fraction of time is the entry cold (state 2)? (decimal)',
      answer: 0.37499999999999967, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — π_cold = 0.15/(0.15 + 0.25) = 0.375.',
        incorrect: 'π_cold = (hot→cold)/((hot→cold)+(cold→hot)) = 0.15/0.40 = 0.375.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkCache, 1), slotId: 's7-markov-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9104, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk4-1', type: 'problem', title: 'Two even channels',
      body: 'Two equally-favored radio channels: whichever you are on, you switch to the other with probability 0.2 each song and stay with probability 0.8 — symmetric either way.',
      simulation: 'markov', simConfig: matCfg(mkSwitch20, 0),
      question: 'What long-run fraction of songs are spent on channel 1? (decimal)',
      answer: 0.5, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — symmetric switching splits time 0.5/0.5, however sticky the states are.',
        incorrect: 'Symmetric switch rates ⇒ π = 0.5 for each state.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkSwitch20, 0), slotId: 's7-markov-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9105, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk4-2', type: 'problem', title: 'A balanced thermostat',
      body: 'A thermostat flips between “eco” and “comfort” modes symmetrically: from either mode it switches with probability 0.15 and stays with probability 0.85.',
      simulation: 'markov', simConfig: matCfg(mkSwitch15, 0),
      question: 'What long-run fraction of time is spent in eco mode (state 1)? (decimal)',
      answer: 0.5, tolerance: 0.04, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — by symmetry the split is 0.5 each, no matter how rarely it switches.',
        incorrect: 'Symmetric switching ⇒ each mode gets π = 0.5.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mkSwitch15, 0), slotId: 's7-markov-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9106, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk5-1', type: 'problem', title: 'Three weather states',
      body: 'A 3-state weather chain (dry, cloudy, wet) cycles with the transition probabilities shown in the diagram.',
      simulation: 'markov', simConfig: matCfg(mk3a, 1),
      question: 'What long-run fraction of days are cloudy (state 2)? (decimal)',
      answer: 0.37499999999999956, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — solving πP = π gives state 2 ≈ 0.375.',
        incorrect: 'Solve πP = π (or watch the sim): state 2 ≈ 0.375.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mk3a, 1), slotId: 's7-markov-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9107, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-mk5-2', type: 'problem', title: 'Machine load states',
      body: 'A 3-state machine cycles between low, medium, and high load with the transition probabilities shown in the diagram.',
      simulation: 'markov', simConfig: matCfg(mk3b, 1),
      question: 'What long-run fraction of time is spent at medium load (state 2)? (decimal)',
      answer: 0.3709677419354838, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — solving πP = π puts state 2 at ≈ 0.371.',
        incorrect: 'Solve πP = π: state 2 ≈ 0.371.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'markovStationary', args: matArgs(mk3b, 1), slotId: 's7-markov-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9108, createdAt: '2026-06-25T20:40:00.000Z' },
  },

  // ---- s7-branching: branching-sim-matched extinction-probability variants ----
  {
    step: {
      id: 'gen-br2-1', type: 'problem', title: 'Barely any children',
      body: 'Each individual in a lineage leaves 0 children with probability 0.7 and 1 child with probability 0.3 (mean 0.3 offspring).',
      simulation: 'branching', simConfig: offCfg(brSub1),
      question: 'What is the probability the lineage eventually dies out? (decimal)',
      answer: 0.9999999999997176, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — the mean 0.3 is below 1, so extinction is certain: 1.',
        incorrect: 'Mean offspring below 1 ⇒ extinction is certain (probability 1).',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSub1, slotId: 's7-branching-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9201, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br2-2', type: 'problem', title: 'Not enough to sustain',
      body: 'Offspring counts 0, 1, 2 occur with probabilities 0.5, 0.3, 0.2 (mean 0.7 offspring per individual).',
      simulation: 'branching', simConfig: offCfg(brSub2),
      question: 'What is the probability the lineage eventually dies out? (decimal)',
      answer: 0.9999999999976822, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — mean 0.7 < 1, so the lineage dies out with certainty: 1.',
        incorrect: 'With mean 0.7 < 1, extinction is certain (probability 1).',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSub2, slotId: 's7-branching-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9202, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br3-1', type: 'problem', title: 'Tilted toward two',
      body: 'Offspring 0, 1, 2 have probabilities 0.2, 0.3, 0.5 (mean 1.3).',
      simulation: 'branching', simConfig: offCfg(brSup1),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.399999999998108, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — the smallest root of q = 0.2 + 0.3q + 0.5q² is q = 0.4.',
        incorrect: 'Solve q = 0.2 + 0.3q + 0.5q²; the smallest root in [0,1] is 0.4.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSup1, slotId: 's7-branching-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9203, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br3-2', type: 'problem', title: 'A growing family',
      body: 'Each individual leaves 0, 1, or 2 offspring with probabilities 0.3, 0.2, 0.5 (mean 1.2).',
      simulation: 'branching', simConfig: offCfg(brSup2),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.599999999996766, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — solving q = 0.3 + 0.2q + 0.5q² gives q = 0.6.',
        incorrect: 'Smallest root of q = 0.3 + 0.2q + 0.5q² is 0.6.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSup2, slotId: 's7-branching-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9204, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br4-1', type: 'problem', title: 'Right at the edge',
      body: 'Offspring 0, 1, 2 occur with probabilities 0.4, 0.2, 0.4 — a mean of exactly 1.',
      simulation: 'branching', simConfig: offCfg(brCrit1),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.9975218132623622, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — at the critical mean m = 1, extinction is still certain: 1.',
        incorrect: 'Critical lineages (m = 1) die out with probability 1.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brCrit1, slotId: 's7-branching-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9205, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br4-2', type: 'problem', title: 'Balanced on the knife-edge',
      body: 'Offspring 0, 1, 2 have probabilities 0.3, 0.4, 0.3 (mean exactly 1).',
      simulation: 'branching', simConfig: offCfg(brCrit2),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.9966971914015622, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — a critical process (m = 1) dies out with probability 1.',
        incorrect: 'At m = 1 the lineage still goes extinct with probability 1.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brCrit2, slotId: 's7-branching-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9206, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br5-1', type: 'problem', title: 'A healthy surplus',
      body: 'Each individual leaves either 0 or 2 offspring, with probabilities 0.3 and 0.7 (mean 1.4).',
      simulation: 'branching', simConfig: offCfg(brSurp1),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.42857142857020236, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — solving q = 0.3 + 0.7q² gives q = 3/7 ≈ 0.429.',
        incorrect: 'Smallest root of q = 0.3 + 0.7q² is 3/7 ≈ 0.429.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSurp1, slotId: 's7-branching-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9207, createdAt: '2026-06-25T20:40:00.000Z' },
  },
  {
    step: {
      id: 'gen-br5-2', type: 'problem', title: 'Two-or-none, leaning up',
      body: 'Offspring are 0 or 2 only, with probabilities 0.35 and 0.65 (mean 1.3).',
      simulation: 'branching', simConfig: offCfg(brSurp2),
      question: 'What is the extinction probability? (decimal)',
      answer: 0.5384615384598943, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — solving q = 0.35 + 0.65q² gives q = 7/13 ≈ 0.538.',
        incorrect: 'Smallest root of q = 0.35 + 0.65q² is 7/13 ≈ 0.538.',
      },
    },
    sectionId: 's7-stochastic', kernel: 'extinctionProbability', args: brSurp2, slotId: 's7-branching-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 9208, createdAt: '2026-06-25T20:40:00.000Z' },
  },
];
