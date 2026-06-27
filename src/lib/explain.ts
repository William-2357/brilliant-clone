/**
 * Wrong-answer explanation (PRD FR-9.2). When a learner answers a lesson problem or
 * the Problem of the Day incorrectly, the app can ask the model to explain *why* —
 * grounded in the correct answer the app already computed (the model must treat that
 * answer as the source of truth and never assert a different number). It only ever
 * REPLACES the author's hand-written incorrect feedback when an AI backend is
 * connected and the toggle is on; otherwise the hand-written text stands.
 *
 * This is the structured, serializable payload sent to the server (the same
 * `VITE_COACH_ENDPOINT` Worker the blackjack coach uses, routed by `kind`).
 */
export interface ExplainInput {
  /** Where the problem came from, for tone/context. */
  surface: 'lesson' | 'daily';
  /** Lesson/concept the problem teaches. */
  topic: string;
  /** The problem prompt the learner saw (body + question). */
  question: string;
  /** Interaction modality: 'numeric' | 'slider' | 'order' | 'draw' | 'wheel'. */
  interaction: string;
  /** Human label for the answer's unit (e.g. 'probability', 'count'). */
  unit?: string;
  /** What the learner actually answered, formatted for reading. */
  learnerAnswer: string;
  /** The correct answer (app-computed) — ground truth the model must not contradict. */
  correctAnswer: string;
  /** Acceptance tolerance, if numeric. */
  tolerance?: number;
  /** The author's hand-written incorrect-answer feedback (grounding + fallback). */
  authorHint: string;
}
