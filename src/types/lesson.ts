export type SimulationType =
  | 'coinFlip'
  | 'diceRoll'
  | 'galtonBoard'
  | 'expectedValue'
  | 'conditional'
  | 'montyHall'
  | 'randomWalk'
  | 'clt'
  | 'venn'
  | 'countingTree'
  | 'arrangements'
  | 'pascal'
  | 'starsBars'
  | 'matching'
  | 'urnTree'
  | 'bayesGrid'
  | 'expectedSteps'
  | 'scatter'
  | 'waitingTime'
  | 'poisson'
  | 'tailBound'
  | 'markov'
  | 'branching'
  | 'dartThrow'
  | 'buffon'
  | 'orderStats'
  | 'randomChord'
  | 'hypergeometric'
  | 'uniformLine'
  | 'blackjackEdge';

type StepType = 'concept' | 'problem';

/**
 * How the learner commits a prediction on a problem step:
 *   numeric — type a single number (the default, used by every original lesson)
 *   slider  — drag a marker along a labeled scale to commit a numeric value
 *   order   — drag a set of outcomes into a most→least-likely ranking
 *   draw    — sketch a distribution's bar heights before the truth is revealed
 *   wheel   — drag prize-wheel segment probabilities to hit a target expected value
 */
export type InteractionType = 'numeric' | 'slider' | 'order' | 'draw' | 'wheel';

interface StepFeedback {
  correct: string;
  incorrect: string;
}

/**
 * A section of a lecture (concept step). `text` may contain blank-line-separated
 * paragraphs; `formula` renders as a centered, monospaced display line.
 */
interface LectureSection {
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

  /** Prediction modality for problem steps; defaults to 'numeric' when omitted. */
  interaction?: InteractionType;
  /** order: the outcomes to rank (shown in this order before the learner sorts). */
  orderItems?: number[];
  /** order: the correct most→least-likely ranking, computed from probability.ts. */
  answerOrder?: number[];
  /** order: optional display text per item id (otherwise the id number is shown). */
  orderLabels?: Record<number, string>;
  /** draw: category labels for each bar the learner sketches. */
  drawCategories?: (number | string)[];
  /** draw: the true normalized distribution over those categories (sums to 1). */
  answerShape?: number[];

  /** slider: the scale the learner drags over (graded like numeric via `answer`/`tolerance`). */
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  /** wheel: fixed payouts; the learner sets each segment's probability to hit `answer` (target EV). */
  wheelPayouts?: number[];

  /**
   * The probability.ts kernel name + the exact numeric args that produced `answer`.
   * Carried through from the generated bank (or annotated on a template) so the
   * worked/completion breakdown can be derived term-by-term from the same function
   * the engine grades against (see `lib/worked.ts`). Optional everywhere.
   */
  kernel?: string;
  kernelArgs?: number[];
}

type LessonStatus = 'built' | 'coming-soon';

export interface Lesson {
  id: string;
  index: number;
  title: string;
  concept: string;
  status: LessonStatus;
  prerequisiteId: string | null;
  steps: LessonStep[];
  /** Which course section this lesson belongs to (assigned when the course is assembled). */
  sectionId?: string;
}

/**
 * A course section ("unit"). The canonical grouping + ordering the Course Home,
 * Unit pages, and section-grouped sidebar render from. `accent` is a chrome-only
 * color (never fed to the Canvas sims). `checkpointId`, when set, is the lesson
 * id of this unit's checkpoint quiz that gates the next unit.
 */
export interface CourseSection {
  id: string;
  index: number;
  title: string;
  blurb: string;
  accent: string;
  lessons: Lesson[];
  checkpointId?: string;
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

/**
 * A pretest (FR — pretesting / errorful generation): the learner's cold guess on
 * one representative problem, captured *before* the concept is taught on the very
 * first visit to a lesson. It is never graded toward mastery — it only powers the
 * "intuition vs. reality" reveal on the completion screen. `answer` is the
 * app-computed truth for the generated instance, snapshotted at capture time so
 * the reveal stays stable regardless of later regeneration.
 */
export interface PreTestRecord {
  stepId: string;
  question: string;
  /** The learner's numeric guess, or null when they chose "I'm not sure". */
  guess: number | null;
  answer: number;
  unit?: string;
  at: number;
}

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
  /** Stable per-learner base for generated questions. */
  seed?: number;
  /** Replay counter — advances the question pool each time the lesson is restarted. */
  attempt?: number;
  /**
   * How many times this lesson has been cleared (all green/yellow). Drives fading
   * scaffolding (FR-11.4): support is on while this is 0, then fades. Optional for
   * backward-compat — legacy records default to 0.
   */
  timesCleared?: number;
  /**
   * The learner's pretest guess from their first-ever visit (pretesting). Set once,
   * before the lesson teaches anything; surfaced on the completion screen as the
   * intuition-vs-reality reveal. Absent on legacy/replayed records.
   */
  preTest?: PreTestRecord | null;
}
