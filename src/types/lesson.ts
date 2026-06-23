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

export type LessonState = 'locked' | 'available' | 'in-progress' | 'mastered';

export interface LessonProgress {
  mastered: boolean;
  attempts: number;
  wrongStreak: number;
  currentStepId: string;
  completedProblemIds: string[];
  completedAt: number | null;
  lastVisited: number | null;
}
