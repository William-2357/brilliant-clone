import type { GeneratedProblem } from './index';

// Generated, simulation-matched problems for the l1-coin-flip lesson. Each targets a
// specific problem slot (`slotId`); problemTemplates.ts bridges them into the player so
// they replace the hand-written coin bank while keeping the coinFlip predict-then-verify
// run. Answers come from longRunFrequency(p) (= p), and simConfig.p == answer so the sim
// converges to the graded value. Complement phrasing keeps them a step beyond a read-off.
export const foundationsProblems: GeneratedProblem[] = [
  {
    step: {
      id: 'gen-l1s2-1', type: 'problem', title: 'The other side',
      body: 'A novelty coin is weighted to land heads 55% of the time, and every toss is independent of the last.',
      question: 'Over a long run of tosses, what fraction come up tails? (decimal)',
      answer: 0.45, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.45 },
      feedback: {
        correct: 'Right — heads is 0.55, so tails is 1 − 0.55 = 0.45 over the long run.',
        incorrect: 'Take the complement: if heads is 0.55, the rest must be tails.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.45], slotId: 'l1-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 121, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s2-2', type: 'problem', title: 'Off the line',
      body: 'On an assembly line, each unit clears final inspection with probability 58%, independently of the others.',
      question: 'What fraction of a long production run is rejected? (decimal)',
      answer: 0.42, tolerance: 0.05, unit: 'fraction', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'coinFlip', simConfig: { flips: 2000, p: 0.42 },
      feedback: {
        correct: 'Right — 58% pass, so 1 − 0.58 = 0.42 are rejected over the long run.',
        incorrect: 'Rejected is the complement of passing: 1 − 0.58.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.42], slotId: 'l1-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 122, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s3-1', type: 'problem', title: 'Against the measure',
      body: 'A pollster reaches voters at random, and each independently supports a measure with probability 38%.',
      question: 'Over many calls, what fraction do NOT support it? (decimal)',
      answer: 0.62, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.62 },
      feedback: {
        correct: 'Right — 0.38 support, so 1 − 0.38 = 0.62 do not, over the long run.',
        incorrect: 'Subtract the support rate from 1: 1 − 0.38.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.62], slotId: 'l1-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 131, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s3-2', type: 'problem', title: 'Seeds that take',
      body: 'A seed supplier states that each seed fails to germinate with probability 25%, independently of the rest of the packet.',
      question: 'What fraction of a large packet germinate? (decimal)',
      answer: 0.75, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.75 },
      feedback: {
        correct: 'Right — 0.25 fail, so 1 − 0.25 = 0.75 germinate over the long run.',
        incorrect: 'Germinating is the complement of failing: 1 − 0.25.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.75], slotId: 'l1-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 132, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s4-1', type: 'problem', title: 'The gambler’s trap',
      body: 'A roulette-style wheel lands on red with probability 47% on each independent spin. By a quirk of chance, the last five spins all came up red.',
      question: 'What is the probability the very next spin is NOT red? (decimal)',
      answer: 0.53, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.53 },
      feedback: {
        correct: 'Right — the streak is irrelevant: each spin is 0.47 red, so 1 − 0.47 = 0.53 otherwise.',
        incorrect: 'Independence means the streak changes nothing: 1 − 0.47.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.53], slotId: 'l1-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 141, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s4-2', type: 'problem', title: 'No memory',
      body: 'A slot machine pays its small jackpot with probability 30% on each pull, every pull independent of the last; the last four pulls all hit the jackpot.',
      question: 'What is the probability the next pull is NOT a jackpot? (decimal)',
      answer: 0.7, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.7 },
      feedback: {
        correct: 'Right — the streak doesn’t matter: each pull is 0.30 a jackpot, so 1 − 0.30 = 0.70 otherwise.',
        incorrect: 'The pulls are independent — the streak is a red herring: 1 − 0.30.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.7], slotId: 'l1-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 142, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s5-1', type: 'problem', title: 'The defective few',
      body: 'Each chip coming off a line is good with probability 85%, independently of the rest.',
      question: 'What fraction of a large batch is defective? (decimal)',
      answer: 0.15, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 2000, p: 0.15 },
      feedback: {
        correct: 'Right — 0.85 are good, so 1 − 0.85 = 0.15 are defective over the long run.',
        incorrect: 'Defective is the complement of good: 1 − 0.85.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.15], slotId: 'l1-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 151, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s5-2', type: 'problem', title: 'Breakthroughs',
      body: 'In a field trial a vaccine blocks infection on each exposure with probability 78%, with exposures treated as independent.',
      question: 'What fraction of exposures lead to breakthrough infections? (decimal)',
      answer: 0.22, tolerance: 0.05, unit: 'fraction', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.22 },
      feedback: {
        correct: 'Right — 0.78 are blocked, so 1 − 0.78 = 0.22 break through over the long run.',
        incorrect: 'Breakthroughs are the complement of blocked: 1 − 0.78.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.22], slotId: 'l1-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 152, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s6-1', type: 'problem', title: 'At the line',
      body: 'A guard misses free throws 18% of the time, and each attempt is independent of the rest.',
      question: 'Over many attempts, what fraction does the guard make? (decimal)',
      answer: 0.82, tolerance: 0.05, unit: 'fraction', interaction: 'numeric',
      simulation: 'coinFlip', simConfig: { flips: 1000, p: 0.82 },
      feedback: {
        correct: 'Right — 0.18 are missed, so 1 − 0.18 = 0.82 are made over the long run.',
        incorrect: 'Made is the complement of missed: 1 − 0.18.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.82], slotId: 'l1-s6',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 161, createdAt: '2026-06-25T15:18:00.000Z' },
  },
  {
    step: {
      id: 'gen-l1s6-2', type: 'problem', title: 'Five nines, almost',
      body: 'A web service returns an error on each request with probability 12%, independently of the others.',
      question: 'What fraction of a long stream of requests succeed? (decimal)',
      answer: 0.88, tolerance: 0.05, unit: 'fraction', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'coinFlip', simConfig: { flips: 2000, p: 0.88 },
      feedback: {
        correct: 'Right — 0.12 error out, so 1 − 0.12 = 0.88 succeed over the long run.',
        incorrect: 'Success is the complement of erroring: 1 − 0.12.',
      },
    },
    sectionId: 's1-foundations', kernel: 'longRunFrequency', args: [0.88], slotId: 'l1-s6',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 162, createdAt: '2026-06-25T15:18:00.000Z' },
  },

  // ---- s1-set-algebra: Venn-sim-matched variants. Each targets a problem slot and
  // reads one region of a two-event Venn over equally-likely outcomes. Answers come
  // from vennProb(counts, region); simConfig carries the exact counts + region index
  // so the sampled fraction converges to the graded value. Each slot has two variants
  // with different class compositions; the answer is never stated in the prose.
  {
    step: {
      id: 'gen-sa-s2-1', type: 'problem', title: 'Coffee or tea',
      body: 'An office of 40 staff was surveyed on their morning drink: 18 take only coffee, 7 take only tea, 9 take both, and 6 take neither. One worker is picked at random, and event A is that they drink coffee.',
      question: 'What is P(A), the probability the chosen worker drinks coffee? (decimal)',
      answer: 0.675, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 18, bOnly: 7, both: 9, neither: 6, region: 0, trials: 900 },
      feedback: {
        correct: 'Right — circle A holds the coffee-only and the both groups: (18 + 9)/40 = 27/40 = 0.675.',
        incorrect: 'Count everyone inside circle A — coffee-only plus both — over all 40: (18 + 9)/40.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [18, 7, 9, 6, 0], slotId: 's1-set-algebra-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1121, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s2-2', type: 'problem', title: 'Cats and dogs',
      body: 'A neighborhood survey of 50 households found 19 keep only a dog, 14 keep only a cat, 7 keep both, and 10 keep neither. A household is chosen at random; event A is that it keeps a dog.',
      question: 'What is P(A), the probability the household keeps a dog? (decimal)',
      answer: 0.52, tolerance: 0.04, unit: 'probability', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'venn', simConfig: { aOnly: 19, bOnly: 14, both: 7, neither: 10, region: 0, trials: 900 },
      feedback: {
        correct: 'Right — dog owners are the dog-only and both groups: (19 + 7)/50 = 26/50 = 0.52.',
        incorrect: 'A dog-owning household is anyone inside circle A: (19 + 7)/50.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [19, 14, 7, 10, 0], slotId: 's1-set-algebra-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1122, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s3-1', type: 'problem', title: 'Yoga and weights',
      body: 'A gym’s 36 members each train one way, both, or neither: 12 do only yoga, 9 only lift weights, 6 do both, and 9 do neither. One member is drawn at random — event A is “does yoga”, event B is “lifts weights”.',
      question: 'What is P(A ∩ B), the probability the member does both? (decimal)',
      answer: 0.16666666666666666, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 12, bOnly: 9, both: 6, neither: 9, region: 2, trials: 900 },
      feedback: {
        correct: 'Right — only the overlap counts: 6/36 ≈ 0.167.',
        incorrect: 'The intersection is just the both group: 6 of 36 members ≈ 0.167.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [12, 9, 6, 9, 2], slotId: 's1-set-algebra-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1131, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s3-2', type: 'problem', title: 'Rock and jazz',
      body: 'A music festival polled 40 fans: 15 like only rock, 11 like only jazz, 7 like both, and 7 like neither. A fan is chosen at random — event A is “likes rock”, event B is “likes jazz”.',
      question: 'What is P(A ∩ B), the probability the fan likes both genres? (decimal)',
      answer: 0.175, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 15, bOnly: 11, both: 7, neither: 7, region: 2, trials: 900 },
      feedback: {
        correct: 'Right — the overlap is 7 of 40: 7/40 = 0.175.',
        incorrect: 'Count only the lens where the two circles meet: 7/40 = 0.175.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [15, 11, 7, 7, 2], slotId: 's1-set-algebra-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1132, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s4-1', type: 'problem', title: 'Not by bike',
      body: 'Of 40 commuters, 8 only bike to work, 14 only take the bus, 5 do both on different days, and 13 do neither. One commuter is picked at random; event A is “bikes to work”.',
      question: 'What is P(Aᶜ), the probability the commuter does NOT bike? (decimal)',
      answer: 0.675, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 8, bOnly: 14, both: 5, neither: 13, region: 6, trials: 900 },
      feedback: {
        correct: 'Right — bikers number 8 + 5 = 13, so the complement is 1 − 13/40 = 27/40 = 0.675.',
        incorrect: 'Use the complement rule: 13 of 40 bike, so 1 − 13/40 = 27/40.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [8, 14, 5, 13, 6], slotId: 's1-set-algebra-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1141, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s4-2', type: 'problem', title: 'Beyond French',
      body: 'At a 45-delegate conference, 11 speak only French, 13 only Spanish, 5 speak both, and 16 speak neither. A delegate is chosen at random; event A is “speaks French”.',
      question: 'What is P(Aᶜ), the probability the delegate does NOT speak French? (decimal)',
      answer: 0.6444444444444445, tolerance: 0.04, unit: 'probability', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'venn', simConfig: { aOnly: 11, bOnly: 13, both: 5, neither: 16, region: 6, trials: 900 },
      feedback: {
        correct: 'Right — 11 + 5 = 16 speak French, so the complement is 1 − 16/45 = 29/45 ≈ 0.644.',
        incorrect: 'Subtract the French speakers from 1: 1 − 16/45 = 29/45 ≈ 0.644.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [11, 13, 5, 16, 6], slotId: 's1-set-algebra-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1142, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s5-1', type: 'problem', title: 'Dessert, hold the coffee',
      body: 'A bistro logged 40 tables one evening: 14 ordered only dessert, 10 only an after-dinner coffee, 8 ordered both, and 8 ordered neither. Pick a table at random — event A is “ordered dessert”, event B is “ordered coffee”.',
      question: 'What is P(A only), the probability the table ordered dessert but NOT coffee? (decimal)',
      answer: 0.35, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 14, bOnly: 10, both: 8, neither: 8, region: 4, trials: 900 },
      feedback: {
        correct: 'Right — strip the overlap from A: 14 of 40 ordered dessert alone, 14/40 = 0.35.',
        incorrect: 'You want A outside the overlap — the dessert-only slice: 14/40 = 0.35.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [14, 10, 8, 8, 4], slotId: 's1-set-algebra-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1151, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s5-2', type: 'problem', title: 'Chemistry alone',
      body: 'Among 45 science students, 13 take only chemistry, 12 only biology, 9 take both, and 11 take neither. One student is chosen at random; event A is “takes chemistry”, event B is “takes biology”.',
      question: 'What is P(A only), the probability the student takes chemistry but NOT biology? (decimal)',
      answer: 0.28888888888888886, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 13, bOnly: 12, both: 9, neither: 11, region: 4, trials: 900 },
      feedback: {
        correct: 'Right — the chemistry-only slice is 13 of 45 ≈ 0.289.',
        incorrect: 'Take A and remove the 9 who also take biology: 13/45 ≈ 0.289.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [13, 12, 9, 11, 4], slotId: 's1-set-algebra-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1152, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s6-1', type: 'problem', title: 'Neither flower nor fruit',
      body: 'A botanist catalogs 40 plants in a plot: 12 only flower, 8 only bear fruit, 6 do both, and 14 do neither. A plant is chosen at random; event A is “flowers”, event B is “bears fruit”.',
      question: 'What is P((A ∪ B)ᶜ), the probability the plant does neither? (decimal)',
      answer: 0.35, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 12, bOnly: 8, both: 6, neither: 14, region: 7, trials: 900 },
      feedback: {
        correct: 'Right — by De Morgan, “neither” is everyone outside both circles: 14/40 = 0.35.',
        incorrect: '(A ∪ B)ᶜ is the outside region — the 14 plants that do neither: 14/40 = 0.35.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [12, 8, 6, 14, 7], slotId: 's1-set-algebra-s6',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1161, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-sa-s6-2', type: 'problem', title: 'Watched nothing',
      body: 'A streaming service checked 45 viewers last week: 16 watched only comedies, 11 only dramas, 9 watched both, and 9 watched neither. Pick a viewer at random; event A is “watched a comedy”, event B is “watched a drama”.',
      question: 'What is P((A ∪ B)ᶜ), the probability the viewer watched neither? (decimal)',
      answer: 0.2, tolerance: 0.04, unit: 'probability', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'venn', simConfig: { aOnly: 16, bOnly: 11, both: 9, neither: 9, region: 7, trials: 900 },
      feedback: {
        correct: 'Right — the “neither” region holds 9 of 45 viewers: 9/45 = 0.2.',
        incorrect: 'Count only those outside both circles: 9 of 45 = 0.2.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [16, 11, 9, 9, 7], slotId: 's1-set-algebra-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1162, createdAt: '2026-06-25T16:00:00.000Z' },
  },

  // ---- s1-addition-rule: union variants. The s2/s3 slots read the Venn “or” region
  // (s2 disjoint with both = 0, s3 overlapping with both > 0); s4 uses the additionRule
  // kernel and s5 the inclusionExclusion3 kernel, both with no sim (probability givens).
  {
    step: {
      id: 'gen-ar-s2-1', type: 'problem', title: 'One language or the other',
      body: 'In a class of 40, students may enroll in at most one language elective: 11 take French, 7 take German, no one takes both, and the remaining 22 take no language. One student is chosen at random.',
      question: 'What is P(A ∪ B), the chance the student takes French or German? (decimal)',
      answer: 0.45, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 11, bOnly: 7, both: 0, neither: 22, region: 3, trials: 900 },
      feedback: {
        correct: 'Right — the events are disjoint, so just add: (11 + 7)/40 = 18/40 = 0.45.',
        incorrect: 'With no overlap, P(A ∪ B) = P(A) + P(B) = 11/40 + 7/40 = 18/40.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [11, 7, 0, 22, 3], slotId: 's1-addition-rule-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1221, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s2-2', type: 'problem', title: 'Clashing clubs',
      body: 'Choir and debate meet at the same hour, so no student can join both. Of 50 students, 14 are in choir, 10 are in debate, and the other 26 are in neither. A student is picked at random.',
      question: 'What is P(A ∪ B), the chance the student is in choir or debate? (decimal)',
      answer: 0.48, tolerance: 0.04, unit: 'probability', interaction: 'slider',
      sliderMin: 0, sliderMax: 1, sliderStep: 0.01,
      simulation: 'venn', simConfig: { aOnly: 14, bOnly: 10, both: 0, neither: 26, region: 3, trials: 900 },
      feedback: {
        correct: 'Right — the clubs are mutually exclusive, so add them: (14 + 10)/50 = 24/50 = 0.48.',
        incorrect: 'No overlap means plain addition: 14/50 + 10/50 = 24/50 = 0.48.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [14, 10, 0, 26, 3], slotId: 's1-addition-rule-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1222, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s3-1', type: 'problem', title: 'Music or sport',
      body: 'A class of 36 reports their activities: 14 play an instrument, 13 play a sport, and 6 of those do both. Event A is “plays an instrument”, event B is “plays a sport”. One student is chosen at random.',
      question: 'What is P(A ∪ B), the chance the student plays an instrument or a sport? (decimal)',
      answer: 0.5833333333333334, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 8, bOnly: 7, both: 6, neither: 15, region: 3, trials: 900 },
      feedback: {
        correct: 'Right — add and subtract the overlap: 14/36 + 13/36 − 6/36 = 21/36 ≈ 0.583.',
        incorrect: 'Apply the addition rule so the 6 in both are not double-counted: (14 + 13 − 6)/36 = 21/36.',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [8, 7, 6, 15, 3], slotId: 's1-addition-rule-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1231, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s3-2', type: 'problem', title: 'Python or R',
      body: 'A data conference surveyed 40 attendees: 13 use only Python, 9 use only R, 7 use both, and 11 use neither. Pick an attendee at random; event A is “uses Python”, event B is “uses R”.',
      question: 'What is P(A ∪ B), the chance the attendee uses Python or R? (decimal)',
      answer: 0.725, tolerance: 0.04, unit: 'probability', interaction: 'numeric',
      simulation: 'venn', simConfig: { aOnly: 13, bOnly: 9, both: 7, neither: 11, region: 3, trials: 900 },
      feedback: {
        correct: 'Right — the union is everyone in at least one circle: (13 + 9 + 7)/40 = 29/40 = 0.725.',
        incorrect: 'P(A ∪ B) sums the three inside regions: (13 + 9 + 7)/40 = 29/40 (equivalently 1 − 11/40).',
      },
    },
    sectionId: 's1-foundations', kernel: 'vennProb', args: [13, 9, 7, 11, 3], slotId: 's1-addition-rule-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1232, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s4-1', type: 'problem', title: 'Late again',
      body: 'On any given morning, a commuter is delayed by heavy traffic with probability 0.30 and by bad weather with probability 0.20; both strike together with probability 0.08.',
      question: 'What is the probability the commuter is delayed by traffic OR weather? (decimal)',
      answer: 0.42, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — add the two causes and remove the shared mornings: 0.30 + 0.20 − 0.08 = 0.42.',
        incorrect: 'Use the addition rule so the 0.08 overlap is counted once: 0.30 + 0.20 − 0.08 = 0.42.',
      },
    },
    sectionId: 's1-foundations', kernel: 'additionRule', args: [0.3, 0.2, 0.08], slotId: 's1-addition-rule-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1241, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s4-2', type: 'problem', title: 'Ace or spade',
      body: 'A single card is drawn from a standard 52-card deck. P(ace) = 4/52, P(spade) = 13/52, and P(ace of spades) = 1/52.',
      question: 'What is the probability the card is an ace OR a spade? (decimal)',
      answer: 0.3076923076923077, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — the ace of spades sits in both, so subtract it once: 4/52 + 13/52 − 1/52 = 16/52 ≈ 0.308.',
        incorrect: 'Do not double-count the ace of spades: 4/52 + 13/52 − 1/52 = 16/52 ≈ 0.308.',
      },
    },
    sectionId: 's1-foundations', kernel: 'additionRule', args: [4 / 52, 13 / 52, 1 / 52], slotId: 's1-addition-rule-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1242, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s5-1', type: 'problem', title: 'Three subscriptions',
      body: 'A household keeps streaming service A with probability 0.5, B with 0.4, and C with 0.35. The pairwise chances are P(A∩B) = 0.2, P(A∩C) = 0.15, P(B∩C) = 0.1, and all three with P(A∩B∩C) = 0.05.',
      question: 'What is P(A ∪ B ∪ C), the chance the household has at least one service? (decimal)',
      answer: 0.8500000000000001, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — singles (1.25) − pairs (0.45) + triple (0.05) = 0.85.',
        incorrect: 'Inclusion–exclusion: add the three singles, subtract the three pairs, add back the triple — 1.25 − 0.45 + 0.05 = 0.85.',
      },
    },
    sectionId: 's1-foundations', kernel: 'inclusionExclusion3', args: [0.5, 0.4, 0.35, 0.2, 0.15, 0.1, 0.05], slotId: 's1-addition-rule-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1251, createdAt: '2026-06-25T16:00:00.000Z' },
  },
  {
    step: {
      id: 'gen-ar-s5-2', type: 'problem', title: 'Three coupons',
      body: 'A shopper redeems coupon A with probability 0.45, B with 0.4, and C with 0.3. The overlaps run P(A∩B) = 0.2, P(A∩C) = 0.15, P(B∩C) = 0.1, and P(A∩B∩C) = 0.05.',
      question: 'What is P(A ∪ B ∪ C), the chance the shopper uses at least one coupon? (decimal)',
      answer: 0.7500000000000002, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — singles (1.15) − pairs (0.45) + triple (0.05) = 0.75.',
        incorrect: 'Inclusion–exclusion: 1.15 − 0.45 + 0.05 = 0.75.',
      },
    },
    sectionId: 's1-foundations', kernel: 'inclusionExclusion3', args: [0.45, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05], slotId: 's1-addition-rule-s5',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 1252, createdAt: '2026-06-25T16:00:00.000Z' },
  },
];
