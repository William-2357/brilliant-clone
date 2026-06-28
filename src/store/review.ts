/**
 * Spaced repetition (PRD FR-11.1) — pure scheduling logic, a peer to
 * `progress.ts`. This module only decides *when* a mastered concept resurfaces in
 * Mixed Practice and *which* concepts are due; it never touches an answer (those
 * stay computed by `probability.ts`). State lives on `UserStats.review`, keyed by
 * `conceptId` (which equals the lessonId), so it persists through the existing
 * Backend/progress abstraction with no schema migration.
 */
import type { Lesson } from '../types/lesson';
import type { ProgressMap, ReviewState, UserStats } from '../lib/storage';
import { gradableSteps } from '../content/lessons';
import { isCleared } from './progress';

/** The interval ladder, in days. `intervalStep` indexes into this. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];

const DAY_MS = 86_400_000;
const MAX_STEP = REVIEW_INTERVALS_DAYS.length - 1;

/**
 * Compute the next schedule for a concept after a review attempt.
 *   correct → advance one rung up the ladder (capped at the last, 14d)
 *   wrong   → reset to the shortest rung (1d), to resurface soonest
 * A first-ever review (no `prev`) starts at the bottom rung on correct, so the
 * very first answer always creates the record. FR-11.1.
 */
export function scheduleAfterReview(
  prev: ReviewState | undefined,
  correct: boolean,
  now: number,
): ReviewState {
  // A missing record is "off the ladder" (step -1); the first correct answer
  // advances onto the first rung (step 0 = 1 day).
  const prevStep = prev?.intervalStep ?? -1;
  const intervalStep = correct ? Math.min(prevStep + 1, MAX_STEP) : 0;
  return {
    intervalStep,
    nextReviewAt: now + REVIEW_INTERVALS_DAYS[intervalStep] * DAY_MS,
    lastReviewedAt: now,
  };
}

/** A built lesson the learner has cleared/mastered — the only review-eligible content. */
function reviewEligible(lessons: Lesson[], all: ProgressMap): Lesson[] {
  return lessons.filter(
    (l) => l.status === 'built' && gradableSteps(l).length > 0 && isCleared(all[l.id]),
  );
}

/**
 * How overdue a concept is, in ms. A never-reviewed (but eligible) concept is
 * treated as maximally overdue so first reviews sort to the front.
 */
function overdueBy(r: ReviewState | undefined, now: number): number {
  return r ? now - r.nextReviewAt : Number.POSITIVE_INFINITY;
}

/**
 * Mastered concepts that are due for review now — those with no review record yet
 * (first-time review) OR whose `nextReviewAt <= now` — sorted most-overdue first.
 * Mastery-gated: only ever returns lessons the learner has already cleared.
 */
export function dueConcepts(
  stats: UserStats,
  lessons: Lesson[],
  all: ProgressMap,
  now: number,
): Lesson[] {
  const review = stats.review ?? {};
  const due = reviewEligible(lessons, all).filter((l) => {
    const r = review[l.id];
    return !r || r.nextReviewAt <= now;
  });
  return due.sort((a, b) => {
    const oa = overdueBy(review[a.id], now);
    const ob = overdueBy(review[b.id], now);
    return oa === ob ? 0 : ob - oa;
  });
}

/** Count of concepts due for review now — for the Home/Profile/nav badge. */
export function dueCount(
  stats: UserStats,
  lessons: Lesson[],
  all: ProgressMap,
  now: number,
): number {
  return dueConcepts(stats, lessons, all, now).length;
}

/** A snapshot of review health for the "show the effect" measurement surfaces. */
export interface ReviewSummary {
  /** Total cleared/mastered concepts (review-eligible). */
  eligible: number;
  /** Concepts due for review right now (includes never-reviewed ones). */
  due: number;
  /** Concepts with a scheduled future review. */
  scheduled: number;
  /** How many reviewed concepts currently sit on each interval rung. */
  buckets: number[];
}

/**
 * Roll the review schedule up into the counts the Profile/Home memory-strength
 * readouts render: how many concepts are due, how many are scheduled, and the
 * distribution of reviewed concepts across the 1d/3d/7d/14d rungs.
 */
export function reviewSummary(
  stats: UserStats,
  lessons: Lesson[],
  all: ProgressMap,
  now: number,
): ReviewSummary {
  const review = stats.review ?? {};
  const eligible = reviewEligible(lessons, all);
  const buckets = REVIEW_INTERVALS_DAYS.map(() => 0);
  let due = 0;
  let scheduled = 0;
  for (const l of eligible) {
    const r = review[l.id];
    if (!r || r.nextReviewAt <= now) due += 1;
    if (r) {
      const step = Math.max(0, Math.min(MAX_STEP, r.intervalStep));
      buckets[step] += 1;
      if (r.nextReviewAt > now) scheduled += 1;
    }
  }
  return { eligible: eligible.length, due, scheduled, buckets };
}
