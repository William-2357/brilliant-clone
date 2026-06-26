import type { GeneratedProblem } from './index';

// l9-clt: CLT-sim-matched variants. dieMean() = 3.5 (center); standardError(dieSD(), m)
// = 1.7078/√m (spread). simConfig.m matches the kernel arg so the sim converges.
export const limitProblems: GeneratedProblem[] = [
  {
    step: {
      id: 'gen-l9s2-1', type: 'problem', title: 'Center of the bell',
      body: 'In a stats class, many groups each roll a fair six-sided die 8 times and report their group’s average roll. The averages pile into a distribution of their own.',
      question: 'Where is this distribution of sample means centered? (a value from 1 to 6)',
      answer: 3.5, tolerance: 0.2, unit: 'value', interaction: 'numeric',
      simulation: 'clt', simConfig: { parent: 0, m: 8, samples: 600 },
      feedback: {
        correct: 'Right — averaging is unbiased, so the bell centers on the die’s mean, 3.5, for any sample size.',
        incorrect: 'The sample mean shares the die’s mean: (1+2+3+4+5+6)/6 = 3.5.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'dieMean', args: [], slotId: 'l9-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 921, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s2-2', type: 'problem', title: 'Where the averages sit',
      body: 'A game studio stress-tests a dice mechanic by averaging 12 fair-die rolls per trial across thousands of trials.',
      question: 'Where is the distribution of those averages centered? (a value from 1 to 6)',
      answer: 3.5, tolerance: 0.2, unit: 'value', interaction: 'slider',
      sliderMin: 1, sliderMax: 6, sliderStep: 0.1,
      simulation: 'clt', simConfig: { parent: 0, m: 12, samples: 600 },
      feedback: {
        correct: 'Right — the bell of averages centers on the die’s mean, 3.5, regardless of sample size.',
        incorrect: 'Averaging is unbiased: the center stays at the die’s mean, 3.5.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'dieMean', args: [], slotId: 'l9-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 922, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s3-1', type: 'problem', title: 'Samples of nine',
      body: 'A casino auditor samples 9 fair-die rolls at a time and records the mean, again and again. A single fair die has standard deviation about 1.71.',
      question: 'What is the standard error (the SD of the sample mean) for samples of 9? (decimal)',
      answer: 0.569275042553311, tolerance: 0.04, unit: 'standard error', interaction: 'numeric',
      simulation: 'clt', simConfig: { parent: 0, m: 9, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √9 ≈ 0.569. Larger samples give a narrower bell.',
        incorrect: 'Standard error = σ/√m = 1.71/√9 ≈ 0.569.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [9], slotId: 'l9-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 931, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s3-2', type: 'problem', title: 'Samples of sixteen',
      body: 'A teacher simulates 16 fair-die rolls per student and collects every student’s average; a single die has SD about 1.71.',
      question: 'What is the standard error for samples of 16? (decimal)',
      answer: 0.42695628191498325, tolerance: 0.04, unit: 'standard error', interaction: 'slider',
      sliderMin: 0, sliderMax: 2, sliderStep: 0.02,
      simulation: 'clt', simConfig: { parent: 0, m: 16, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √16 ≈ 0.427.',
        incorrect: 'Standard error = σ/√m = 1.71/√16 ≈ 0.427.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [16], slotId: 'l9-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 932, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s4-1', type: 'problem', title: 'Samples of thirty-six',
      body: 'A dice-fairness study computes the mean of 36 rolls per run, logging the result over thousands of runs; a single die has SD about 1.71.',
      question: 'What is the standard error for samples of 36? (decimal)',
      answer: 0.2846375212766555, tolerance: 0.04, unit: 'standard error', interaction: 'numeric',
      simulation: 'clt', simConfig: { parent: 0, m: 36, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √36 ≈ 0.285.',
        incorrect: 'Standard error = σ/√m = 1.71/√36 ≈ 0.285.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [36], slotId: 'l9-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 941, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s4-2', type: 'problem', title: 'Samples of sixty-four',
      body: 'A tabletop RPG resolves an action by averaging 64 fair-die rolls; the table repeats this across thousands of encounters. A single die has SD about 1.71.',
      question: 'What is the standard error for samples of 64? (decimal)',
      answer: 0.21347814095749162, tolerance: 0.04, unit: 'standard error', interaction: 'numeric',
      simulation: 'clt', simConfig: { parent: 0, m: 64, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √64 ≈ 0.213.',
        incorrect: 'Standard error = σ/√m = 1.71/√64 ≈ 0.213.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [64], slotId: 'l9-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 942, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s5-1', type: 'problem', title: 'Just four rolls',
      body: 'A board-game designer rolls a fair six-sided die 4 times and writes down the average pips, then repeats the whole experiment thousands of times. A single die has SD about 1.71.',
      question: 'What is the standard error for samples of 4? (decimal)',
      answer: 0.8539125638299665, tolerance: 0.04, unit: 'standard error', interaction: 'numeric',
      simulation: 'clt', simConfig: { parent: 0, m: 4, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √4 ≈ 0.854. Small samples give a wide bell.',
        incorrect: 'Standard error = σ/√m = 1.71/√4 ≈ 0.854.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [4], slotId: 'l9-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 951, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s5-2', type: 'problem', title: 'Nine again',
      body: 'A teacher simulates 9 fair-die rolls per group and collects every group’s average across the class; a single die has SD about 1.71.',
      question: 'What is the standard error for samples of 9? (decimal)',
      answer: 0.569275042553311, tolerance: 0.04, unit: 'standard error', interaction: 'slider',
      sliderMin: 0, sliderMax: 2, sliderStep: 0.02,
      simulation: 'clt', simConfig: { parent: 0, m: 9, samples: 600 },
      feedback: {
        correct: 'Exactly — 1.71 / √9 ≈ 0.569.',
        incorrect: 'Standard error = σ/√m = 1.71/√9 ≈ 0.569.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'standardError', args: [9], slotId: 'l9-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 952, createdAt: '2026-06-25T15:44:00.000Z' },
  },
  {
    step: {
      id: 'gen-l9s6-1', type: 'problem', title: 'Sketch the bell of averages',
      body: 'A teacher has the class compute the average of 10 fair-die rolls, over and over. A flat die turns into a bell.',
      question: 'Sketch the distribution of the sample mean (averages of 10 rolls), then run it to compare.',
      interaction: 'draw',
      drawCategories: [1.3, 1.8, 2.3, 2.8, 3.3, 3.8, 4.3, 4.8, 5.3, 5.8],
      answerShape: [0.000016554709859608128, 0.0014639093432996326, 0.023767469601517387, 0.13125592728073296, 0.30714973607724094, 0.3313781741382157, 0.16597370073477113, 0.036104548764585354, 0.0028403152201984796, 0.00004966412957882438],
      tolerance: 0.18, unit: 'shape',
      simulation: 'clt', simConfig: { parent: 0, m: 10, samples: 600 },
      feedback: {
        correct: 'Beautiful — a bell centered on 3.5 (SE ≈ 0.54). The CLT in action.',
        incorrect: 'The averages pile into a bell centered on 3.5 — not flat.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'dieMean', args: [], slotId: 'l9-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 961, createdAt: '2026-06-25T15:44:00.000Z' },
  },

  // ===================== s6-empirical-rule =====================
  // Within ±k SD = normalCdf(k) − normalCdf(−k); tails = normalTwoTail(k);
  // z = zScore(x, μ, σ); percentile = normalCdf(z). No sim (matches static).
  {
    step: {
      id: 'gen-er2-1', type: 'problem', title: 'The central band',
      body: 'Resting heart rates across a large, healthy population are roughly normal.',
      question: 'What fraction of people fall within 1 standard deviation of the mean? (decimal)',
      answer: 0.6826894723352726, tolerance: 0.03, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — the μ ± σ band is the empirical rule’s innermost tier, holding the bulk of any roughly normal data.',
        incorrect: 'Use the empirical rule’s first tier: the share of a normal that lands within one SD of the mean.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalWithin', args: [1], slotId: 's6-empirical-rule-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6201, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er2-2', type: 'problem', title: 'One SD either way',
      body: 'Daily high temperatures in a city follow a roughly normal pattern across a season.',
      question: 'What fraction of days land between one SD below and one SD above the mean? (decimal)',
      answer: 0.6826894723352726, tolerance: 0.03, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Exactly — μ ± σ brackets the central chunk every roughly normal sample shares.',
        incorrect: 'The empirical rule fixes the μ ± σ band: it captures the same central fraction for any normal.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalWithin', args: [1], slotId: 's6-empirical-rule-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6202, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er3-1', type: 'problem', title: 'Two SD wide',
      body: 'Cereal-box fill weights from a packaging line are roughly normal.',
      question: 'What fraction of boxes fall within 2 standard deviations of the mean? (decimal)',
      answer: 0.9544998742254873, tolerance: 0.03, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — widen the band to two SD and it sweeps up nearly all of a normal.',
        incorrect: 'The empirical rule’s second tier covers the μ ± 2σ band — almost the whole distribution.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalWithin', args: [2], slotId: 's6-empirical-rule-s3',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6211, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er3-2', type: 'problem', title: 'Inside μ ± 2σ',
      body: 'Scores on a standardized exam are scaled to be roughly normal.',
      question: 'What fraction of test-takers score within 2 SD of the mean? (decimal)',
      answer: 0.9544998742254873, tolerance: 0.03, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Yes — two SD on each side leaves only thin tails outside.',
        incorrect: 'Within μ ± 2σ a normal keeps almost everything; only slim tails remain.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalWithin', args: [2], slotId: 's6-empirical-rule-s3',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6212, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er4-1', type: 'problem', title: 'Out in the tails',
      body: 'A machined part’s diameter is roughly normal around its target.',
      question: 'What fraction of parts fall MORE than 2 SD from the mean (either side)? (decimal)',
      answer: 0.04550012577451268, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — that sliver is what is left in both tails once the μ ± 2σ band is removed.',
        incorrect: 'Take the complement of the two-SD band; the remainder is split across the two tails.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [2], slotId: 's6-empirical-rule-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6221, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er4-2', type: 'problem', title: 'Beyond two SD',
      body: 'Commute times on a stable route are roughly normal.',
      question: 'What fraction of commutes are more than 2 SD from the mean in either direction? (decimal)',
      answer: 0.04550012577451268, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Exactly — the two tails past μ ± 2σ hold only a thin remainder.',
        incorrect: 'Subtract the central two-SD band from 1; what is left sits out in the two tails.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [2], slotId: 's6-empirical-rule-s4',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6222, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er5-1', type: 'problem', title: 'Standardize the value',
      body: 'An espresso machine pours shots that are roughly normal with mean 150 mL and standard deviation 8 mL. One shot comes out at 162 mL.',
      question: 'How many standard deviations above the mean is that shot? (its z-score)',
      answer: 1.5, tolerance: 0.05, unit: 'z', interaction: 'numeric',
      feedback: {
        correct: 'Right — subtract the mean and divide by the SD; a positive z means above average.',
        incorrect: 'Standardize: z = (x − μ)/σ. Here x sits above the mean, so z comes out positive.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'zScore', args: [162, 150, 8], slotId: 's6-empirical-rule-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6231, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er5-2', type: 'problem', title: 'How many SDs out?',
      body: 'Daily loaf sales at a bakery are roughly normal with mean 250 and standard deviation 40. On a festival day the bakery sells 330.',
      question: 'What is the z-score of that festival day? (a number)',
      answer: 2, tolerance: 0.05, unit: 'z', interaction: 'numeric',
      feedback: {
        correct: 'Exactly — center by the mean, scale by the SD; the festival day lands well above average.',
        incorrect: 'z = (x − μ)/σ converts the raw count into standard-deviation units.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'zScore', args: [330, 250, 40], slotId: 's6-empirical-rule-s5',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6232, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er6-1', type: 'problem', title: 'A percentile',
      body: 'A value sits exactly 1 standard deviation above the mean of a roughly normal distribution.',
      question: 'What fraction of values fall below it? (decimal)',
      answer: 0.8413447361676363, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — Φ at one SD above the mean is the area to its left, well past the halfway mark.',
        incorrect: 'You want Φ at z = 1: the cumulative area lying to the left of one SD above the mean.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalCdf', args: [1], slotId: 's6-empirical-rule-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6241, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-er6-2', type: 'problem', title: 'Below 1.5 SD up',
      body: 'A measurement sits 1.5 standard deviations above the mean of a roughly normal distribution.',
      question: 'What fraction of values fall below it? (decimal)',
      answer: 0.9331927690234977, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      feedback: {
        correct: 'Right — push the cutoff further right and the area to its left grows toward the upper reaches.',
        incorrect: 'Read Φ at z = 1.5: the cumulative share of the normal lying to the left of that point.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalCdf', args: [1.5], slotId: 's6-empirical-rule-s6',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6242, createdAt: '2026-06-25T20:20:00.000Z' },
  },

  // ===================== s6-normal-approx =====================
  // Match Binomial(n,p) by a normal (μ=np, σ=√(np(1−p))) with a half-unit
  // continuity correction. No sim (matches static).
  {
    step: {
      id: 'gen-na2-1', type: 'problem', title: 'At most 16 defects',
      body: 'On a run of 200 parts, each is independently defective with probability 0.10 (n = 200, p = 0.10): mean 20, SD √18 ≈ 4.24.',
      question: 'Approximate P(at most 16 defective) using the normal. (decimal)',
      answer: 0.20469768923302006, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — center at np, scale by √(np(1−p)), add the +0.5 continuity bump, then read Φ.',
        incorrect: 'Standardize 16 with a half-unit correction: read Φ at (16.5 − 20) / 4.24.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtMost', args: [200, 0.1, 16], slotId: 's6-normal-approx-s2',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6301, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na2-2', type: 'problem', title: 'At most 112 made',
      body: 'A free-throw shooter hits each attempt independently with probability 0.80 over 150 attempts (n = 150, p = 0.80): mean 120, SD √24 ≈ 4.90.',
      question: 'Approximate P(at most 112 made) using the normal. (decimal)',
      answer: 0.06289323296793459, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — match the mean and SD, widen 112 by half a unit, then read Φ at that z.',
        incorrect: 'Standardize 112 with a +0.5 correction: read Φ at (112.5 − 120) / 4.90.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtMost', args: [150, 0.8, 112], slotId: 's6-normal-approx-s2',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6302, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na3-1', type: 'problem', title: 'A central band',
      body: '256 fair coin flips (n = 256, p = 0.5): mean 128, SD 8.',
      question: 'Approximate P(120 ≤ heads ≤ 136). (decimal)',
      answer: 0.7119911767469138, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — push the upper edge out by +0.5 and the lower edge by −0.5, then subtract the two Φ values.',
        incorrect: 'Use Φ((136.5 − 128)/8) − Φ((119.5 − 128)/8): widen both ends before reading Φ.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialBetween', args: [256, 0.5, 120, 136], slotId: 's6-normal-approx-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6311, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na3-2', type: 'problem', title: 'Approvers in a band',
      body: 'In a survey of 300 people, each independently approves with probability 0.60 (n = 300, p = 0.60): mean 180, SD √72 ≈ 8.49.',
      question: 'Approximate P(170 ≤ approvers ≤ 190). (decimal)',
      answer: 0.7840749250094134, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — widen the band by half a unit on each side, then subtract the two Φ values.',
        incorrect: 'Compute Φ((190.5 − 180)/8.49) − Φ((169.5 − 180)/8.49) with the continuity correction.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialBetween', args: [300, 0.6, 170, 190], slotId: 's6-normal-approx-s3',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6312, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na4-1', type: 'problem', title: 'An upper tail',
      body: '100 fair coin flips (n = 100, p = 0.5): mean 50, SD 5.',
      question: 'Approximate P(at least 60 heads). (decimal)',
      answer: 0.028716493915579067, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — for an at-least count, start the cutoff at 59.5 and take the upper area, 1 − Φ.',
        incorrect: 'P(K ≥ 60) = 1 − Φ((59.5 − 50)/5): subtract half a unit, then take the upper tail.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtLeast', args: [100, 0.5, 60], slotId: 's6-normal-approx-s4',
    tier: 'mc-chapter', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6321, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na4-2', type: 'problem', title: 'At least 60 buyers',
      body: 'Of 250 visitors, each independently buys with probability 0.20 (n = 250, p = 0.20): mean 50, SD √40 ≈ 6.32.',
      question: 'Approximate P(at least 60 buyers). (decimal)',
      answer: 0.06653800995556058, tolerance: 0.02, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — for an at-least count, set the cutoff at 59.5 and take the upper area, 1 − Φ.',
        incorrect: 'P(K ≥ 60) = 1 − Φ((59.5 − 50)/6.32): half-unit correction, then the upper tail.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtLeast', args: [250, 0.2, 60], slotId: 's6-normal-approx-s4',
    tier: 'mc-chapter', difficulty: 4,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6322, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na5-1', type: 'problem', title: 'More flips, tighter fit',
      body: '400 fair flips (n = 400, p = 0.5): mean 200, SD 10.',
      question: 'Approximate P(at most 190 heads). (decimal)',
      answer: 0.17105611648992441, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — more trials sharpen the fit; widen 190 by half a unit and read Φ.',
        incorrect: 'Standardize 190 with a +0.5 correction: read Φ at (190.5 − 200)/10.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtMost', args: [400, 0.5, 190], slotId: 's6-normal-approx-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6331, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-na5-2', type: 'problem', title: 'Nine hundred flips',
      body: '900 fair flips (n = 900, p = 0.5): mean 450, SD 15.',
      question: 'Approximate P(at most 430 heads). (decimal)',
      answer: 0.09680055242003593, tolerance: 0.03, unit: 'probability', interaction: 'numeric',
      feedback: {
        correct: 'Right — with so many trials the normal hugs the binomial; widen 430 by half a unit and read Φ.',
        incorrect: 'Standardize 430 with a +0.5 correction: read Φ at (430.5 − 450)/15.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalApproxBinomialAtMost', args: [900, 0.5, 430], slotId: 's6-normal-approx-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6332, createdAt: '2026-06-25T20:20:00.000Z' },
  },

  // ===================== s6-chebyshev =====================
  // Bound = chebyshevBound(k) = 1/k² (no sim). Actual normal tails =
  // normalTwoTail(k), verified by the tailBound sim (simConfig.k matches the arg).
  {
    step: {
      id: 'gen-cb2-1', type: 'problem', title: 'The bound at k = 2',
      body: 'Apply Chebyshev with k = 2 standard deviations, knowing nothing about the distribution’s shape.',
      question: 'What is the Chebyshev upper bound on P(|X − μ| ≥ 2σ)? (decimal)',
      answer: 0.25, tolerance: 0.02, unit: 'bound', interaction: 'numeric',
      feedback: {
        correct: 'Right — square the number of SDs and invert; that reciprocal is Chebyshev’s universal cap.',
        incorrect: 'Chebyshev caps it at 1/k²: square the number of standard deviations and take the reciprocal.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'chebyshevBound', args: [2], slotId: 's6-chebyshev-s2',
    tier: 'school', difficulty: 1,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6401, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb2-2', type: 'problem', title: 'The bound at k = 2.5',
      body: 'Apply Chebyshev with k = 2.5 standard deviations for an unknown distribution.',
      question: 'What is the Chebyshev upper bound on P(|X − μ| ≥ 2.5σ)? (decimal)',
      answer: 0.16, tolerance: 0.02, unit: 'bound', interaction: 'numeric',
      feedback: {
        correct: 'Right — the same 1/k² rule applies at any k: square it and invert.',
        incorrect: 'The cap is 1/k²: square the number of standard deviations and take the reciprocal.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'chebyshevBound', args: [2.5], slotId: 's6-chebyshev-s2',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6402, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb3-1', type: 'problem', title: 'The bound at k = 3',
      body: 'Apply Chebyshev with k = 3 for a distribution of unknown shape.',
      question: 'What is the Chebyshev bound on P(|X − μ| ≥ 3σ)? (decimal)',
      answer: 0.1111111111111111, tolerance: 0.02, unit: 'bound', interaction: 'numeric',
      feedback: {
        correct: 'Right — square the number of SDs and invert; the cap shrinks fast as k grows.',
        incorrect: 'The bound is 1/k²: square the number of standard deviations and take the reciprocal.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'chebyshevBound', args: [3], slotId: 's6-chebyshev-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6411, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb3-2', type: 'problem', title: 'The bound at k = 4',
      body: 'Apply Chebyshev with k = 4 for a distribution whose shape you do not know.',
      question: 'What is the Chebyshev bound on P(|X − μ| ≥ 4σ)? (decimal)',
      answer: 0.0625, tolerance: 0.02, unit: 'bound', interaction: 'numeric',
      feedback: {
        correct: 'Right — at four SD the 1/k² cap is already tiny, yet still holds for every distribution.',
        incorrect: 'The bound is 1/k²: square the number of standard deviations and take the reciprocal.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'chebyshevBound', args: [4], slotId: 's6-chebyshev-s3',
    tier: 'mc-school', difficulty: 2,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6412, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb4-1', type: 'problem', title: 'The actual normal tail',
      body: 'Now sample a standard normal and look beyond ±2 SD.',
      question: 'What fraction of a normal lies beyond 2 SD? (decimal)',
      answer: 0.04550012577451268, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      simulation: 'tailBound', simConfig: { k: 2, trials: 8000 },
      feedback: {
        correct: 'Right — the true normal tail past 2 SD is a small fraction, far under Chebyshev’s loose cap.',
        incorrect: 'For a normal the share beyond ±2 SD is the two-tail area — much thinner than the 1/k² bound.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [2], slotId: 's6-chebyshev-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6421, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb4-2', type: 'problem', title: 'The normal tail at 2.5 SD',
      body: 'Sample a standard normal and look beyond ±2.5 SD.',
      question: 'What fraction of a normal lies beyond 2.5 SD? (decimal)',
      answer: 0.01241936022287593, tolerance: 0.02, unit: 'fraction', interaction: 'numeric',
      simulation: 'tailBound', simConfig: { k: 2.5, trials: 12000 },
      feedback: {
        correct: 'Right — the real two-tail area shrinks quickly, leaving Chebyshev’s cap far above it.',
        incorrect: 'For a normal the share beyond ±2.5 SD is the two-tail area — well below the 1/k² bound.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [2.5], slotId: 's6-chebyshev-s4',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6422, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb5-1', type: 'problem', title: 'Beyond three SD',
      body: 'Sample a standard normal and look beyond ±3 SD.',
      question: 'What fraction of a normal lies beyond 3 SD? (decimal)',
      answer: 0.0026999345626295135, tolerance: 0.01, unit: 'fraction', interaction: 'numeric',
      simulation: 'tailBound', simConfig: { k: 3, trials: 20000 },
      feedback: {
        correct: 'Right — only a tiny fraction strays past 3 SD, the famous leftover of the 99.7% band.',
        incorrect: 'The normal keeps almost everything within 3 SD; the two-tail remainder is tiny.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [3], slotId: 's6-chebyshev-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6431, createdAt: '2026-06-25T20:20:00.000Z' },
  },
  {
    step: {
      id: 'gen-cb5-2', type: 'problem', title: 'The far tail',
      body: 'Sample a standard normal again and watch the region beyond ±3 SD.',
      question: 'What fraction of a normal lies more than 3 SD from the mean? (decimal)',
      answer: 0.0026999345626295135, tolerance: 0.01, unit: 'fraction', interaction: 'numeric',
      simulation: 'tailBound', simConfig: { k: 3, trials: 24000 },
      feedback: {
        correct: 'Right — beyond 3 SD a normal holds almost nothing, dwarfed by Chebyshev’s bound.',
        incorrect: 'For a normal the two tails past ±3 SD carry only a sliver of the probability.',
      },
    },
    sectionId: 's6-limit-theorems', kernel: 'normalTwoTail', args: [3], slotId: 's6-chebyshev-s5',
    tier: 'mc-chapter', difficulty: 3,
    provenance: { model: 'claude-opus-4.8 (in-chat)', seed: 6432, createdAt: '2026-06-25T20:20:00.000Z' },
  },
];
