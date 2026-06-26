import type { GeneratedProblem } from './index';

// Generated, simulation-matched problems for the s2-multiplication, s2-permutations,
// and s2-combinations lessons. Each targets a specific problem slot (`slotId`);
// problemTemplates.ts bridges them into the player so they replace the hand-written
// combinatorics bank while keeping the countingTree / arrangements / pascal
// predict-then-verify run. Answers come from countProduct / permutations /
// combinations, and each simConfig mirrors the matching static problem's shape so
// the count-up sim climbs to the graded value. Counts are exact integers (tolerance
// 0.5), and the answer is never stated in the body or question.
export const combinatoricsProblems: GeneratedProblem[] = [
  // ---- s2-multiplication: countingTree-sim-matched variants (answers = countProduct) ----
  {
    step: {
      id: 'gen-m2-1', type: 'problem', title: 'Bagel and spread',
      body: 'A café offers 4 kinds of bagel and 3 spreads; you choose one bagel and one spread.',
      question: 'How many different bagel-and-spread orders can you make? (a whole number)',
      answer: 12, tolerance: 0.5, unit: 'orders', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 2, o0: 4, o1: 3 },
      feedback: {
        correct: 'Right — 4 × 3 = 12, one for each bagel-and-spread pairing.',
        incorrect: 'Multiply the choices at each stage: 4 bagels × 3 spreads = 12.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [4, 3], slotId: 's2-multiplication-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2001, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m2-2', type: 'problem', title: 'Build a bike',
      body: 'A bike shop sells frames in 5 colors and wheels in 2 styles; you pick one of each.',
      question: 'How many distinct bikes can be ordered? (a whole number)',
      answer: 10, tolerance: 0.5, unit: 'bikes', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 2, o0: 5, o1: 2 },
      feedback: {
        correct: 'Right — 5 × 2 = 10, one bike for each color-and-wheel combination.',
        incorrect: 'Multiply the two stages: 5 colors × 2 wheel styles = 10.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [5, 2], slotId: 's2-multiplication-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2002, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m3-1', type: 'problem', title: 'Build a burrito',
      body: 'A taquería lets you choose 1 of 2 tortillas, 1 of 3 proteins, and 1 of 4 salsas.',
      question: 'How many distinct burritos can you order? (a whole number)',
      answer: 24, tolerance: 0.5, unit: 'burritos', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 3, o0: 2, o1: 3, o2: 4 },
      feedback: {
        correct: 'Exactly — 2 × 3 × 4 = 24. Each new independent stage multiplies the total.',
        incorrect: 'Multiply all three stages: 2 × 3 × 4 = 24.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [2, 3, 4], slotId: 's2-multiplication-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2003, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m3-2', type: 'problem', title: 'Design an avatar',
      body: 'A game character is assembled from 5 heads, 2 torsos, and 2 leg styles — one of each.',
      question: 'How many distinct avatars are possible? (a whole number)',
      answer: 20, tolerance: 0.5, unit: 'avatars', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 3, o0: 5, o1: 2, o2: 2 },
      feedback: {
        correct: 'Right — 5 × 2 × 2 = 20 avatars.',
        incorrect: 'Multiply each independent part: 5 × 2 × 2 = 20.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [5, 2, 2], slotId: 's2-multiplication-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2004, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m4-1', type: 'problem', title: 'A bead pattern',
      body: 'A 4-bead charm shows one color in each slot from a palette of 5, and colors may repeat.',
      question: 'How many distinct color patterns are possible? (a whole number)',
      answer: 625, tolerance: 0.5, unit: 'patterns', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 4, o0: 5, o1: 5, o2: 5, o3: 5 },
      feedback: {
        correct: 'Right — colors can repeat, so every slot keeps all 5 options: 5⁴ = 625.',
        incorrect: 'Repetition is allowed, so each of the 4 slots has 5 options: 5⁴ = 625 (not 5·4·3·2).',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [5, 5, 5, 5], slotId: 's2-multiplication-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2005, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m4-2', type: 'problem', title: 'An octal lock',
      body: 'A combination lock has 4 dials, each showing a digit from 0 to 7, and digits may repeat.',
      question: 'How many settings does the lock have? (a whole number)',
      answer: 4096, tolerance: 0.5, unit: 'codes', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 4, o0: 8, o1: 8, o2: 8, o3: 8 },
      feedback: {
        correct: 'Right — repetition is allowed, so each dial has 8 options: 8⁴ = 4,096.',
        incorrect: 'Digits can repeat, so every dial keeps all 8 options: 8⁴ = 4,096.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [8, 8, 8, 8], slotId: 's2-multiplication-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2006, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m5-1', type: 'problem', title: 'Build a pizza',
      body: 'A pizzeria offers 3 crusts, 2 sauces, 4 cheeses, and 2 sizes; you pick one of each.',
      question: 'How many distinct pizzas can be ordered? (a whole number)',
      answer: 48, tolerance: 0.5, unit: 'pizzas', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 4, o0: 3, o1: 2, o2: 4, o3: 2 },
      feedback: {
        correct: 'Exactly — 3 × 2 × 4 × 2 = 48 pizzas.',
        incorrect: 'Multiply every choice: 3 × 2 × 4 × 2 = 48.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [3, 2, 4, 2], slotId: 's2-multiplication-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2007, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m5-2', type: 'problem', title: 'A travel package',
      body: 'A holiday bundle pairs 1 of 3 flights, 1 of 3 hotels, 1 of 2 tours, and 1 of 2 rental cars.',
      question: 'How many distinct packages can be assembled? (a whole number)',
      answer: 36, tolerance: 0.5, unit: 'packages', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 4, o0: 3, o1: 3, o2: 2, o3: 2 },
      feedback: {
        correct: 'Right — 3 × 3 × 2 × 2 = 36 packages.',
        incorrect: 'Multiply all four stages: 3 × 3 × 2 × 2 = 36.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [3, 3, 2, 2], slotId: 's2-multiplication-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2008, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m6-1', type: 'problem', title: 'Longer plates',
      body: 'A license plate is 3 letters (A–Z) followed by 2 digits (0–9), repetition allowed.',
      question: 'How many plates are possible? (a whole number)',
      answer: 1757600, tolerance: 0.5, unit: 'plates', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 5, o0: 26, o1: 26, o2: 26, o3: 10, o4: 10 },
      feedback: {
        correct: 'Right — 26³ × 10² = 1,757,600 plates.',
        incorrect: 'Multiply each slot: 26 × 26 × 26 × 10 × 10 = 1,757,600.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [26, 26, 26, 10, 10], slotId: 's2-multiplication-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2009, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-m6-2', type: 'problem', title: 'Serial numbers',
      body: 'A product serial is 1 letter (A–Z) followed by 4 digits (0–9), repetition allowed.',
      question: 'How many serial numbers are possible? (a whole number)',
      answer: 260000, tolerance: 0.5, unit: 'serials', interaction: 'numeric',
      simulation: 'countingTree', simConfig: { slots: 5, o0: 26, o1: 10, o2: 10, o3: 10, o4: 10 },
      feedback: {
        correct: 'Right — 26 × 10⁴ = 260,000 serials.',
        incorrect: 'Multiply each slot: 26 × 10 × 10 × 10 × 10 = 260,000.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'countProduct', args: [26, 10, 10, 10, 10], slotId: 's2-multiplication-s6',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2010, createdAt: '2026-06-25T16:20:00.000Z' },
  },

  // ---- s2-permutations: arrangements-sim-matched variants (answers = permutations(n, r)) ----
  {
    step: {
      id: 'gen-p2-1', type: 'problem', title: 'Trophies in a row',
      body: 'Five distinct trophies are lined up on a shelf.',
      question: 'How many orderings are there? (a whole number)',
      answer: 120, tolerance: 0.5, unit: 'orderings', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 5, r: 5 },
      feedback: {
        correct: 'Right — 5! = 120 orderings.',
        incorrect: 'Arrange all 5: 5! = 5 × 4 × 3 × 2 × 1 = 120.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [5, 5], slotId: 's2-permutations-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2011, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p2-2', type: 'problem', title: 'Three speakers',
      body: 'Three keynote speakers are scheduled one after another.',
      question: 'How many speaking orders are possible? (a whole number)',
      answer: 6, tolerance: 0.5, unit: 'orders', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 3, r: 3 },
      feedback: {
        correct: 'Right — 3! = 6 orders.',
        incorrect: 'Arrange all 3: 3! = 3 × 2 × 1 = 6.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [3, 3], slotId: 's2-permutations-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2012, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p3-1', type: 'problem', title: 'Top three',
      body: 'From 6 sprinters, you record who finishes 1st, 2nd, and 3rd.',
      question: 'How many ordered podiums are possible? (a whole number)',
      answer: 120, tolerance: 0.5, unit: 'podiums', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 6, r: 3 },
      feedback: {
        correct: 'Exactly — 6 × 5 × 4 = 120 = 6P3.',
        incorrect: 'Fill 3 ordered slots from 6: 6 × 5 × 4 = 120.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [6, 3], slotId: 's2-permutations-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2013, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p3-2', type: 'problem', title: 'Two prizes',
      body: 'From 8 contestants, a distinct first and second prize are awarded.',
      question: 'How many ways can the two prizes be assigned? (a whole number)',
      answer: 56, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 8, r: 2 },
      feedback: {
        correct: 'Right — 8 × 7 = 56 = 8P2.',
        incorrect: 'Order matters across 2 ordered slots from 8: 8 × 7 = 56.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [8, 2], slotId: 's2-permutations-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2014, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p4-1', type: 'problem', title: 'A full shelf',
      body: 'Eight distinct books are arranged in a row on a shelf.',
      question: 'How many arrangements are there? (a whole number)',
      answer: 40320, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 8, r: 8 },
      feedback: {
        correct: 'Right — 8! = 40,320.',
        incorrect: 'Arrange all 8: 8! = 40,320.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [8, 8], slotId: 's2-permutations-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2015, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p4-2', type: 'problem', title: 'Five ornaments',
      body: 'Five distinct ornaments are placed in a row on a mantel.',
      question: 'How many arrangements are possible? (a whole number)',
      answer: 120, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 5, r: 5 },
      feedback: {
        correct: 'Right — 5! = 120.',
        incorrect: 'Arrange all 5: 5! = 120.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [5, 5], slotId: 's2-permutations-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2016, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p5-1', type: 'problem', title: 'Diving medals',
      body: 'Ten divers compete for gold, silver, and bronze (order matters).',
      question: 'How many ways can the three medals be awarded? (a whole number)',
      answer: 720, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 10, r: 3 },
      feedback: {
        correct: 'Exactly — 10 × 9 × 8 = 720 = 10P3.',
        incorrect: 'Order matters: 10 × 9 × 8 = 720.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [10, 3], slotId: 's2-permutations-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2017, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p5-2', type: 'problem', title: 'Festival awards',
      body: 'From 7 films, a Best, a Runner-up, and a Third Place are chosen (order matters).',
      question: 'How many ways can the three awards be assigned? (a whole number)',
      answer: 210, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 7, r: 3 },
      feedback: {
        correct: 'Right — 7 × 6 × 5 = 210 = 7P3.',
        incorrect: 'Fill 3 ordered award slots from 7: 7 × 6 × 5 = 210.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [7, 3], slotId: 's2-permutations-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2018, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p6-1', type: 'problem', title: 'Eight at the table',
      body: 'Eight guests sit in eight distinct chairs along one side of a table.',
      question: 'How many seatings are possible? (a whole number)',
      answer: 40320, tolerance: 0.5, unit: 'seatings', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 8, r: 8 },
      feedback: {
        correct: 'Right — 8! = 40,320.',
        incorrect: 'Arrange all 8: 8! = 40,320.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [8, 8], slotId: 's2-permutations-s6',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2019, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-p6-2', type: 'problem', title: 'Six seats',
      body: 'Six guests sit in six distinct chairs.',
      question: 'How many seatings are possible? (a whole number)',
      answer: 720, tolerance: 0.5, unit: 'seatings', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { n: 6, r: 6 },
      feedback: {
        correct: 'Right — 6! = 720.',
        incorrect: 'Arrange all 6: 6! = 720.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'permutations', args: [6, 6], slotId: 's2-permutations-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2020, createdAt: '2026-06-25T16:20:00.000Z' },
  },

  // ---- s2-combinations: pascal-sim-matched variants (answers = combinations(n, k)) ----
  {
    step: {
      id: 'gen-c2-1', type: 'problem', title: 'Pick a pair',
      body: 'From 6 teammates, you choose 2 to run a relay leg (order does not matter).',
      question: 'How many pairs are possible? (a whole number)',
      answer: 15, tolerance: 0.5, unit: 'pairs', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 6, k: 2 },
      feedback: {
        correct: 'Right — C(6, 2) = 15.',
        incorrect: 'Order does not matter: C(6, 2) = 15.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [6, 2], slotId: 's2-combinations-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2021, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c2-2', type: 'problem', title: 'Mix two colors',
      body: 'From 4 paint colors, you choose 2 to blend (order does not matter).',
      question: 'How many color pairs are possible? (a whole number)',
      answer: 6, tolerance: 0.5, unit: 'pairs', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 4, k: 2 },
      feedback: {
        correct: 'Right — C(4, 2) = 6.',
        incorrect: 'Choose 2 of 4 without order: C(4, 2) = 6.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [4, 2], slotId: 's2-combinations-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2022, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c3-1', type: 'problem', title: 'A subcommittee',
      body: 'A subcommittee of 3 is chosen from 7 board members.',
      question: 'How many subcommittees are possible? (a whole number)',
      answer: 35, tolerance: 0.5, unit: 'committees', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 7, k: 3 },
      feedback: {
        correct: 'Exactly — C(7, 3) = 35.',
        incorrect: 'Choose 3 of 7 without order: C(7, 3) = 35.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [7, 3], slotId: 's2-combinations-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2023, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c3-2', type: 'problem', title: 'A judging panel',
      body: 'A panel of 3 is chosen from 8 judges.',
      question: 'How many panels are possible? (a whole number)',
      answer: 56, tolerance: 0.5, unit: 'panels', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 8, k: 3 },
      feedback: {
        correct: 'Right — C(8, 3) = 56.',
        incorrect: 'Choose 3 of 8 without order: C(8, 3) = 56.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [8, 3], slotId: 's2-combinations-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2024, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c4-1', type: 'problem', title: 'Questions to skip',
      body: 'On an 8-question exam you must choose 6 questions to SKIP (order does not matter).',
      question: 'How many choices are there? (a whole number)',
      answer: 28, tolerance: 0.5, unit: 'choices', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 8, k: 6 },
      feedback: {
        correct: 'Right — C(8, 6) = C(8, 2) = 28. Skipping 6 is the same as answering 2.',
        incorrect: 'By symmetry C(8, 6) = C(8, 2) = 28.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [8, 6], slotId: 's2-combinations-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2025, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c4-2', type: 'problem', title: 'Toppings to leave off',
      body: 'From 9 toppings, you choose 7 to LEAVE OFF a pizza (order does not matter).',
      question: 'How many choices are there? (a whole number)',
      answer: 36, tolerance: 0.5, unit: 'choices', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 9, k: 7 },
      feedback: {
        correct: 'Right — C(9, 7) = C(9, 2) = 36. Leaving 7 off is the same as keeping 2.',
        incorrect: 'By symmetry C(9, 7) = C(9, 2) = 36.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [9, 7], slotId: 's2-combinations-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2026, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c5-1', type: 'problem', title: 'A larger team',
      body: 'A team of 4 is chosen from 9 players.',
      question: 'How many teams are possible? (a whole number)',
      answer: 126, tolerance: 0.5, unit: 'teams', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 9, k: 4 },
      feedback: {
        correct: 'Exactly — C(9, 4) = 126.',
        incorrect: 'Choose 4 of 9 without order: C(9, 4) = 126.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [9, 4], slotId: 's2-combinations-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2027, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c5-2', type: 'problem', title: 'Three from eleven',
      body: 'A team of 3 is chosen from 11 players.',
      question: 'How many teams are possible? (a whole number)',
      answer: 165, tolerance: 0.5, unit: 'teams', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 11, k: 3 },
      feedback: {
        correct: 'Right — C(11, 3) = 165.',
        incorrect: 'Choose 3 of 11 without order: C(11, 3) = 165.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [11, 3], slotId: 's2-combinations-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2028, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c6-1', type: 'problem', title: 'Four of twelve',
      body: 'Four desserts are chosen from a tray of 12 to sample.',
      question: 'How many selections are possible? (a whole number)',
      answer: 495, tolerance: 0.5, unit: 'selections', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 12, k: 4 },
      feedback: {
        correct: 'Right — C(12, 4) = 495.',
        incorrect: 'Choose 4 of 12 without order: C(12, 4) = 495.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [12, 4], slotId: 's2-combinations-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2029, createdAt: '2026-06-25T16:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-c6-2', type: 'problem', title: 'Six of eleven',
      body: 'Six films are chosen from 11 to screen at a festival.',
      question: 'How many selections are possible? (a whole number)',
      answer: 462, tolerance: 0.5, unit: 'selections', interaction: 'numeric',
      simulation: 'pascal', simConfig: { n: 11, k: 6 },
      feedback: {
        correct: 'Right — C(11, 6) = 462.',
        incorrect: 'Choose 6 of 11 without order: C(11, 6) = 462.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'combinations', args: [11, 6], slotId: 's2-combinations-s6',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2030, createdAt: '2026-06-25T16:20:00.000Z' },
  },

  // ---- s2-anagrams: arrangements-sim-matched variants (answers = multinomialArrangements(counts)) ----
  // Each simConfig mirrors the static multiset shape { multiset, groups, c0… } so the count-up
  // climbs to n!/(Π countᵢ!). Group sizes equal the kernel args; counts are exact (tolerance 0.5).
  {
    step: {
      id: 'gen-an2-1', type: 'problem', title: 'KEEP',
      body: 'Rearrange the letters of KEEP (two E’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 12, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 1, c1: 2, c2: 1 },
      feedback: {
        correct: 'Right — 4!/2! = 12. The two E’s are interchangeable.',
        incorrect: 'Divide out the repeated E’s: 4!/2! = 12.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [1, 2, 1], slotId: 's2-anagrams-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2031, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an2-2', type: 'problem', title: 'GEESE',
      body: 'Rearrange the letters of GEESE (three E’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 20, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 1, c1: 3, c2: 1 },
      feedback: {
        correct: 'Right — 5!/3! = 20. The three E’s shuffle among themselves.',
        incorrect: 'Divide out the three repeated E’s: 5!/3! = 20.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [1, 3, 1], slotId: 's2-anagrams-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2032, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an3-1', type: 'problem', title: 'RADAR',
      body: 'Rearrange the letters of RADAR (two R’s, two A’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 30, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 2, c1: 2, c2: 1 },
      feedback: {
        correct: 'Exactly — 5!/(2!·2!) = 30.',
        incorrect: 'Divide by both repeated pairs: 5!/(2!·2!) = 30.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [2, 2, 1], slotId: 's2-anagrams-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2033, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an3-2', type: 'problem', title: 'TSETSE',
      body: 'Rearrange the letters of TSETSE (two T’s, two S’s, two E’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 90, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 2, c1: 2, c2: 2 },
      feedback: {
        correct: 'Right — 6!/(2!·2!·2!) = 90. Three interchangeable pairs.',
        incorrect: 'Divide by each repeated pair: 6!/(2!·2!·2!) = 90.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [2, 2, 2], slotId: 's2-anagrams-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2034, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an4-1', type: 'problem', title: 'PEPPER',
      body: 'Rearrange the letters of PEPPER (three P’s, two E’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 60, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 3, c1: 2, c2: 1 },
      feedback: {
        correct: 'Right — 6!/(3!·2!) = 60.',
        incorrect: 'Divide by the P’s and E’s: 6!/(3!·2!) = 60.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [3, 2, 1], slotId: 's2-anagrams-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2035, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an4-2', type: 'problem', title: 'ALFALFA',
      body: 'Rearrange the letters of ALFALFA (three A’s, two L’s, two F’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 210, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 3, c1: 2, c2: 2 },
      feedback: {
        correct: 'Exactly — 7!/(3!·2!·2!) = 210.',
        incorrect: 'Divide by the A’s, L’s, and F’s: 7!/(3!·2!·2!) = 210.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [3, 2, 2], slotId: 's2-anagrams-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2036, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an5-1', type: 'problem', title: 'Three project teams',
      body: 'Eight interns are assigned to the Red, Green, and Blue teams of sizes 4, 2, and 2.',
      question: 'How many ways can the assignment be made? (a whole number)',
      answer: 420, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 4, c1: 2, c2: 2 },
      feedback: {
        correct: 'Exactly — 8!/(4!·2!·2!) = 420, the multinomial coefficient.',
        incorrect: 'Use the multinomial for labeled teams: 8!/(4!·2!·2!) = 420.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [4, 2, 2], slotId: 's2-anagrams-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2037, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an5-2', type: 'problem', title: 'Three departments',
      body: 'Ten new hires are split among the Sales (5), Support (3), and Ops (2) departments.',
      question: 'How many ways can the split be made? (a whole number)',
      answer: 2520, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 3, c0: 5, c1: 3, c2: 2 },
      feedback: {
        correct: 'Right — 10!/(5!·3!·2!) = 2,520, the multinomial coefficient.',
        incorrect: 'Use the multinomial: 10!/(5!·3!·2!) = 2,520.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [5, 3, 2], slotId: 's2-anagrams-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2038, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an6-1', type: 'problem', title: 'TENNESSEE',
      body: 'Rearrange the letters of TENNESSEE (four E’s, two N’s, two S’s).',
      question: 'How many distinct arrangements are there? (a whole number)',
      answer: 3780, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 4, c0: 1, c1: 4, c2: 2, c3: 2 },
      feedback: {
        correct: 'Right — 9!/(4!·2!·2!) = 3,780.',
        incorrect: 'Divide 9! by 4! (E), 2! (N), and 2! (S): 3,780.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [1, 4, 2, 2], slotId: 's2-anagrams-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2039, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-an6-2', type: 'problem', title: 'A beaded row',
      body: 'Ten beads are strung in a row: 3 red, 3 blue, 2 green, and 2 yellow (identical within each color).',
      question: 'How many distinct color arrangements are there? (a whole number)',
      answer: 25200, tolerance: 0.5, unit: 'arrangements', interaction: 'numeric',
      simulation: 'arrangements', simConfig: { multiset: 1, groups: 4, c0: 3, c1: 3, c2: 2, c3: 2 },
      feedback: {
        correct: 'Right — 10!/(3!·3!·2!·2!) = 25,200.',
        incorrect: 'Divide 10! by 3! (red), 3! (blue), 2! (green), 2! (yellow): 25,200.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'multinomialArrangements', args: [3, 3, 2, 2], slotId: 's2-anagrams-s6',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2040, createdAt: '2026-06-25T16:30:00.000Z' },
  },

  // ---- s2-stars-bars: starsBars-sim-matched variants (answers = starsAndBars(stars, boxes)) ----
  // simConfig mirrors the static { stars, boxes }; for "at least one" slots the stars are the
  // leftovers after pre-placing one per box, exactly as the static s3 does (5 → 2).
  {
    step: {
      id: 'gen-sb2-1', type: 'problem', title: 'Stickers to kids',
      body: '6 identical stickers are handed out to 3 children; a child may get none.',
      question: 'How many distributions are possible? (a whole number)',
      answer: 28, tolerance: 0.5, unit: 'distributions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 6, boxes: 3 },
      feedback: {
        correct: 'Right — C(6 + 3 − 1, 3 − 1) = C(8, 2) = 28.',
        incorrect: 'Stars and bars: C(8, 2) = 28.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [6, 3], slotId: 's2-stars-bars-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2041, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb2-2', type: 'problem', title: 'Candies to children',
      body: '4 identical candies are shared among 4 children; a child may get none.',
      question: 'How many distributions are possible? (a whole number)',
      answer: 35, tolerance: 0.5, unit: 'distributions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 4, boxes: 4 },
      feedback: {
        correct: 'Right — C(4 + 4 − 1, 4 − 1) = C(7, 3) = 35.',
        incorrect: 'Stars and bars with 3 dividers: C(7, 3) = 35.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [4, 4], slotId: 's2-stars-bars-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2042, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb3-1', type: 'problem', title: 'Everyone gets candy',
      body: '7 identical candies go to 3 children, but each child must get at least one.',
      question: 'How many distributions are possible? (a whole number)',
      answer: 15, tolerance: 0.5, unit: 'distributions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 4, boxes: 3 },
      feedback: {
        correct: 'Right — give one to each first, then share the remaining 4: C(4 + 2, 2) = 15.',
        incorrect: 'Hand out 1 each (uses 3), then distribute the leftover 4: C(6, 2) = 15.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [4, 3], slotId: 's2-stars-bars-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2043, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb3-2', type: 'problem', title: 'A pencil each, at least',
      body: '6 identical pencils go to 4 students, but each student must get at least one.',
      question: 'How many distributions are possible? (a whole number)',
      answer: 10, tolerance: 0.5, unit: 'distributions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 2, boxes: 4 },
      feedback: {
        correct: 'Exactly — give one to each first, then share the remaining 2: C(2 + 3, 3) = 10.',
        incorrect: 'Hand out 1 each (uses 4), then distribute the leftover 2: C(5, 3) = 10.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [2, 4], slotId: 's2-stars-bars-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2044, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb4-1', type: 'problem', title: 'An equation',
      body: 'Count the nonnegative integer solutions to x + y + z = 10.',
      question: 'How many solutions are there? (a whole number)',
      answer: 66, tolerance: 0.5, unit: 'solutions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 10, boxes: 3 },
      feedback: {
        correct: 'Right — C(10 + 2, 2) = C(12, 2) = 66.',
        incorrect: '3 variables, sum 10: C(12, 2) = 66.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [10, 3], slotId: 's2-stars-bars-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2045, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb4-2', type: 'problem', title: 'Four unknowns',
      body: 'Count the nonnegative integer solutions to w + x + y + z = 7.',
      question: 'How many solutions are there? (a whole number)',
      answer: 120, tolerance: 0.5, unit: 'solutions', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 7, boxes: 4 },
      feedback: {
        correct: 'Right — C(7 + 3, 3) = C(10, 3) = 120.',
        incorrect: '4 variables, sum 7: C(10, 3) = 120.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [7, 4], slotId: 's2-stars-bars-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2046, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb5-1', type: 'problem', title: 'Balls in boxes',
      body: '5 identical balls are placed into 4 distinct boxes (empties allowed).',
      question: 'How many placements are possible? (a whole number)',
      answer: 56, tolerance: 0.5, unit: 'placements', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 5, boxes: 4 },
      feedback: {
        correct: 'Exactly — C(5 + 3, 3) = C(8, 3) = 56.',
        incorrect: 'Stars and bars with 3 dividers: C(8, 3) = 56.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [5, 4], slotId: 's2-stars-bars-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2047, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb5-2', type: 'problem', title: 'Marbles in cups',
      body: '7 identical marbles are dropped into 3 distinct cups (empties allowed).',
      question: 'How many placements are possible? (a whole number)',
      answer: 36, tolerance: 0.5, unit: 'placements', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 7, boxes: 3 },
      feedback: {
        correct: 'Right — C(7 + 2, 2) = C(9, 2) = 36.',
        incorrect: 'Stars and bars with 2 dividers: C(9, 2) = 36.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [7, 3], slotId: 's2-stars-bars-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2048, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb6-1', type: 'problem', title: 'Coins to jars',
      body: '12 identical coins are split among 4 distinct jars (empties allowed).',
      question: 'How many ways are there? (a whole number)',
      answer: 455, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 12, boxes: 4 },
      feedback: {
        correct: 'Right — C(12 + 3, 3) = C(15, 3) = 455.',
        incorrect: 'Stars and bars: C(15, 3) = 455.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [12, 4], slotId: 's2-stars-bars-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2049, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-sb6-2', type: 'problem', title: 'Tokens to slots',
      body: '9 identical tokens are distributed among 5 distinct slots (empties allowed).',
      question: 'How many ways are there? (a whole number)',
      answer: 715, tolerance: 0.5, unit: 'ways', interaction: 'numeric',
      simulation: 'starsBars', simConfig: { stars: 9, boxes: 5 },
      feedback: {
        correct: 'Right — C(9 + 4, 4) = C(13, 4) = 715.',
        incorrect: 'Stars and bars with 4 dividers: C(13, 4) = 715.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'starsAndBars', args: [9, 5], slotId: 's2-stars-bars-s6',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2050, createdAt: '2026-06-25T16:30:00.000Z' },
  },

  // ---- s2-derangements: matching-sim-matched variants ----
  // metric 0 → P(no match) = derangementProbability(n); metric 1 → E[matches] = expectedFixedPoints(n) = 1.
  // simConfig mirrors the static { n, metric, trials }; n in config equals the kernel arg.
  {
    step: {
      id: 'gen-dr2-1', type: 'problem', title: 'Three envelopes',
      body: '3 letters are slipped into 3 addressed envelopes at random.',
      question: 'What is the probability that no letter lands in its own envelope? (decimal)',
      answer: 0.33333333333333337, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 3, metric: 0, trials: 5000 },
      feedback: {
        correct: 'Right — 1 − 1 + 1/2 − 1/6 = 1/3 ≈ 0.333.',
        incorrect: 'Alternating sum to n = 3: 1 − 1 + 1/2 − 1/6 = 1/3 ≈ 0.333.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [3], slotId: 's2-derangements-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2051, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr2-2', type: 'problem', title: 'Two gifts',
      body: 'Two friends each bring a wrapped gift; the two gifts are handed back at random.',
      question: 'What is the probability that neither friend gets their own gift? (decimal)',
      answer: 0.5, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 2, metric: 0, trials: 4000 },
      feedback: {
        correct: 'Right — with 2 items the only shuffles are keep-both or swap-both: 1 − 1 + 1/2 = 1/2.',
        incorrect: 'Either both match or neither does, so the no-match chance is 1/2.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [2], slotId: 's2-derangements-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2052, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr3-1', type: 'problem', title: 'Four coats',
      body: '4 coats are returned to their 4 owners at random.',
      question: 'What is the probability of no match? (decimal)',
      answer: 0.37500000000000006, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 4, metric: 0, trials: 6000 },
      feedback: {
        correct: 'Exactly — through n = 4 the sum is 0.375, already near 1/e.',
        incorrect: 'Continue the alternating sum to 1/4!: ≈ 0.375.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [4], slotId: 's2-derangements-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2053, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr3-2', type: 'problem', title: 'Five reports',
      body: '5 reports are emailed back to their 5 authors at random.',
      question: 'What is the probability that nobody receives their own report? (decimal)',
      answer: 0.3666666666666667, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 5, metric: 0, trials: 6000 },
      feedback: {
        correct: 'Right — the alternating sum through 1/5! is ≈ 0.367, essentially 1/e.',
        incorrect: 'Sum (−1)^i / i! up to i = 5: ≈ 0.367.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [5], slotId: 's2-derangements-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2054, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr4-1', type: 'problem', title: 'Expected matches (6)',
      body: 'With 6 gifts returned at random, count how many people get their OWN gift, on average.',
      question: 'What is the expected number of matches? (a number)',
      answer: 1, tolerance: 0.12, unit: 'matches', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 6, metric: 1, trials: 6000 },
      feedback: {
        correct: 'Right — exactly 1, no matter how many gifts. Each person matches with probability 1/n, across n people.',
        incorrect: 'By linearity, n people each match with probability 1/n, so the expected count is 1.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'expectedFixedPoints', args: [6], slotId: 's2-derangements-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2055, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr4-2', type: 'problem', title: 'Expected matches (8)',
      body: 'With 8 exams handed back at random, count how many students get their OWN exam, on average.',
      question: 'What is the expected number of matches? (a number)',
      answer: 1, tolerance: 0.12, unit: 'matches', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 8, metric: 1, trials: 8000 },
      feedback: {
        correct: 'Right — still exactly 1. The expected number of fixed points is 1 for every n.',
        incorrect: 'Each of the 8 students matches with probability 1/8; by linearity the expected count is 1.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'expectedFixedPoints', args: [8], slotId: 's2-derangements-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2056, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr5-1', type: 'problem', title: 'Six hats',
      body: '6 hats are returned to their owners at random.',
      question: 'What is the probability of no match? (decimal)',
      answer: 0.3680555555555556, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 6, metric: 0, trials: 8000 },
      feedback: {
        correct: 'Exactly — about 0.368, essentially 1/e. More hats barely changes it.',
        incorrect: 'The derangement probability has converged to 1/e ≈ 0.368.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [6], slotId: 's2-derangements-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2057, createdAt: '2026-06-25T16:30:00.000Z' },
  },
  {
    step: {
      id: 'gen-dr5-2', type: 'problem', title: 'Eight name tags',
      body: '8 name tags are handed back to their 8 owners at random.',
      question: 'What is the probability that no one gets their own name tag? (decimal)',
      answer: 0.3678819444444445, tolerance: 0.05, unit: 'probability', interaction: 'numeric',
      simulation: 'matching', simConfig: { n: 8, metric: 0, trials: 8000 },
      feedback: {
        correct: 'Exactly — ≈ 0.368, indistinguishable from 1/e. The probability has stopped moving.',
        incorrect: 'For n ≥ 4 the derangement probability sits at ≈ 0.368 = 1/e.',
      },
    },
    sectionId: 's2-combinatorics', kernel: 'derangementProbability', args: [8], slotId: 's2-derangements-s5',
    tier: 'amc', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 2058, createdAt: '2026-06-25T16:30:00.000Z' },
  },
];
