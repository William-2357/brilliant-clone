import type { Lesson } from '../types/lesson';
import {
  VENN_REGION_ORDER,
  vennProb,
  additionRule,
  inclusionExclusion3,
  type VennRegion,
  type VennCounts,
} from '../lib/probability';

/** Index of a Venn region in the sim's numeric `region` config slot. */
const R = (r: VennRegion) => VENN_REGION_ORDER.indexOf(r);

/** Shared scenario: 30 students, A = plays an instrument, B = plays a sport. */
const club: VennCounts = { aOnly: 8, bOnly: 10, both: 6, neither: 6 };
const clubCfg = { aOnly: club.aOnly, bOnly: club.bOnly, both: club.both, neither: club.neither };

/** Disjoint scenario for the addition rule (no overlap). */
const disjoint: VennCounts = { aOnly: 9, bOnly: 6, both: 0, neither: 15 };
/** Overlapping scenario for the addition rule. */
const overlap: VennCounts = { aOnly: 8, bOnly: 7, both: 5, neither: 10 };

export const foundationsLessons: Lesson[] = [
  {
    id: 's1-set-algebra',
    index: 0,
    title: 'Sample Space & Set Algebra',
    concept: 'Events as sets of outcomes',
    status: 'built',
    prerequisiteId: null,
    steps: [
      {
        id: 's1-set-algebra-s1',
        type: 'concept',
        title: 'Outcomes, events, and their algebra',
        body: 'Every chance experiment has a sample space — the set of all possible outcomes. An event is just a subset of that space. Drag through the Venn diagram: each dot is one equally-likely outcome, and the highlighted region is the event we are measuring.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('and'), trials: 400 },
        lecture: [
          {
            heading: 'Sample space and events',
            text: 'The sample space $\\Omega$ is the set of all outcomes of an experiment. An event is any subset $A \\subseteq \\Omega$. When every outcome is equally likely, the probability of an event is the share of outcomes it contains.',
            formula: 'P(A) = \\frac{|A|}{|\\Omega|}',
          },
          {
            heading: 'Combining events',
            text: 'From two events $A$ and $B$ we build new ones: the union $A \\cup B$ ("$A$ or $B$"), the intersection $A \\cap B$ ("$A$ and $B$"), and the complement $A^c$ ("not $A$"). Two events are mutually exclusive (disjoint) when they cannot both happen, $A \\cap B = \\varnothing$.',
            formula: 'A \\cup B,\\quad A \\cap B,\\quad A^c',
          },
          {
            heading: 'The complement rule',
            text: 'Every outcome is either in $A$ or in $A^c$, never both, so their probabilities must add to one. Subtracting from one is often the fastest route to "at least one" questions.',
            formula: 'P(A^c) = 1 - P(A)',
          },
          {
            heading: 'De Morgan’s laws',
            text: 'Negation swaps union and intersection: "not (A or B)" is the same region as "not A and not B". Reading a complicated event through its complement frequently simplifies it.',
            formula: '(A \\cup B)^c = A^c \\cap B^c',
          },
          {
            heading: 'Common mistake',
            text: 'The word "or" in probability is inclusive: $A \\cup B$ includes the overlap where both happen. Counting that overlap twice is the classic error the addition rule fixes.',
          },
        ],
      },
      {
        id: 's1-set-algebra-s2',
        type: 'problem',
        title: 'Probability of an event',
        body: 'In a class of 30 students, 14 play an instrument (event A) and 16 play a sport (event B); 6 do both. Each student is equally likely to be picked.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('a'), trials: 900 },
        question: 'What is P(A), the probability a random student plays an instrument? (decimal)',
        answer: vennProb(club, 'a'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Exactly — 14 of 30 students play an instrument, so P(A) = 14/30 ≈ 0.467.',
          incorrect: 'Count every student in circle A (instrument-only plus both) over 30: 14/30 ≈ 0.467.',
        },
      },
      {
        id: 's1-set-algebra-s3',
        type: 'problem',
        title: 'The overlap',
        body: 'Same class of 30. The intersection A ∩ B is the students who do both.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('and'), trials: 900 },
        question: 'What is P(A ∩ B), the probability a student plays both? (decimal)',
        answer: vennProb(club, 'and'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Right — 6 of 30 sit in the overlap, so P(A ∩ B) = 0.2.',
          incorrect: 'Only the lens where the circles overlap counts: 6/30 = 0.2.',
        },
      },
      {
        id: 's1-set-algebra-s4',
        type: 'problem',
        title: 'The complement',
        body: 'Same class. Now consider the students who do NOT play an instrument.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('notA'), trials: 900 },
        question: 'What is P(Aᶜ)? (decimal)',
        answer: vennProb(club, 'notA'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Exactly — P(Aᶜ) = 1 − 14/30 = 16/30 ≈ 0.533. Subtracting from one is quickest.',
          incorrect: 'Use the complement rule: 1 − P(A) = 1 − 14/30 = 16/30 ≈ 0.533.',
        },
      },
      {
        id: 's1-set-algebra-s5',
        type: 'problem',
        title: 'Only one of the two',
        body: 'Same class. Consider students who play an instrument but NOT a sport — the part of A outside the overlap.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('aOnly'), trials: 900 },
        question: 'What is P(A only) = P(A) − P(A ∩ B)? (decimal)',
        answer: vennProb(club, 'aOnly'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Right — 8 of 30 play only an instrument: 8/30 ≈ 0.267.',
          incorrect: 'Strip the overlap from A: P(A) − P(A ∩ B) = 14/30 − 6/30 = 8/30 ≈ 0.267.',
        },
      },
      {
        id: 's1-set-algebra-s6',
        type: 'problem',
        title: 'De Morgan check',
        body: 'Same class. The event (A ∪ B)ᶜ is everyone outside both circles — students who do neither.',
        simulation: 'venn',
        simConfig: { ...clubCfg, region: R('neither'), trials: 900 },
        question: 'What is P((A ∪ B)ᶜ)? (decimal)',
        answer: vennProb(club, 'neither'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Exactly — 6 of 30 do neither, so P((A ∪ B)ᶜ) = 0.2 = P(Aᶜ ∩ Bᶜ), just as De Morgan says.',
          incorrect: 'By De Morgan, (A ∪ B)ᶜ is "neither" — the 6 outside both circles: 6/30 = 0.2.',
        },
      },
    ],
  },
  {
    id: 's1-addition-rule',
    index: 0,
    title: 'Addition Rule & Inclusion–Exclusion',
    concept: 'Unions without double-counting',
    status: 'built',
    prerequisiteId: null,
    steps: [
      {
        id: 's1-addition-rule-s1',
        type: 'concept',
        title: 'Add the parts, subtract the overlap',
        body: 'To find the chance that A or B happens, you add their probabilities — but if you stop there you count the overlap twice. Sample the union in the Venn diagram and watch the fraction settle on the corrected total.',
        simulation: 'venn',
        simConfig: { ...{ aOnly: overlap.aOnly, bOnly: overlap.bOnly, both: overlap.both, neither: overlap.neither }, region: R('or'), trials: 400 },
        lecture: [
          {
            heading: 'The addition rule',
            text: 'For any two events, the probability of their union is the sum of their probabilities minus the probability of their intersection. The subtraction removes the overlap that both $P(A)$ and $P(B)$ include.',
            formula: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
          },
          {
            heading: 'Disjoint events',
            text: 'When $A$ and $B$ are mutually exclusive the overlap is empty, so the rule collapses to plain addition. This special case is the only time "just add them" is correct.',
            formula: 'A \\cap B = \\varnothing \\;\\Rightarrow\\; P(A \\cup B) = P(A) + P(B)',
          },
          {
            heading: 'Three events',
            text: 'With three events you add the singles, subtract every pairwise overlap, then add back the triple overlap you removed one time too many. This alternating pattern is inclusion–exclusion.',
            formula: 'P(A\\cup B\\cup C)=\\textstyle\\sum P(A)-\\sum P(A\\cap B)+P(A\\cap B\\cap C)',
          },
          {
            heading: 'Common mistake',
            text: 'Adding probabilities directly only works for disjoint events. Whenever events can co-occur, forgetting the $-P(A\\cap B)$ term overcounts the union.',
          },
        ],
      },
      {
        id: 's1-addition-rule-s2',
        type: 'problem',
        title: 'Disjoint union',
        body: 'A class of 30: 9 students are in band only, 6 are on a team only, and the two groups never overlap (the rest do neither).',
        simulation: 'venn',
        simConfig: { aOnly: disjoint.aOnly, bOnly: disjoint.bOnly, both: disjoint.both, neither: disjoint.neither, region: R('or'), trials: 900 },
        question: 'What is P(A ∪ B), the chance a student is in band or on a team? (decimal)',
        answer: vennProb(disjoint, 'or'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Right — no overlap, so just add: 9/30 + 6/30 = 15/30 = 0.5.',
          incorrect: 'They are disjoint, so P(A ∪ B) = P(A) + P(B) = 9/30 + 6/30 = 0.5.',
        },
      },
      {
        id: 's1-addition-rule-s3',
        type: 'problem',
        title: 'Union with an overlap',
        body: 'Now a class of 30 where 13 play an instrument (A) and 12 play a sport (B), and 5 do both.',
        simulation: 'venn',
        simConfig: { aOnly: overlap.aOnly, bOnly: overlap.bOnly, both: overlap.both, neither: overlap.neither, region: R('or'), trials: 900 },
        question: 'What is P(A ∪ B)? (decimal)',
        answer: vennProb(overlap, 'or'),
        tolerance: 0.04,
        unit: 'probability',
        feedback: {
          correct: 'Exactly — 13/30 + 12/30 − 5/30 = 20/30 ≈ 0.667. The overlap is subtracted once.',
          incorrect: 'Apply the addition rule: 13/30 + 12/30 − 5/30 = 20/30 ≈ 0.667.',
        },
      },
      {
        id: 's1-addition-rule-s4',
        type: 'problem',
        title: 'At least one',
        body: 'A fair card is drawn. P(heart) = 13/52, P(face card) = 12/52, and P(heart and face) = 3/52.',
        question: 'What is the probability the card is a heart OR a face card? (decimal)',
        answer: additionRule(13 / 52, 12 / 52, 3 / 52),
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: 'Right — 13/52 + 12/52 − 3/52 = 22/52 ≈ 0.423. Subtract the 3 cards counted twice.',
          incorrect: 'Do not double-count the 3 face-hearts: 13/52 + 12/52 − 3/52 = 22/52 ≈ 0.423.',
        },
      },
      {
        id: 's1-addition-rule-s5',
        type: 'problem',
        title: 'Three events',
        body: 'Three promotions overlap: P(A)=0.5, P(B)=0.4, P(C)=0.3, P(A∩B)=0.2, P(A∩C)=0.15, P(B∩C)=0.1, and P(A∩B∩C)=0.05.',
        question: 'What is P(A ∪ B ∪ C)? (decimal)',
        answer: inclusionExclusion3(0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05),
        tolerance: 0.02,
        unit: 'probability',
        feedback: {
          correct: 'Exactly — 0.5+0.4+0.3 − 0.2−0.15−0.1 + 0.05 = 0.8. Add singles, subtract pairs, add the triple.',
          incorrect: 'Inclusion–exclusion: singles (1.2) − pairs (0.45) + triple (0.05) = 0.8.',
        },
      },
    ],
  },
];
