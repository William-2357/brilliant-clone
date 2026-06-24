import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { backend } from '../lib/backend';
import type { ProgressMap, UserStats } from '../lib/storage';
import { emptyStats } from '../lib/storage';
import type { Lesson, LessonProgress, LessonStep, ProblemResult } from '../types/lesson';
import { useAuth } from './useAuth';
import {
  computeCleared,
  computeMastered,
  initialProgress,
  recordActiveDay,
  bumpDailyActivity,
} from '../store/progress';

interface RecordResult {
  progress: LessonProgress;
  masteredNow: boolean;
  clearedNow: boolean;
  /** True when the question just resolved to red (wrong on both tries). */
  triggerReview: boolean;
}

interface ProgressContextValue {
  all: ProgressMap;
  loaded: boolean;
  stats: UserStats;
  get(lessonId: string): LessonProgress | undefined;
  ensureStarted(lesson: Lesson): LessonProgress;
  setCurrentStep(lessonId: string, stepId: string): void;
  recordResult(lesson: Lesson, step: LessonStep, result: ProblemResult): RecordResult;
  /** Wipe a lesson's question results so it can be replayed from scratch. */
  resetLessonResults(lesson: Lesson): void;
  /** Mark today's Problem of the Day as solved — advances the daily streak. */
  recordPotdSolved(): void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<UserStats>(emptyStats);
  const allRef = useRef<ProgressMap>({});
  const statsRef = useRef<UserStats>(emptyStats());

  useEffect(() => {
    allRef.current = all;
  }, [all]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    let active = true;
    if (!user) {
      allRef.current = {};
      statsRef.current = emptyStats();
      /* eslint-disable react-hooks/set-state-in-effect */
      setAll({});
      setStats(emptyStats());
      setLoaded(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    Promise.all([backend.progress.load(user.uid), backend.progress.loadStats(user.uid)]).then(
      ([map, loadedStats]) => {
        if (!active) return;
        allRef.current = map;
        statsRef.current = loadedStats;
        setAll(map);
        setStats(loadedStats);
        setLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, [user]);

  function persist(lessonId: string, next: LessonProgress) {
    const merged = { ...allRef.current, [lessonId]: next };
    allRef.current = merged;
    setAll(merged);
    if (user) void backend.progress.saveLesson(user.uid, lessonId, next);
  }

  /** Persist a new stats object (no-op when nothing changed). */
  function commitStats(next: UserStats) {
    if (next === statsRef.current) return;
    statsRef.current = next;
    setStats(next);
    if (user) void backend.progress.saveStats(user.uid, next);
  }

  /**
   * Count `problemDelta` resolved problems toward today's activity-heatmap tally.
   * This no longer touches the day streak — the streak is driven solely by the
   * Problem of the Day (see `recordPotdSolved`).
   */
  function recordActivity(problemDelta = 0) {
    if (problemDelta <= 0) return;
    commitStats(bumpDailyActivity(statsRef.current, Date.now(), problemDelta));
  }

  const value = useMemo<ProgressContextValue>(() => {
    return {
      all,
      loaded,
      stats,
      get: (lessonId) => allRef.current[lessonId],
      ensureStarted: (lesson) => {
        const existing = allRef.current[lesson.id];
        if (existing) return existing;
        const fresh = initialProgress(lesson.steps[0]?.id ?? '');
        fresh.lastVisited = Date.now();
        persist(lesson.id, fresh);
        return fresh;
      },
      setCurrentStep: (lessonId, stepId) => {
        const existing = allRef.current[lessonId];
        if (!existing) return;
        if (existing.currentStepId === stepId) return;
        persist(lessonId, { ...existing, currentStepId: stepId, lastVisited: Date.now() });
      },
      recordResult: (lesson, step, result) => {
        // Count this resolved problem toward today's activity heatmap total.
        recordActivity(1);
        const prev = allRef.current[lesson.id] ?? initialProgress(lesson.steps[0]?.id ?? '');
        const cleared = result === 'green' || result === 'yellow';
        const results = { ...(prev.results ?? {}), [step.id]: result };
        const completedProblemIds = cleared
          ? Array.from(new Set([...prev.completedProblemIds, step.id]))
          : prev.completedProblemIds.filter((id) => id !== step.id);
        const candidate: LessonProgress = {
          ...prev,
          attempts: prev.attempts + 1,
          wrongStreak: cleared ? 0 : prev.wrongStreak + 1,
          results,
          completedProblemIds,
          lastVisited: Date.now(),
        };
        const masteredNow = computeMastered(lesson, candidate);
        const clearedNow = computeCleared(lesson, candidate);
        const wasMastered = prev.mastered;
        const wasCleared = prev.cleared;
        candidate.mastered = masteredNow;
        candidate.cleared = clearedNow;
        if (clearedNow && !wasCleared) candidate.completedAt = Date.now();
        persist(lesson.id, candidate);
        return {
          progress: candidate,
          masteredNow: masteredNow && !wasMastered,
          clearedNow: clearedNow && !wasCleared,
          triggerReview: result === 'red',
        };
      },
      recordPotdSolved: () => {
        // Solving the daily problem is what advances the streak; it also counts
        // as a resolved problem for the heatmap. recordActiveDay no-ops the streak
        // if today is already counted, so a same-day re-solve won't double-advance.
        const now = Date.now();
        commitStats(bumpDailyActivity(recordActiveDay(statsRef.current, now), now, 1));
      },
      resetLessonResults: (lesson) => {
        const firstStepId = lesson.steps[0]?.id ?? '';
        const prev = allRef.current[lesson.id];
        const fresh = initialProgress(firstStepId);
        persist(lesson.id, {
          ...fresh,
          // Keep the learner's base but advance the pool so a replay shows new questions.
          seed: prev?.seed ?? fresh.seed,
          attempt: (prev?.attempt ?? 0) + 1,
          attempts: prev?.attempts ?? 0,
          lastVisited: Date.now(),
        });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, loaded, stats]);

  return <ProgressContext value={value}>{children}</ProgressContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
