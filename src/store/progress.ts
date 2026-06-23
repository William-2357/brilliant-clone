import type { Lesson, LessonProgress, LessonState } from '../types/lesson';
import type { ProgressMap, UserStats } from '../lib/storage';
import { gradableSteps } from '../content/lessons';

/** Local-time calendar day as YYYY-MM-DD (stable for streak comparisons). */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole-day difference between two YYYY-MM-DD keys (b - a). */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / 86400000);
}

/**
 * Fold a new active timestamp into the streak. Same day → unchanged; the very
 * next day → streak grows; any larger gap → streak resets to 1.
 */
export function recordActiveDay(stats: UserStats, now: number): UserStats {
  const today = dayKey(now);
  if (stats.lastActiveDay === today) return stats;
  let currentStreak = 1;
  if (stats.lastActiveDay) {
    const gap = dayDiff(stats.lastActiveDay, today);
    currentStreak = gap === 1 ? stats.currentStreak + 1 : 1;
  }
  return {
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastActiveDay: today,
    totalDaysActive: stats.totalDaysActive + 1,
  };
}

export function initialProgress(firstStepId: string): LessonProgress {
  return {
    mastered: false,
    attempts: 0,
    wrongStreak: 0,
    currentStepId: firstStepId,
    completedProblemIds: [],
    completedAt: null,
    lastVisited: null,
  };
}

/** A lesson is mastered when every gradable problem has been answered correctly. */
export function computeMastered(lesson: Lesson, progress: LessonProgress): boolean {
  const problems = gradableSteps(lesson);
  if (problems.length === 0) return false;
  return problems.every((p) => progress.completedProblemIds.includes(p.id));
}

export function lessonState(
  lesson: Lesson,
  all: ProgressMap,
  unlockAll = false,
): LessonState {
  if (lesson.status === 'coming-soon') return 'locked';
  const prereqMastered =
    unlockAll ||
    lesson.prerequisiteId === null ||
    all[lesson.prerequisiteId]?.mastered === true;
  if (!prereqMastered) return 'locked';
  const p = all[lesson.id];
  if (p?.mastered) return 'mastered';
  if (p && (p.attempts > 0 || p.completedProblemIds.length > 0)) return 'in-progress';
  return 'available';
}

export function isLessonUnlocked(lesson: Lesson, all: ProgressMap, unlockAll = false): boolean {
  return lessonState(lesson, all, unlockAll) !== 'locked';
}

/** First non-mastered, unlocked, built lesson — the sensible "next" recommendation. */
export function recommendNext(lessons: Lesson[], all: ProgressMap): Lesson | null {
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    if (lessonState(lesson, all) === 'locked') continue;
    if (!all[lesson.id]?.mastered) return lesson;
  }
  return null;
}
