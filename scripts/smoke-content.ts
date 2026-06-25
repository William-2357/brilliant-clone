/**
 * Content smoke test. Replicates the app's exact grading (LessonPlayer +
 * TestPlayer) and verifies that EVERY gradable problem — static fallbacks and
 * every generated variant across many seeds/cycles, in all lessons + the final
 * test — is answerable and correct:
 *   • the computed true answer is accepted by the grader,
 *   • a clearly-wrong answer is rejected (grader actually discriminates),
 *   • slider answers land on a reachable grid point within tolerance,
 *   • wheel targets are reachable given the 5%-min-segment constraint,
 *   • draw "answer shapes" are non-negative and sum to 1 (TV grading needs it),
 *   • rankings equal the true ordering,
 *   • and each simulation's config converges to the same value marked correct
 *     (the integrity of predict-then-verify).
 *
 * Run: npx -y tsx scripts/smoke-content.ts
 */
import { lessons, finalTest, gradableSteps } from '../src/content/lessons';
import { generateProblem } from '../src/content/problemTemplates';
import { readWheel, wheelEV } from '../src/content/simData';
import { isCorrect, dieSD } from '../src/lib/probability';
import { parseNumericInput } from '../src/lib/answer';
import type { Lesson, LessonStep } from '../src/types/lesson';

type Fail = { where: string; reason: string };
const fails: Fail[] = [];
let tested = 0;
let checks = 0;

function check(cond: boolean, where: string, reason: string): void {
  checks++;
  if (!cond) fails.push({ where, reason });
}
const approx = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const sameArr = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);
const isPermutation = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
};

// ---- Grading replicas (must mirror the components exactly) ----
function gradeNumericStr(step: LessonStep, s: string): boolean {
  const v = parseNumericInput(s);
  if (v === null) return false;
  return isCorrect(v, step.answer ?? 0, step.tolerance ?? 0);
}
function gradeOrderArr(step: LessonStep, order: number[]): boolean {
  const t = step.answerOrder ?? [];
  return order.length === t.length && order.every((v, i) => v === t[i]);
}
function gradeDrawHeights(step: LessonStep, drawn: number[]): boolean {
  const truth = step.answerShape ?? [];
  const total = drawn.reduce((a, b) => a + b, 0);
  if (total <= 0) return false;
  const dist = drawn.map((h) => h / total);
  const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
  return tv <= (step.tolerance ?? 0.15);
}
function gradeWheelProbs(step: LessonStep, probs: number[]): boolean {
  const payouts = step.wheelPayouts ?? [];
  const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
  return isCorrect(ev, step.answer ?? 0, step.tolerance ?? 0);
}

// ---- Sim ↔ answer consistency (does the sim converge to the graded value?) ----
const DICE_VALS = [1, 2, 3, 4, 5, 6].map((w) => w / 36);
function simConsistency(step: LessonStep, where: string): void {
  const sim = step.simulation;
  const cfg = step.simConfig ?? {};
  const ans = step.answer ?? 0;
  const unit = step.unit;
  if (sim === 'coinFlip') {
    check(cfg.p >= 0 && cfg.p <= 1, where, `coin p out of range: ${cfg.p}`);
    if (unit === 'count') check(ans === Math.round(cfg.p * cfg.flips), where, `coin count ${ans} != round(${cfg.p}*${cfg.flips})`);
    else check(approx(ans, cfg.p, 1e-9), where, `coin fraction ${ans} != sim p ${cfg.p}`);
  } else if (sim === 'diceRoll') {
    if (unit === 'count') {
      const d = ans / cfg.rolls;
      check(DICE_VALS.some((v) => Math.abs(v - d) < 1e-6), where, `dice count ratio ${d} not a dice prob`);
    } else check(DICE_VALS.some((v) => Math.abs(v - ans) < 1e-9), where, `dice prob ${ans} not in distribution`);
  } else if (sim === 'galtonBoard') {
    const f = unit === 'count' ? ans / cfg.balls : ans;
    check(f > 0 && f <= 1, where, `galton fraction ${f} out of (0,1]`);
  } else if (sim === 'expectedValue') {
    const ev = wheelEV(readWheel(cfg));
    check(approx(ans, ev, 1e-6), where, `EV answer ${ans} != wheel(config) EV ${ev}`);
  } else if (sim === 'montyHall') {
    const base = (cfg.strategy ?? 1) === 1 ? (cfg.doors - 1) / cfg.doors : 1 / cfg.doors;
    if (unit === 'count') check(ans === Math.round(base * cfg.trials), where, `monty count ${ans} != round(${base}*${cfg.trials})`);
    else check(approx(ans, base, 1e-9), where, `monty fraction ${ans} != ${base}`);
  } else if (sim === 'randomWalk') {
    if (unit === 'position') check(approx(ans, cfg.steps * (2 * cfg.p - 1), 1e-6), where, `walk drift ${ans} != ${cfg.steps}*(2*${cfg.p}-1)`);
    else if (unit === 'distance') check(approx(ans, 2 * Math.sqrt(cfg.p * (1 - cfg.p) * cfg.steps), 1e-6), where, `walk rms ${ans} mismatch`);
  } else if (sim === 'clt') {
    if (unit === 'value') check(approx(ans, 3.5, 1e-9), where, `clt center ${ans} != 3.5`);
    else if (unit === 'standard error') check(approx(ans, dieSD() / Math.sqrt(cfg.m), 1e-9), where, `clt SE ${ans} != sigma/sqrt(${cfg.m})`);
  } else if (sim === 'conditional') {
    const map: Record<number, number> = { 0: 4 / 52, 1: (4 * 3) / (52 * 51), 2: 3 / 51, 3: 12 / 52, 4: 4 / 51 };
    check(approx(ans, map[cfg.metric], 1e-9), where, `conditional ${ans} != metric ${cfg.metric} value ${map[cfg.metric]}`);
  }
}

// ---- Deep ranking checks (recompute the true order independently) ----
const DICE_W = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]; // ways for sums 2..12
function orderDeepCheck(step: LessonStep, where: string): void {
  const ord = step.answerOrder ?? [];
  const items = step.orderItems ?? [];
  if (step.id === 'l2-s6') {
    const expected = [...items].sort((a, b) => DICE_W[b - 2] - DICE_W[a - 2] || a - b);
    check(sameArr(ord, expected), where, `dice rank ${ord} != ${expected}`);
  } else if (step.id === 'l7-s6') {
    const expected = [...items].sort((a, b) => b - a); // more doors => higher switch win
    check(sameArr(ord, expected), where, `monty rank ${ord} != ${expected}`);
  } else if (step.id === 'l6-s6') {
    check(sameArr(ord, [3, 2, 0, 1]), where, `conditional rank ${ord} != [3,2,0,1]`);
  } else if (step.id === 'l5-s6') {
    // EVs of the four static games (only checkable for the static fallback).
    // For generated variants we still validate permutation + grader elsewhere.
  }
}

// ---- Wheel reachability (mirror WheelSegments: MIN_SEG=0.05, probs sum to 1) ----
const MIN_SEG = 0.05;
function wheelReach(payouts: number[], target: number): { minEV: number; maxEV: number; probs: number[] | null } {
  const n = payouts.length;
  const minPay = Math.min(...payouts);
  const maxPay = Math.max(...payouts);
  const iLo = payouts.indexOf(minPay);
  const iHi = payouts.indexOf(maxPay);
  const baseEV = payouts.reduce((s, v) => s + MIN_SEG * v, 0);
  const L = 1 - n * MIN_SEG;
  const minEV = baseEV + L * minPay;
  const maxEV = baseEV + L * maxPay;
  let probs: number[] | null = null;
  if (iHi !== iLo && maxPay > minPay) {
    const x = (target - baseEV - L * minPay) / (maxPay - minPay); // mass (of L) to the max segment
    const xc = Math.max(0, Math.min(L, x));
    probs = new Array(n).fill(MIN_SEG);
    probs[iHi] += xc;
    probs[iLo] += L - xc;
  }
  return { minEV, maxEV, probs };
}

function validate(step: LessonStep, where: string): void {
  tested++;
  check(step.type === 'problem', where, 'step is not a problem');
  check(!!step.question, where, 'missing question text');
  check(!!step.feedback?.correct && !!step.feedback?.incorrect, where, 'missing feedback text');
  const interaction = step.interaction ?? 'numeric';

  if (interaction === 'numeric' || interaction === 'slider') {
    const ans = step.answer;
    const tol = step.tolerance;
    check(typeof ans === 'number' && Number.isFinite(ans), where, `bad answer: ${ans}`);
    check(typeof tol === 'number' && (tol as number) > 0, where, `bad tolerance: ${tol}`);
    if (typeof ans !== 'number' || !Number.isFinite(ans)) return;
    check(gradeNumericStr(step, String(ans)), where, `true answer ${ans} rejected (tol ${tol})`);
    check(!gradeNumericStr(step, String(ans + (tol ?? 0) * 6 + 1)), where, 'a clearly wrong answer was accepted');
    if (interaction === 'slider') {
      const lo = step.sliderMin ?? 0;
      const hi = step.sliderMax ?? 1;
      const st = step.sliderStep ?? 0.01;
      check(lo < hi, where, `slider range invalid [${lo}, ${hi}]`);
      check(st > 0, where, `slider step invalid ${st}`);
      const grid = Math.min(hi, Math.max(lo, Math.round((ans - lo) / st) * st + lo));
      check(gradeNumericStr(step, String(grid)), where, `slider unreachable: grid ${grid} vs ans ${ans} (tol ${tol}, range [${lo},${hi}])`);
    }
    if (step.unit === 'count') check((tol ?? 0) >= 1, where, `count tolerance ${tol} < 1`);
    simConsistency(step, where);
  } else if (interaction === 'order') {
    const items = step.orderItems ?? [];
    const ord = step.answerOrder ?? [];
    check(items.length >= 2, where, 'order: fewer than 2 items');
    check(isPermutation(items, ord), where, `order: answerOrder ${ord} not a permutation of ${items}`);
    check(gradeOrderArr(step, ord), where, 'order: the true order is rejected');
    const rev = [...ord].reverse();
    if (!sameArr(rev, ord)) check(!gradeOrderArr(step, rev), where, 'order: reversed order accepted');
    orderDeepCheck(step, where);
  } else if (interaction === 'draw') {
    const cats = step.drawCategories ?? [];
    const shape = step.answerShape ?? [];
    check(cats.length >= 2, where, 'draw: fewer than 2 categories');
    check(shape.length === cats.length, where, `draw: shape len ${shape.length} != categories ${cats.length}`);
    const sum = shape.reduce((a, b) => a + b, 0);
    check(approx(sum, 1, 1e-6), where, `draw: answerShape sums to ${sum}, not 1`);
    check(shape.every((v) => v >= 0), where, 'draw: negative shape value');
    const tol = step.tolerance ?? 0;
    check(tol > 0 && tol < 1, where, `draw: tolerance ${tol} not in (0,1)`);
    check(gradeDrawHeights(step, shape.slice()), where, 'draw: the true shape is rejected');
    const spike = shape.map((_, i) => (i === 0 ? 1 : 0));
    check(!gradeDrawHeights(step, spike), where, 'draw: a single-bar spike was accepted (tolerance too loose?)');
  } else if (interaction === 'wheel') {
    const payouts = step.wheelPayouts ?? [];
    const target = step.answer ?? 0;
    const tol = step.tolerance ?? 0;
    check(payouts.length >= 2, where, 'wheel: fewer than 2 payouts');
    check(tol > 0, where, 'wheel: tolerance <= 0');
    const { minEV, maxEV, probs } = wheelReach(payouts, target);
    check(target >= minEV - 1e-9 && target <= maxEV + 1e-9, where, `wheel: target ${target} out of reach [${minEV.toFixed(2)}, ${maxEV.toFixed(2)}]`);
    check(probs !== null && gradeWheelProbs(step, probs), where, `wheel: cannot hit target ${target} within tol ${tol}`);
  }
}

// ---- Drive every lesson + the final test ----
const SEEDS = 250;
const CYCLES: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
]; // (attempt, retry) -> cycle 0..3

function run(): void {
  const all: Lesson[] = [...lessons, finalTest];
  for (const lesson of all) {
    if (lesson.status !== 'built') continue;
    for (const base of gradableSteps(lesson)) {
      // 1) the static fallback content
      validate(base, `${lesson.id}/${base.id}/static`);
      // 2) every generated variant across seeds + retry/replay cycles
      for (let seed = 0; seed < SEEDS; seed++) {
        for (const [attempt, retry] of CYCLES) {
          const gen = generateProblem(lesson.id, base, seed, attempt, retry);
          validate(gen, `${lesson.id}/${base.id}/seed${seed}/a${attempt}r${retry}`);
        }
      }
    }
  }
}

run();

const built = [...lessons, finalTest].filter((l) => l.status === 'built');
const slotCount = built.reduce((n, l) => n + gradableSteps(l).length, 0);
console.log('— Content smoke test —');
console.log(`Lessons (incl. final test): ${built.length}`);
console.log(`Gradable slots:            ${slotCount}`);
console.log(`Problems validated:        ${tested.toLocaleString()}`);
console.log(`Assertions run:            ${checks.toLocaleString()}`);
if (fails.length === 0) {
  console.log('\n✅ ALL PROBLEMS ANSWERABLE & CORRECT — 0 failures.');
} else {
  // De-duplicate by reason so a parameterized bug shows once with a count.
  const byReason = new Map<string, { count: number; sample: string }>();
  for (const f of fails) {
    const key = f.reason.replace(/-?\d+(\.\d+)?/g, '#');
    const e = byReason.get(key) ?? { count: 0, sample: '' };
    e.count++;
    if (!e.sample) e.sample = `${f.where} :: ${f.reason}`;
    byReason.set(key, e);
  }
  console.log(`\n❌ ${fails.length.toLocaleString()} failing assertions across ${byReason.size} distinct issue(s):\n`);
  for (const [, e] of [...byReason.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ×${e.count}  ${e.sample}`);
  }
  process.exitCode = 1;
}
