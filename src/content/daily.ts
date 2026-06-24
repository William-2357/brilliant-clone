import { lessons, gradableSteps } from './lessons';
import { generateProblem } from './problemTemplates';
import { SANDBOX_SIMS, type SandboxSim } from './sandboxSims';
import { hashString } from '../lib/rng';
import type { LessonStep } from '../types/lesson';

/**
 * Date-seeded "of the day" picks shared by the Home page (one-line previews on the
 * quick-action cards) and the dedicated daily pages. Selection is deterministic per
 * `today` (the same content all day, a fresh pick tomorrow) so the preview always
 * matches what the learner sees after tapping through.
 */

export interface DailyPick {
  lessonId: string;
  lessonTitle: string;
  step: LessonStep;
}

/** Every typeable (numeric) problem across the course — the daily problem pool. */
function numericPool(): DailyPick[] {
  const pool: DailyPick[] = [];
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    for (const step of gradableSteps(lesson)) {
      if ((step.interaction ?? 'numeric') === 'numeric') {
        pool.push({ lessonId: lesson.id, lessonTitle: lesson.title, step });
      }
    }
  }
  return pool;
}

/**
 * The problem of the day: a stable pick for `today` with its answer recomputed by
 * `generateProblem` (never hand-typed). Returns null only if the pool is empty.
 */
export function dailyProblem(today: string): { pick: DailyPick; step: LessonStep } | null {
  const pool = numericPool();
  if (!pool.length) return null;
  const pick = pool[hashString(`potd:${today}`) % pool.length];
  const step = generateProblem(pick.lessonId, pick.step, hashString(today), 0, 0);
  return { pick, step };
}

/** The simulation of the day: a stable pick from the sandbox catalog for `today`. */
export function dailySim(today: string): SandboxSim {
  return SANDBOX_SIMS[hashString(`sim:${today}`) % SANDBOX_SIMS.length];
}

/* ---- Problem-of-the-day local state (this device) ---- */

const POTD_KEY = 'bb:potd';

export type PotdStatus = 'solved' | 'revealed';

/** Today's recorded outcome for this device, or null if not attempted today. */
export function readPotdStatus(today: string): PotdStatus | null {
  try {
    const raw = localStorage.getItem(POTD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { day?: string; status?: PotdStatus };
    return parsed.day === today && parsed.status ? parsed.status : null;
  } catch {
    return null;
  }
}

/** Persist today's outcome so the problem stays resolved for the rest of the day. */
export function writePotdStatus(today: string, status: PotdStatus): void {
  try {
    localStorage.setItem(POTD_KEY, JSON.stringify({ day: today, status }));
  } catch {
    /* ignore */
  }
}

/**
 * A "people who solved today" count for the Problem of the Day. Phase 1 has no
 * global aggregation backend, so this is a deterministic, date-seeded figure that
 * climbs over the course of the day (stable within an hour, fresh each morning).
 * The caller adds 1 for this device once the learner solves it.
 */
export function dailySolvers(today: string, hour: number): number {
  const peak = 1200 + (hashString(`solvers:${today}`) % 3300); // day's-end total
  const fraction = Math.min(1, (hour + 1) / 24); // grows as the day goes on
  return Math.max(60, Math.round(peak * fraction));
}
