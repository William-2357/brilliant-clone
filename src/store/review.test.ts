import { describe, it, expect } from 'vitest';
import {
  REVIEW_INTERVALS_DAYS,
  scheduleAfterReview,
  dueConcepts,
  dueCount,
  reviewSummary,
} from './review';
import type { Lesson, LessonProgress, ProblemResult } from '../types/lesson';
import type { ProgressMap, ReviewState, UserStats } from '../lib/storage';
import { emptyStats } from '../lib/storage';
import { lessons } from '../content/lessons';

const DAY_MS = 86_400_000;
const NOW = 1_700_000_000_000;

/** A minimal cleared/mastered LessonProgress so `isCleared` returns true. */
function clearedProgress(stepIds: string[]): LessonProgress {
  const results: Record<string, ProblemResult> = {};
  for (const id of stepIds) results[id] = 'green';
  return {
    mastered: true,
    cleared: true,
    attempts: stepIds.length,
    wrongStreak: 0,
    currentStepId: stepIds[0] ?? '',
    results,
    completedProblemIds: stepIds,
    completedAt: NOW,
    lastVisited: NOW,
  };
}

/** Clear the first `n` built lessons so they become review-eligible. */
function progressWithClearedLessons(n: number): { all: ProgressMap; cleared: Lesson[] } {
  const built = lessons.filter((l) => l.status === 'built').slice(0, n);
  const all: ProgressMap = {};
  for (const l of built) all[l.id] = clearedProgress(l.steps.filter((s) => s.type === 'problem').map((s) => s.id));
  return { all, cleared: built };
}

function statsWithReview(review: Record<string, ReviewState>): UserStats {
  return { ...emptyStats(), review };
}

describe('scheduleAfterReview — the interval ladder', () => {
  it('a first correct review lands on the shortest rung and creates the record', () => {
    const next = scheduleAfterReview(undefined, true, NOW);
    expect(next.intervalStep).toBe(0);
    expect(next.nextReviewAt).toBe(NOW + REVIEW_INTERVALS_DAYS[0] * DAY_MS);
    expect(next.lastReviewedAt).toBe(NOW);
  });

  it('consecutive correct reviews advance 1d → 3d → 7d → 14d', () => {
    let state = scheduleAfterReview(undefined, true, NOW); // step 0 (1d)
    const seen: number[] = [REVIEW_INTERVALS_DAYS[state.intervalStep]];
    for (let i = 0; i < 3; i++) {
      state = scheduleAfterReview(state, true, NOW);
      seen.push(REVIEW_INTERVALS_DAYS[state.intervalStep]);
    }
    expect(seen).toEqual([1, 3, 7, 14]);
  });

  it('caps at the longest interval (14d) on further correct reviews', () => {
    let state: ReviewState = { intervalStep: REVIEW_INTERVALS_DAYS.length - 1, nextReviewAt: NOW, lastReviewedAt: NOW };
    state = scheduleAfterReview(state, true, NOW);
    expect(state.intervalStep).toBe(REVIEW_INTERVALS_DAYS.length - 1);
    expect(state.nextReviewAt).toBe(NOW + 14 * DAY_MS);
  });

  it('a wrong review resets to the shortest rung (1d) from any step', () => {
    const high: ReviewState = { intervalStep: 3, nextReviewAt: NOW + 14 * DAY_MS, lastReviewedAt: NOW };
    const reset = scheduleAfterReview(high, false, NOW);
    expect(reset.intervalStep).toBe(0);
    expect(reset.nextReviewAt).toBe(NOW + 1 * DAY_MS);
  });
});

describe('dueConcepts — eligibility and ordering', () => {
  it('returns nothing when no lessons are cleared', () => {
    expect(dueConcepts(emptyStats(), lessons, {}, NOW)).toEqual([]);
    expect(dueCount(emptyStats(), lessons, {}, NOW)).toBe(0);
  });

  it('treats a cleared concept with no review record as due now', () => {
    const { all, cleared } = progressWithClearedLessons(3);
    const due = dueConcepts(emptyStats(), lessons, all, NOW);
    expect(due.length).toBe(3);
    expect(new Set(due.map((l) => l.id))).toEqual(new Set(cleared.map((l) => l.id)));
  });

  it('excludes concepts scheduled in the future and includes past-due ones', () => {
    const { all, cleared } = progressWithClearedLessons(3);
    const [a, b, c] = cleared;
    const review: Record<string, ReviewState> = {
      [a.id]: { intervalStep: 1, nextReviewAt: NOW + 2 * DAY_MS, lastReviewedAt: NOW }, // future → not due
      [b.id]: { intervalStep: 1, nextReviewAt: NOW - 2 * DAY_MS, lastReviewedAt: NOW }, // past → due
      // c has no record → due now
    };
    const due = dueConcepts(statsWithReview(review), lessons, all, NOW);
    const ids = due.map((l) => l.id);
    expect(ids).not.toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).toContain(c.id);
  });

  it('sorts most-overdue first, with never-reviewed concepts ahead of merely-late ones', () => {
    const { all, cleared } = progressWithClearedLessons(3);
    const [a, b, c] = cleared;
    const review: Record<string, ReviewState> = {
      [a.id]: { intervalStep: 1, nextReviewAt: NOW - 1 * DAY_MS, lastReviewedAt: NOW }, // a bit late
      [b.id]: { intervalStep: 1, nextReviewAt: NOW - 5 * DAY_MS, lastReviewedAt: NOW }, // very late
      // c: never reviewed → most overdue (infinite)
    };
    const order = dueConcepts(statsWithReview(review), lessons, all, NOW).map((l) => l.id);
    expect(order).toEqual([c.id, b.id, a.id]);
  });
});

describe('reviewSummary — measurement', () => {
  it('counts eligible, due, scheduled, and bucket distribution', () => {
    const { all, cleared } = progressWithClearedLessons(3);
    const [a, b] = cleared; // the third cleared lesson is never reviewed → due, no bucket
    const review: Record<string, ReviewState> = {
      [a.id]: { intervalStep: 0, nextReviewAt: NOW + 1 * DAY_MS, lastReviewedAt: NOW }, // scheduled, rung 0
      [b.id]: { intervalStep: 2, nextReviewAt: NOW + 7 * DAY_MS, lastReviewedAt: NOW }, // scheduled, rung 2
    };
    const s = reviewSummary(statsWithReview(review), lessons, all, NOW);
    expect(s.eligible).toBe(3);
    expect(s.due).toBe(1); // only c
    expect(s.scheduled).toBe(2); // a and b
    expect(s.buckets[0]).toBe(1);
    expect(s.buckets[2]).toBe(1);
    expect(s.buckets.reduce((x, y) => x + y, 0)).toBe(2);
  });
});
