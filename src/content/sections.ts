/**
 * Canonical course structure. This is the single source of truth for how lessons
 * are grouped into sections ("units") and the order they appear in. `lessons.ts`
 * resolves each `lessonIds` entry to its authored Lesson object and derives the
 * flat `lessons` array (with global `index` + chained `prerequisiteId`) from this.
 *
 * To add a lesson: author it in `lessons.ts`, then add its id to the right
 * section's `lessonIds` here. To add a section: add an entry in curriculum order.
 *
 * `accent` is a CHROME-ONLY color (unit cards, sidebar headers, icon tint). It is
 * never read by the Canvas simulations, which use the shared `--accent*` tokens.
 */
export interface SectionDef {
  id: string;
  index: number;
  title: string;
  blurb: string;
  accent: string;
  lessonIds: string[];
  /** Lesson id of this unit's checkpoint quiz (set when checkpoints are authored). */
  checkpointId?: string;
}

export const sectionDefs: SectionDef[] = [
  {
    id: 's1-foundations',
    index: 1,
    title: 'Foundations',
    blurb: 'What probability means, and the rules every later idea is built on.',
    accent: '#1d9e75',
    lessonIds: ['l1-coin-flip', 's1-set-algebra', 's1-addition-rule'],
  },
  {
    id: 's2-combinatorics',
    index: 2,
    title: 'Counting & Combinatorics',
    blurb: 'The art of counting outcomes — the engine behind discrete probability.',
    accent: '#7c3aed',
    lessonIds: [
      's2-multiplication',
      's2-permutations',
      's2-combinations',
      's2-anagrams',
      's2-stars-bars',
      's2-derangements',
    ],
  },
  {
    id: 's3-conditional',
    index: 3,
    title: 'Conditional Probability',
    blurb: 'How information and dependence reshape the odds.',
    accent: '#2563eb',
    lessonIds: [
      'l2-dice-roll',
      'l6-conditional',
      's3-total-probability',
      's3-bayes',
      'l7-monty-hall',
    ],
  },
  {
    id: 's4-expectation',
    index: 4,
    title: 'Random Variables & Expectation',
    blurb: 'Turning outcomes into numbers, then summarizing them with center and spread.',
    accent: '#d97706',
    lessonIds: [
      'l5-expected-value',
      's4-variance',
      's4-indicators',
      's4-first-step',
      's4-correlation',
    ],
  },
  {
    id: 's5-distributions',
    index: 5,
    title: 'Named Distributions',
    blurb: 'The standard models of chance and when each one applies.',
    accent: '#0891b2',
    lessonIds: [
      'l3-galton-board',
      's5-geometric',
      's5-poisson',
      's5-hypergeometric',
      's5-continuous-uniform',
    ],
  },
  {
    id: 's6-limit-theorems',
    index: 6,
    title: 'Limit Theorems',
    blurb: 'Why averages and sums become predictable and bell-shaped at scale.',
    accent: '#db2777',
    lessonIds: ['l9-clt', 's6-empirical-rule', 's6-normal-approx', 's6-chebyshev'],
  },
  {
    id: 's7-stochastic',
    index: 7,
    title: 'Stochastic Processes',
    blurb: 'Randomness that unfolds over time.',
    accent: '#16a34a',
    lessonIds: ['l8-random-walk', 's7-gamblers-ruin', 's7-markov', 's7-branching'],
  },
  {
    id: 's8-geometric',
    index: 8,
    title: 'Geometric Probability',
    blurb: 'Probability over continuous space — lengths, areas, and chance.',
    accent: '#ea580c',
    lessonIds: ['s8-area-ratio', 's8-buffon', 's8-bertrand', 's8-order-stats'],
  },
];
