import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { backend } from '../lib/backend';
import type { ProgressMap, UserStats } from '../lib/storage';
import { emptyStats } from '../lib/storage';
import type { Lesson, LessonProgress, LessonStep } from '../types/lesson';
import { useAuth } from './useAuth';
import { computeMastered, initialProgress, recordActiveDay } from '../store/progress';

interface RecordResult {
  progress: LessonProgress;
  masteredNow: boolean;
  /** True when wrongStreak just reached the review threshold (FR-5.3). */
  triggerReview: boolean;
}

interface ProgressContextValue {
  all: ProgressMap;
  loaded: boolean;
  stats: UserStats;
  get(lessonId: string): LessonProgress | undefined;
  ensureStarted(lesson: Lesson): LessonProgress;
  setCurrentStep(lessonId: string, stepId: string): void;
  recordResult(lesson: Lesson, step: LessonStep, correct: boolean): RecordResult;
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

  /** Mark today active and advance the streak (no-op if already counted today). */
  function recordActivity() {
    const next = recordActiveDay(statsRef.current, Date.now());
    if (next === statsRef.current) return;
    statsRef.current = next;
    setStats(next);
    if (user) void backend.progress.saveStats(user.uid, next);
  }

  const value = useMemo<ProgressContextValue>(() => {
    return {
      all,
      loaded,
      stats,
      get: (lessonId) => allRef.current[lessonId],
      ensureStarted: (lesson) => {
        recordActivity();
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
      recordResult: (lesson, step, correct) => {
        recordActivity();
        const prev = allRef.current[lesson.id] ?? initialProgress(lesson.steps[0]?.id ?? '');
        const completedProblemIds = correct
          ? Array.from(new Set([...prev.completedProblemIds, step.id]))
          : prev.completedProblemIds;
        const wrongStreak = correct ? 0 : prev.wrongStreak + 1;
        const candidate: LessonProgress = {
          ...prev,
          attempts: prev.attempts + 1,
          wrongStreak,
          completedProblemIds,
          lastVisited: Date.now(),
        };
        const masteredNow = computeMastered(lesson, candidate);
        const wasMastered = prev.mastered;
        candidate.mastered = masteredNow;
        if (masteredNow && !wasMastered) candidate.completedAt = Date.now();
        persist(lesson.id, candidate);
        return {
          progress: candidate,
          masteredNow: masteredNow && !wasMastered,
          triggerReview: !correct && wrongStreak >= 2,
        };
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
