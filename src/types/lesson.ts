export type SimulationType =
  | 'coinFlip'
  | 'diceRoll'
  | 'galtonBoard'
  | 'birthday'
  | 'expectedValue'
  | 'conditional'
  | 'montyHall';

export type StepType = 'concept' | 'problem';

export interface StepFeedback {
  correct: string;
  incorrect: string;
}

/**
 * A section of a lecture (concept step). `text` may contain blank-line-separated
 * paragraphs; `formula` renders as a centered, monospaced display line.
 */
export interface LectureSection {
  heading?: string;
  text: string;
  formula?: string;
}

/**
 * A single step in a lesson. `concept` steps teach and let the learner explore a
 * simulation freely. `problem` steps are the gradable predict-then-verify moments:
 * the learner commits a numeric prediction, the simulation runs, and feedback
 * compares prediction vs. the app-computed truth.
 */
export interface LessonStep {
  id: string;
  type: StepType;
  title: string;
  body: string;
  simulation?: SimulationType;
  /** Parameters handed to the simulation (e.g. { flips: 1000 } or { rows: 12 }). */
  simConfig?: Record<string, number>;
  /** Detailed lecture body for concept steps (rendered after `body`). */
  lecture?: LectureSection[];
  question?: string;
  /** App-computed correct value. Never authored by hand for derived quantities. */
  answer?: number;
  tolerance?: number;
  /** Human label for the expected answer, e.g. "fraction" or "probability". */
  unit?: string;
  feedback?: StepFeedback;
}

export type LessonStatus = 'built' | 'coming-soon';

export interface Lesson {
  id: string;
  index: number;
  title: string;
  concept: string;
  status: LessonStatus;
  prerequisiteId: string | null;
  steps: LessonStep[];
}

export type LessonState = 'locked' | 'available' | 'in-progress' | 'cleared' | 'mastered';

/**
 * Per-question outcome under the two-attempt grading rule:
 *   green  = correct on the first try
 *   yellow = wrong once, then correct (counts as "not mastered")
 *   red    = wrong on both tries
 * A lesson is *cleared* (unlocks the next) when every question is green or yellow,
 * and *mastered* when every question is green.
 */
export type ProblemResult = 'green' | 'yellow' | 'red';

export interface LessonProgress {
  /** True when every gradable question is green (a perfect run). */
  mastered: boolean;
  /** True when every gradable question is green or yellow (no reds left). */
  cleared: boolean;
  attempts: number;
  wrongStreak: number;
  currentStepId: string;
  /** Per-question outcome, keyed by step id. */
  results: Record<string, ProblemResult>;
  /** Ids of questions that are green or yellow (i.e. eventually correct). */
  completedProblemIds: string[];
  completedAt: number | null;
  lastVisited: number | null;
}
