import type { Lesson, LessonProgress, LessonState, ProblemResult } from '../types/lesson';
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
    cleared: false,
    attempts: 0,
    wrongStreak: 0,
    currentStepId: firstStepId,
    results: {},
    completedProblemIds: [],
    completedAt: null,
    lastVisited: null,
  };
}

/**
 * Read a question's stored color. Falls back to treating legacy
 * `completedProblemIds` entries (from the old infinite-retry model) as green.
 */
export function problemResult(
  progress: LessonProgress | undefined,
  stepId: string,
): ProblemResult | undefined {
  if (!progress) return undefined;
  const direct = progress.results?.[stepId];
  if (direct) return direct;
  if (progress.completedProblemIds?.includes(stepId)) return 'green';
  return undefined;
}

/** A lesson is cleared when every gradable question is green or yellow (no reds). */
export function computeCleared(lesson: Lesson, progress: LessonProgress): boolean {
  const problems = gradableSteps(lesson);
  if (problems.length === 0) return false;
  return problems.every((p) => {
    const r = problemResult(progress, p.id);
    return r === 'green' || r === 'yellow';
  });
}

/** A lesson is mastered when every gradable question is green (perfect run). */
export function computeMastered(lesson: Lesson, progress: LessonProgress): boolean {
  const problems = gradableSteps(lesson);
  if (problems.length === 0) return false;
  return problems.every((p) => problemResult(progress, p.id) === 'green');
}

/** True once every gradable question has a recorded result (green/yellow/red). */
export function allQuestionsResolved(lesson: Lesson, progress: LessonProgress | undefined): boolean {
  const problems = gradableSteps(lesson);
  if (problems.length === 0) return false;
  return problems.every((p) => problemResult(progress, p.id) !== undefined);
}

/** Cleared, tolerant of legacy progress where only `mastered` was stored. */
export function isCleared(p: LessonProgress | undefined): boolean {
  return p?.cleared === true || p?.mastered === true;
}

export function lessonState(
  lesson: Lesson,
  all: ProgressMap,
  unlockAll = false,
): LessonState {
  if (lesson.status === 'coming-soon') return 'locked';
  const prereqCleared =
    unlockAll ||
    lesson.prerequisiteId === null ||
    isCleared(all[lesson.prerequisiteId]);
  if (!prereqCleared) return 'locked';
  const p = all[lesson.id];
  if (p?.mastered) return 'mastered';
  if (p?.cleared) return 'cleared';
  if (p && (p.attempts > 0 || Object.keys(p.results ?? {}).length > 0)) return 'in-progress';
  return 'available';
}

export function isLessonUnlocked(lesson: Lesson, all: ProgressMap, unlockAll = false): boolean {
  return lessonState(lesson, all, unlockAll) !== 'locked';
}

export interface CourseStats {
  lessonsMastered: number;
  lessonsBuilt: number;
  problemsSolved: number;
  totalProblems: number;
  questionsAnswered: number;
  masteryFraction: number;
}

/** Roll per-lesson progress up into the account-level numbers shown in the UI. */
export function courseStats(lessons: Lesson[], all: ProgressMap): CourseStats {
  let lessonsMastered = 0;
  let lessonsBuilt = 0;
  let problemsSolved = 0;
  let totalProblems = 0;
  let questionsAnswered = 0;
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    lessonsBuilt += 1;
    const problems = gradableSteps(lesson);
    totalProblems += problems.length;
    const p = all[lesson.id];
    if (!p) continue;
    if (p.mastered) lessonsMastered += 1;
    problemsSolved += problems.filter((s) => {
      const r = problemResult(p, s.id);
      return r === 'green' || r === 'yellow';
    }).length;
    questionsAnswered += p.attempts;
  }
  return {
    lessonsMastered,
    lessonsBuilt,
    problemsSolved,
    totalProblems,
    questionsAnswered,
    masteryFraction: totalProblems === 0 ? 0 : problemsSolved / totalProblems,
  };
}

/** Fraction of a single lesson's gradable questions that are green or yellow (0..1). */
export function lessonProgressFraction(lesson: Lesson, all: ProgressMap): number {
  const problems = gradableSteps(lesson);
  if (problems.length === 0) return 0;
  const p = all[lesson.id];
  if (!p) return 0;
  const solved = problems.filter((s) => {
    const r = problemResult(p, s.id);
    return r === 'green' || r === 'yellow';
  }).length;
  return solved / problems.length;
}

/** First un-cleared, unlocked, built lesson — the sensible "next" recommendation. */
export function recommendNext(lessons: Lesson[], all: ProgressMap): Lesson | null {
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    if (lessonState(lesson, all) === 'locked') continue;
    if (!isCleared(all[lesson.id])) return lesson;
  }
  return null;
}
