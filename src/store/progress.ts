import type { CourseSection, Lesson, LessonProgress, LessonState, ProblemResult } from '../types/lesson';
import type { ProgressMap, UserStats } from '../lib/storage';
import { gradableSteps, sections, getSectionForLesson } from '../content/lessons';
import { randomSeed } from '../lib/rng';

/** Local-time calendar day as YYYY-MM-DD (stable for streak comparisons). */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole-day difference between two YYYY-MM-DD keys (b - a). */
function dayDiff(a: string, b: string): number {
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
    ...stats,
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastActiveDay: today,
    totalDaysActive: stats.totalDaysActive + 1,
  };
}

/**
 * Add `delta` to the count of problems resolved on the local day containing
 * `now`. Always returns a new object (the per-day tally changes even when the
 * streak doesn't), keyed by the same YYYY-MM-DD `dayKey` the heatmap reads.
 */
export function bumpDailyActivity(stats: UserStats, now: number, delta = 1): UserStats {
  const key = dayKey(now);
  const dailyActivity = { ...(stats.dailyActivity ?? {}) };
  dailyActivity[key] = (dailyActivity[key] ?? 0) + delta;
  return { ...stats, dailyActivity };
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
    seed: randomSeed(),
    attempt: 0,
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

/** Built lessons in a section (coming-soon lessons don't count toward gating). */
function sectionBuiltLessons(section: CourseSection): Lesson[] {
  return section.lessons.filter((l) => l.status === 'built');
}

/**
 * A section is "cleared" when all of its built lessons are cleared and, if it has
 * a checkpoint quiz, that checkpoint is cleared too. Empty / coming-soon sections
 * (no built lessons) are treated as cleared so they never block the next unit.
 */
function sectionCleared(section: CourseSection, all: ProgressMap): boolean {
  const built = sectionBuiltLessons(section);
  if (built.length === 0) return true;
  if (!built.every((l) => isCleared(all[l.id]))) return false;
  if (section.checkpointId) return isCleared(all[section.checkpointId]);
  return true;
}

export type SectionState = 'locked' | 'available' | 'in-progress' | 'complete';

/**
 * Unit-gating: a section unlocks when every prior section is cleared (or with the
 * free-navigation toggle). Inside an unlocked section, all lessons are playable.
 */
export function sectionState(
  section: CourseSection,
  all: ProgressMap,
  unlockAll = false,
): SectionState {
  const idx = sections.findIndex((s) => s.id === section.id);
  const priorComplete = unlockAll || sections.slice(0, idx).every((s) => sectionCleared(s, all));
  if (!priorComplete) return 'locked';
  const built = sectionBuiltLessons(section);
  if (built.length > 0 && sectionCleared(section, all)) return 'complete';
  const started = built.some((l) => {
    const p = all[l.id];
    return p && (p.attempts > 0 || Object.keys(p.results ?? {}).length > 0);
  });
  return started ? 'in-progress' : 'available';
}

/** Fraction of a section's built lessons that are cleared (0..1). */
export function sectionProgressFraction(section: CourseSection, all: ProgressMap): number {
  const built = sectionBuiltLessons(section);
  if (built.length === 0) return 0;
  const cleared = built.filter((l) => isCleared(all[l.id])).length;
  return cleared / built.length;
}

/**
 * Lesson availability under unit-gating: a lesson is locked only when its section
 * is locked (or it is coming-soon). Within an unlocked section every lesson is
 * freely playable, in any order.
 */
export function lessonState(
  lesson: Lesson,
  all: ProgressMap,
  unlockAll = false,
): LessonState {
  if (lesson.status === 'coming-soon') return 'locked';
  const section = getSectionForLesson(lesson.id);
  if (section && sectionState(section, all, unlockAll) === 'locked') return 'locked';
  const p = all[lesson.id];
  if (p?.mastered) return 'mastered';
  if (p?.cleared) return 'cleared';
  if (p && (p.attempts > 0 || Object.keys(p.results ?? {}).length > 0)) return 'in-progress';
  return 'available';
}

export interface CourseStats {
  lessonsMastered: number;
  lessonsBuilt: number;
  problemsSolved: number;
  totalProblems: number;
  questionsAnswered: number;
  masteryFraction: number;
  /** Problems answered perfectly on the first try (green). */
  problemsGreen: number;
  /** Problems with any recorded result (green/yellow/red) — the first-try denominator. */
  problemsResolved: number;
}

/** Roll per-lesson progress up into the account-level numbers shown in the UI. */
export function courseStats(lessons: Lesson[], all: ProgressMap): CourseStats {
  let lessonsMastered = 0;
  let lessonsBuilt = 0;
  let problemsSolved = 0;
  let totalProblems = 0;
  let questionsAnswered = 0;
  let problemsGreen = 0;
  let problemsResolved = 0;
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    lessonsBuilt += 1;
    const problems = gradableSteps(lesson);
    totalProblems += problems.length;
    const p = all[lesson.id];
    if (!p) continue;
    if (p.mastered) lessonsMastered += 1;
    for (const s of problems) {
      const r = problemResult(p, s.id);
      if (r) problemsResolved += 1;
      if (r === 'green') problemsGreen += 1;
      if (r === 'green' || r === 'yellow') problemsSolved += 1;
    }
    questionsAnswered += p.attempts;
  }
  return {
    lessonsMastered,
    lessonsBuilt,
    problemsSolved,
    totalProblems,
    questionsAnswered,
    masteryFraction: totalProblems === 0 ? 0 : problemsSolved / totalProblems,
    problemsGreen,
    problemsResolved,
  };
}

/**
 * Cumulative fraction of all course problems solved after each lesson in order,
 * with a leading 0 so the sparkline starts at the origin. Monotonic and honest:
 * it rises as lessons are completed and plateaus where you haven't gone yet —
 * the same "climbs then stabilizes" shape as the brand mark.
 */
export function masteryCurve(lessons: Lesson[], all: ProgressMap): number[] {
  const built = lessons.filter((l) => l.status === 'built');
  let total = 0;
  for (const l of built) total += gradableSteps(l).length;
  const points = [0];
  if (total === 0) return points;
  let cumulative = 0;
  for (const lesson of built) {
    const p = all[lesson.id];
    for (const s of gradableSteps(lesson)) {
      const r = problemResult(p, s.id);
      if (r === 'green' || r === 'yellow') cumulative += 1;
    }
    points.push(cumulative / total);
  }
  return points;
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

/** True once every built lesson is cleared — the gate for unlocking the Final Test. */
export function allLessonsCleared(lessons: Lesson[], all: ProgressMap): boolean {
  const built = lessons.filter((l) => l.status === 'built');
  return built.length > 0 && built.every((l) => isCleared(all[l.id]));
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
