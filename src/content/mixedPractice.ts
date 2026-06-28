/**
 * Mixed Practice engine (PRD FR-11.2 interleaving + FR-11.1 spaced repetition).
 *
 * Draws problems across *all mastered/cleared* lessons and arranges them in a
 * randomized, interleaved order — never two consecutive picks from the same
 * lesson — while front-loading concepts that are due for review. It is the
 * scheduling/ordering layer only: every concrete problem (and its answer) is
 * still built by `generateProblem`, which recomputes the answer from
 * `probability.ts`. Modeled on `daily.ts` (pool + seed pattern).
 */
import { lessons, gradableSteps } from './lessons';
import { generateProblem } from './problemTemplates';
import { makeRng, hashString, type Rng } from '../lib/rng';
import { isCleared } from '../store/progress';
import { dueConcepts } from '../store/review';
import type { DailyPick } from './daily';
import type { ProgressMap, UserStats } from '../lib/storage';

/** In-place Fisher–Yates shuffle with a seeded RNG. */
function shuffle<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Every gradable problem across the *mastered/cleared* lessons — the Mixed
 * Practice pool. Unlike `numericPool()` in daily.ts this keeps **all** interaction
 * types (numeric/slider/order/draw/wheel) so a session genuinely interleaves
 * problem formats, not just topics.
 */
export function masteredProblemPool(all: ProgressMap): DailyPick[] {
  const pool: DailyPick[] = [];
  for (const lesson of lessons) {
    if (lesson.status !== 'built') continue;
    if (!isCleared(all[lesson.id])) continue;
    for (const step of gradableSteps(lesson)) {
      pool.push({ lessonId: lesson.id, lessonTitle: lesson.title, step });
    }
  }
  return pool;
}

/**
 * Rearrange picks so no two consecutive share a lessonId (interleaving). Greedy:
 * always take from the lesson with the most remaining picks that isn't the one
 * just placed. This guarantees no same-lesson adjacency whenever it's feasible
 * (it's only impossible when a single lesson supplies more than half the picks —
 * e.g. just one lesson is cleared — in which case some adjacency is unavoidable).
 */
function interleaveByLesson(items: DailyPick[], rng: Rng): DailyPick[] {
  const groups = new Map<string, DailyPick[]>();
  for (const it of items) {
    const arr = groups.get(it.lessonId) ?? [];
    arr.push(it);
    groups.set(it.lessonId, arr);
  }
  const result: DailyPick[] = [];
  let lastId: string | null = null;
  while (result.length < items.length) {
    let candidates = [...groups.entries()].filter(([, arr]) => arr.length > 0);
    const notLast = candidates.filter(([id]) => id !== lastId);
    if (notLast.length) candidates = notLast;
    // Most-remaining first; break ties randomly so sessions vary.
    const maxLen = Math.max(...candidates.map(([, arr]) => arr.length));
    const top = candidates.filter(([, arr]) => arr.length === maxLen);
    const [id, arr] = top[rng.int(0, top.length - 1)];
    result.push(arr.shift()!);
    lastId = id;
  }
  return result;
}

/**
 * Build a Mixed Practice session of up to `size` problems.
 *   1. Prioritize concepts that are due for review (most overdue first).
 *   2. Fill the rest from the full mastered pool, breadth-first across lessons for
 *      topic variety.
 *   3. Interleave so no two consecutive picks share a lessonId.
 *   4. Materialize each concrete problem via `generateProblem` (answer recomputed
 *      from probability.ts).
 * Deterministic for a given `seed` so a session is stable across re-renders.
 * Returns `[]` when the learner has no cleared lessons yet.
 */
export function buildSession(
  stats: UserStats,
  all: ProgressMap,
  size: number,
  seed: string,
): DailyPick[] {
  const pool = masteredProblemPool(all);
  if (pool.length === 0) return [];
  const rng = makeRng(hashString(`mix:${seed}`));

  // Group the pool by lesson and shuffle each lesson's problems so repeat
  // sessions surface different slots.
  const byLesson = new Map<string, DailyPick[]>();
  for (const pick of pool) {
    const arr = byLesson.get(pick.lessonId) ?? [];
    arr.push(pick);
    byLesson.set(pick.lessonId, arr);
  }
  for (const arr of byLesson.values()) shuffle(arr, rng);

  // Visiting order: due concepts first (most overdue first), then the remaining
  // cleared lessons in random order (so a learner with nothing due still mixes).
  const due = dueConcepts(stats, lessons, all, Date.now())
    .map((l) => l.id)
    .filter((id) => byLesson.has(id));
  const dueSet = new Set(due);
  const others = [...byLesson.keys()].filter((id) => !dueSet.has(id));
  shuffle(others, rng);
  const order = [...due, ...others];

  // Breadth-first selection: take one problem per lesson per pass, in priority
  // order, until we reach `size` (or exhaust the pool). This keeps the chosen set
  // diverse across lessons, which also makes interleaving feasible.
  const selected: DailyPick[] = [];
  let advanced = true;
  while (selected.length < size && advanced) {
    advanced = false;
    for (const id of order) {
      if (selected.length >= size) break;
      const arr = byLesson.get(id);
      if (arr && arr.length) {
        selected.push(arr.shift()!);
        advanced = true;
      }
    }
  }

  // Interleave, then materialize each concrete problem from its template + seed.
  return interleaveByLesson(selected, rng).map((pick, i) => ({
    ...pick,
    step: generateProblem(pick.lessonId, pick.step, hashString(seed + i), 0, 0),
  }));
}
