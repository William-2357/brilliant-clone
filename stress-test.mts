/**
 * One-off stress-test harness for The Long Run.
 *
 * Exercises every lesson's generated problems across many seeds/cycles and checks:
 *   1. The stored answer is mathematically correct — recomputed independently from
 *      the problem's OWN simConfig + question text (the same parameters the
 *      simulation animates), via probability.ts.
 *   2. The grader accepts the true answer for every interaction (numeric, slider,
 *      order, draw, wheel) — including fraction/decimal/whitespace input variants.
 *   3. The grader REJECTS a clearly-wrong answer (tolerance isn't trivializing).
 *   4. order answers are unambiguous (no tied scores), draw shapes are valid
 *      distributions, wheel targets are achievable under the divider constraints.
 *
 * Run: node --import tsx stress-test.mts
 */
import { lessons, finalTest, gradableSteps } from './src/content/lessons';
import { generateProblem } from './src/content/problemTemplates';
import { hashString } from './src/lib/rng';
import { parseNumericInput } from './src/lib/answer';
import {
  isCorrect,
  longRunFrequency,
  diceSumDistribution,
  binomialPmf,
  galtonCenterFraction,
  montyHallSwitchWin,
  drawProbability,
  drawMatchesNoReplacement,
  randomWalkDrift,
  randomWalkRMS,
  dieMean,
  dieSD,
  standardError,
} from './src/lib/probability';
import { readWheel, wheelEV } from './src/content/simData';
import type { Lesson, LessonStep } from './src/types/lesson';

const dice = diceSumDistribution();
const EPS = 1e-6;

type Sev = 'FAIL' | 'WARN';
interface Issue {
  sev: Sev;
  lesson: string;
  slot: string;
  cycle: string;
  msg: string;
}
const issues: Issue[] = [];
let instanceCount = 0;
let checkCount = 0;
const slotsSeen = new Set<string>();

function report(sev: Sev, lesson: string, slot: string, cycle: string, msg: string) {
  issues.push({ sev, lesson, slot, cycle, msg });
}

/* ----------------------- grading mirrors (from LessonPlayer) ----------------------- */

function gradeNumeric(guess: string, answer: number, tol: number): boolean | null {
  const v = parseNumericInput(guess);
  if (v === null) return null;
  return isCorrect(v, answer, tol);
}
function gradeOrder(order: number[], target: number[]): boolean {
  return order.length === target.length && order.every((v, i) => v === target[i]);
}
function gradeDraw(drawn: number[], truth: number[], tol: number): boolean | null {
  const total = drawn.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const dist = drawn.map((h) => h / total);
  const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
  return tv <= tol;
}
function gradeWheel(probs: number[], payouts: number[], answer: number, tol: number): boolean {
  const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
  return isCorrect(ev, answer, tol);
}

/* ----------------------- independent answer recomputation ----------------------- */

/** Pull the first integer that follows a phrase like "total of 7" / "central 3". */
function num(re: RegExp, s: string): number | null {
  const m = s.match(re);
  return m ? Number(m[1]) : null;
}

/**
 * Recompute the expected numeric answer for a numeric/slider problem straight from
 * its simConfig + question + unit, using probability.ts. Returns null when the
 * slot isn't a recomputable numeric problem.
 */
function recompute(step: LessonStep): number | null {
  const cfg = step.simConfig ?? {};
  const q = (step.question ?? '') + ' ' + (step.body ?? '');
  const unit = step.unit;
  switch (step.simulation) {
    case 'coinFlip': {
      const p = cfg.p ?? 0.5;
      const n = cfg.flips ?? 0;
      if (unit === 'count') return Math.round(longRunFrequency(p) * n);
      return longRunFrequency(p); // fraction / probability
    }
    case 'diceRoll': {
      if (unit === 'sum') return 7; // "which sum is most likely"
      const sum = num(/total of (\d+)/, q) ?? num(/sum of (\d+)/, q);
      if (sum == null) return null;
      if (unit === 'count') return Math.round(dice[sum] * (cfg.rolls ?? 0));
      return dice[sum];
    }
    case 'galtonBoard': {
      const rows = cfg.rows ?? 0;
      let frac: number | null = null;
      if (/outermost|two outer/.test(q)) frac = binomialPmf(rows, 0, 0.5) + binomialPmf(rows, rows, 0.5);
      else if (/exact-center|one .*center bin/.test(q)) frac = binomialPmf(rows, Math.floor(rows / 2), 0.5);
      else {
        const c = num(/central (\d+)/, q);
        if (c != null) frac = galtonCenterFraction(rows, c);
      }
      if (frac == null) return null;
      if (unit === 'count') return Math.round(frac * (cfg.balls ?? 0));
      return frac;
    }
    case 'montyHall': {
      const doors = cfg.doors ?? 3;
      const ans = (cfg.strategy ?? 1) === 1 ? montyHallSwitchWin(doors) : 1 / doors;
      if (unit === 'count') return Math.round(ans * (cfg.trials ?? 0));
      return ans;
    }
    case 'conditional': {
      const map: Record<number, number> = {
        0: drawProbability(4, 52),
        1: drawMatchesNoReplacement(4, 52, 2),
        2: drawProbability(3, 51),
        3: drawProbability(12, 52),
        4: drawProbability(4, 51),
      };
      return map[cfg.metric ?? 0] ?? null;
    }
    case 'clt': {
      if (unit === 'value') return dieMean();
      if (unit === 'standard error') return standardError(dieSD(), cfg.m ?? 1);
      return null;
    }
    case 'randomWalk': {
      const n = cfg.steps ?? 0;
      const p = cfg.p ?? 0.5;
      if (unit === 'position') return randomWalkDrift(n, p);
      if (unit === 'distance') return randomWalkRMS(n, p);
      return null;
    }
    case 'expectedValue': {
      return wheelEV(readWheel(cfg));
    }
    default:
      return null;
  }
}

/* ----------------------- input-variant builders ----------------------- */

/** Return the closest value on a slider's [min,max] grid (mirrors PredictScale). */
function nearestOnGrid(answer: number, min: number, max: number, stepSize: number): number {
  const clamped = Math.max(min, Math.min(max, answer));
  return Math.round((clamped - min) / stepSize) * stepSize + min;
}

/** Continued-fraction rational approx; used to test "a/b" fraction entry. */
function asFraction(x: number, maxDen = 200): [number, number] | null {
  if (!Number.isFinite(x)) return null;
  let bestN = Math.round(x);
  let bestD = 1;
  let bestErr = Math.abs(x - bestN);
  for (let d = 2; d <= maxDen; d++) {
    const n = Math.round(x * d);
    const err = Math.abs(x - n / d);
    if (err < bestErr - 1e-12) {
      bestErr = err;
      bestN = n;
      bestD = d;
    }
  }
  return [bestN, bestD];
}

/* ----------------------- per-interaction checks ----------------------- */

function checkNumeric(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  const { lesson, slot, cycle } = ctx;
  const answer = step.answer ?? NaN;
  const tol = step.tolerance ?? 0;

  if (!Number.isFinite(answer)) {
    report('FAIL', lesson, slot, cycle, `answer is not finite (${answer})`);
    return;
  }
  if (!(tol > 0)) {
    report('FAIL', lesson, slot, cycle, `tolerance is not positive (${tol})`);
  }

  // 1. Math: independent recompute must match the stored answer.
  const expected = recompute(step);
  if (expected == null) {
    report('WARN', lesson, slot, cycle, `could not independently recompute (unit=${step.unit}, sim=${step.simulation})`);
  } else if (Math.abs(expected - answer) > 1e-6) {
    report(
      'FAIL',
      lesson,
      slot,
      cycle,
      `answer ${answer} != recomputed ${expected} (unit=${step.unit}); Q="${step.question}"`,
    );
  }
  checkCount++;

  // 2. Grader accepts the true answer in many input formats.
  const isFracUnit = step.unit === 'fraction' || step.unit === 'probability';
  const variants: string[] = [];
  // Decimal forms with enough precision to be inside tolerance.
  const dec = answer.toFixed(answer !== 0 && Math.abs(answer) < 0.01 ? 5 : 3);
  variants.push(dec, ` ${dec} `, `${dec}\t`);
  if (step.unit === 'count' || step.unit === 'sum') variants.push(String(Math.round(answer)));
  // For fraction/probability units, the natural fraction entry must also work.
  if (isFracUnit && answer > 0) {
    const fr = asFraction(answer);
    if (fr) {
      variants.push(`${fr[0]}/${fr[1]}`, ` ${fr[0]} / ${fr[1]} `, `${fr[0]}/ ${fr[1]}`);
    }
  }
  for (const v of variants) {
    const ok = gradeNumeric(v, answer, tol);
    checkCount++;
    if (ok === null) {
      report('FAIL', lesson, slot, cycle, `input ${JSON.stringify(v)} parsed as null (unit=${step.unit}, ans=${answer})`);
    } else if (!ok) {
      report(
        'FAIL',
        lesson,
        slot,
        cycle,
        `input ${JSON.stringify(v)} (=${parseNumericInput(v)}) graded WRONG vs ans ${answer} ±${tol}`,
      );
    }
  }

  // 3. Grader rejects a clearly-wrong answer.
  const far = Math.max(20 * tol, Math.abs(answer) * 0.5 + 1);
  for (const w of [answer + far, answer - far]) {
    const ok = gradeNumeric(String(w), answer, tol);
    checkCount++;
    if (ok === true) {
      report('WARN', lesson, slot, cycle, `clearly-wrong ${w} ACCEPTED vs ans ${answer} ±${tol} (tolerance too wide?)`);
    }
  }
}

function checkSlider(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  // Slider grades exactly like numeric, but the learner can only land on the grid.
  checkNumeric(step, ctx);
  const answer = step.answer ?? NaN;
  const tol = step.tolerance ?? 0;
  const min = step.sliderMin ?? 0;
  const max = step.sliderMax ?? 1;
  const stp = step.sliderStep ?? 0.01;
  if (answer < min - EPS || answer > max + EPS) {
    report('FAIL', ctx.lesson, ctx.slot, ctx.cycle, `slider range [${min},${max}] cannot reach answer ${answer}`);
    return;
  }
  const grid = nearestOnGrid(answer, min, max, stp);
  const ok = gradeNumeric(String(grid), answer, tol);
  checkCount++;
  if (ok !== true) {
    report(
      'FAIL',
      ctx.lesson,
      ctx.slot,
      ctx.cycle,
      `nearest slider grid value ${grid} can't grade correct (ans ${answer} ±${tol}, step ${stp})`,
    );
  }
}

function checkOrder(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  const { lesson, slot, cycle } = ctx;
  const items = step.orderItems ?? [];
  const target = step.answerOrder ?? [];
  // answerOrder must be a permutation of orderItems.
  if (items.length !== target.length || [...items].sort().join() !== [...target].sort().join()) {
    report('FAIL', lesson, slot, cycle, `answerOrder ${JSON.stringify(target)} is not a permutation of items ${JSON.stringify(items)}`);
  }
  // Grading the correct order must pass.
  if (!gradeOrder(target, target)) {
    report('FAIL', lesson, slot, cycle, `grading answerOrder against itself failed`);
  }
  checkCount++;

  // Ambiguity check: recover each item's score and look for ties (no unique answer).
  const scores = orderScores(step);
  if (scores) {
    const vals = target.map((id) => scores.get(id)!);
    for (let i = 1; i < vals.length; i++) {
      if (Math.abs(vals[i] - vals[i - 1]) < 1e-9) {
        report(
          'WARN',
          lesson,
          slot,
          cycle,
          `tied ranks: items ${target[i - 1]} & ${target[i]} share score ${vals[i].toFixed(4)} — order is ambiguous but only one ordering is accepted`,
        );
        break;
      }
    }
    // The stored answerOrder must actually be sorted by score (desc, ties by smaller id).
    const sorted = [...items].sort((a, b) => (scores.get(b)! - scores.get(a)!) || a - b);
    if (sorted.join() !== target.join()) {
      report('FAIL', lesson, slot, cycle, `answerOrder ${JSON.stringify(target)} != score-sorted ${JSON.stringify(sorted)}`);
    }
  }
}

/** EV per evGames label, to detect ties in the l5-s6 ranking. */
const EV_BY_LABEL = new Map<string, number>([
  ['Coin game: $2 half the time, else $0', 1.0],
  ['Raffle: $50 with chance 0.05, else $0', 2.5],
  ['Prize wheel: $5 (40%), $10 (20%), else $0', 4.0],
  ['Scratch card: $20 (30%), else $0', 6.0],
  ['Jackpot pull: $40 (20%), else $0', 8.0],
  ['Lottery: $100 (10%), else $0', 10.0],
  ['Loot box: $5 (60%), $30 (10%), else $0', 6.0],
  ['Claw machine: $2 (50%), $25 (10%), else $0', 3.5],
  ['Insurance payout: $200 (3%), else $0', 6.0],
  // Static l5-s6 labels:
  ['Mix wheel: $5 (20%), $20 (10%), else $0', 3.0],
  ['Prize wheel: $1 (50%), $5 (30%), $10 (20%)', 4.0],
]);

function orderScores(step: LessonStep): Map<number, number> | null {
  const items = step.orderItems ?? [];
  const m = new Map<number, number>();
  if (step.simulation === 'diceRoll') {
    for (const s of items) m.set(s, dice[s]);
    return m;
  }
  if (step.simulation === 'montyHall') {
    for (const d of items) m.set(d, montyHallSwitchWin(d));
    return m;
  }
  if (step.id.includes('l6-s6')) {
    const probs: Record<number, number> = {
      0: drawProbability(4, 52),
      1: drawProbability(3, 51),
      2: drawProbability(4, 51),
      3: drawProbability(12, 52),
    };
    for (const i of items) m.set(i, probs[i]);
    return m;
  }
  if (step.id.includes('l5-s6')) {
    const labels = step.orderLabels ?? {};
    for (const i of items) {
      const ev = EV_BY_LABEL.get(labels[i]);
      if (ev == null) return null;
      m.set(i, ev);
    }
    return m;
  }
  return null;
}

function checkDraw(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  const { lesson, slot, cycle } = ctx;
  const cats = step.drawCategories ?? [];
  const truth = step.answerShape ?? [];
  const tol = step.tolerance ?? 0.15;
  if (cats.length !== truth.length) {
    report('FAIL', lesson, slot, cycle, `drawCategories(${cats.length}) != answerShape(${truth.length})`);
    return;
  }
  if (truth.some((v) => v < -EPS)) report('FAIL', lesson, slot, cycle, `answerShape has negative entries`);
  const sum = truth.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.02) {
    report('FAIL', lesson, slot, cycle, `answerShape sums to ${sum.toFixed(4)}, not ~1`);
  }
  // A learner who sketches the exact truth must grade correct.
  const exact = gradeDraw(truth.slice(), truth, tol);
  checkCount++;
  if (exact !== true) report('FAIL', lesson, slot, cycle, `sketching the exact truth grades WRONG (tol ${tol})`);
  // A flat sketch should generally NOT pass (else the task is trivial). Warn only.
  const flat = new Array(truth.length).fill(1);
  if (gradeDraw(flat, truth, tol) === true && truth.length > 3) {
    report('WARN', lesson, slot, cycle, `a perfectly FLAT sketch passes (tol ${tol} may be too loose)`);
  }
}

function checkWheel(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  const { lesson, slot, cycle } = ctx;
  const payouts = step.wheelPayouts ?? [];
  const target = step.answer ?? 0;
  const tol = step.tolerance ?? 0;
  const MIN_SEG = 0.05; // from WheelSegments
  const n = payouts.length;
  if (n < 2) {
    report('FAIL', lesson, slot, cycle, `wheel needs >=2 payouts`);
    return;
  }
  // Max/min achievable EV under each prob >= MIN_SEG, summing to 1.
  const spare = 1 - n * MIN_SEG;
  const sorted = [...payouts].sort((a, b) => a - b);
  const minEV = sorted.reduce((s, v, i) => s + v * (MIN_SEG + (i === 0 ? spare : 0)), 0);
  const maxEV = sorted.reduce((s, v, i) => s + v * (MIN_SEG + (i === n - 1 ? spare : 0)), 0);
  if (target < minEV - tol || target > maxEV + tol) {
    report('FAIL', lesson, slot, cycle, `wheel target ${target} unreachable; EV range [${minEV.toFixed(2)},${maxEV.toFixed(2)}]`);
    return;
  }
  // Find a witness probability vector that hits the target, then grade it.
  const witness = solveWheel(payouts, target, MIN_SEG);
  if (!witness) {
    report('FAIL', lesson, slot, cycle, `could not find any divider setting hitting target ${target}`);
    return;
  }
  checkCount++;
  if (!gradeWheel(witness, payouts, target, tol)) {
    const ev = payouts.reduce((s, v, i) => s + v * witness[i], 0);
    report('FAIL', lesson, slot, cycle, `witness EV ${ev.toFixed(3)} fails grade vs target ${target} ±${tol}`);
  }
}

/** Search probability vectors (each >= MIN_SEG) for one whose EV ~ target. */
function solveWheel(payouts: number[], target: number, minSeg: number): number[] | null {
  const n = payouts.length;
  // Two-segment closed form, else a randomized search (the wheel has <=4 segments).
  if (n === 2) {
    // p0*v0 + (1-p0)*v1 = target
    const denom = payouts[0] - payouts[1];
    if (Math.abs(denom) < EPS) return null;
    const p0 = (target - payouts[1]) / denom;
    if (p0 < minSeg - EPS || p0 > 1 - minSeg + EPS) return null;
    return [p0, 1 - p0];
  }
  let best: number[] | null = null;
  let bestErr = Infinity;
  for (let iter = 0; iter < 200000; iter++) {
    const raw = payouts.map(() => minSeg + Math.random());
    const s = raw.reduce((a, b) => a + b, 0);
    const p = raw.map((x) => (x / s) * (1 - n * minSeg) + minSeg);
    const ev = payouts.reduce((acc, v, i) => acc + v * p[i], 0);
    const err = Math.abs(ev - target);
    if (err < bestErr) {
      bestErr = err;
      best = p;
      if (err < 0.05) break;
    }
  }
  return bestErr < 0.4 ? best : null;
}

/* ----------------------- driver ----------------------- */

function checkStep(step: LessonStep, ctx: { lesson: string; slot: string; cycle: string }) {
  instanceCount++;
  slotsSeen.add(`${ctx.lesson}/${ctx.slot}`);
  const interaction = step.interaction ?? 'numeric';
  switch (interaction) {
    case 'numeric':
      checkNumeric(step, ctx);
      break;
    case 'slider':
      checkSlider(step, ctx);
      break;
    case 'order':
      checkOrder(step, ctx);
      break;
    case 'draw':
      checkDraw(step, ctx);
      break;
    case 'wheel':
      checkWheel(step, ctx);
      break;
  }
}

const SEEDS = 80;
const ATTEMPTS = 4;
const RETRIES = 2;

function run(allLessons: Lesson[]) {
  for (const lesson of allLessons) {
    const slots = gradableSteps(lesson);
    for (const base of slots) {
      for (let si = 0; si < SEEDS; si++) {
        const seed = (hashString(lesson.id) ^ (si * 0x9e3779b1)) >>> 0;
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
          for (let retry = 0; retry < RETRIES; retry++) {
            const step = generateProblem(lesson.id, base, seed, attempt, retry);
            checkStep(step, {
              lesson: lesson.id,
              slot: base.id,
              cycle: `seed#${si},a${attempt},r${retry}`,
            });
          }
        }
      }
    }
  }
}

run([...lessons, finalTest]);

/* ----------------------- parseNumericInput battery ----------------------- */

console.log('\n=== parseNumericInput battery ===');
const cases: Array<[string, number | null]> = [
  ['0.5', 0.5],
  [' 0.5 ', 0.5],
  ['.5', 0.5],
  ['0.50', 0.5],
  ['1/2', 0.5],
  ['1 / 2', 0.5],
  [' 1/2 ', 0.5],
  ['1/ 2', 0.5],
  ['1 /2', 0.5],
  ['6/36', 6 / 36],
  ['2/3', 2 / 3],
  ['0.667', 0.667],
  ['3.5', 3.5],
  ['10', 10],
  ['-20', -20],
  ['+0.6', 0.6],
  ['5e-1', 0.5],
  ['0', 0],
  // expected-to-be-null / rejected:
  ['', null],
  ['abc', null],
  ['1/2/3', null],
  ['1/0', null],
  ['/2', null],
  ['2/', null],
  // plausible accidental inputs a user might type (documenting behavior):
  ['50%', null],
  ['0,5', null],
  ['1 000', null],
  ['0. 5', null],
];
let parseFails = 0;
for (const [inp, exp] of cases) {
  const got = parseNumericInput(inp);
  const ok = exp === null ? got === null : got !== null && Math.abs(got - exp) < 1e-9;
  if (!ok) parseFails++;
  console.log(`  ${ok ? 'ok  ' : 'DIFF'} ${JSON.stringify(inp).padEnd(10)} -> ${got}   (expected ${exp})`);
}

/* ----------------------- summary ----------------------- */

const fails = issues.filter((i) => i.sev === 'FAIL');
const warns = issues.filter((i) => i.sev === 'WARN');

function dedupe(list: Issue[]) {
  // Collapse identical (slot,msg-shape) issues, counting occurrences.
  const map = new Map<string, { issue: Issue; count: number }>();
  for (const it of list) {
    // Normalize numbers out of the message so variants collapse.
    const shape = it.msg.replace(/-?\d+(\.\d+)?/g, '#');
    const key = `${it.lesson}|${it.slot}|${shape}`;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { issue: it, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

console.log(`\n=== STRESS TEST SUMMARY ===`);
console.log(`lessons: ${lessons.length + 1}, slots exercised: ${slotsSeen.size}`);
console.log(`problem instances generated: ${instanceCount}`);
console.log(`assertions run: ${checkCount}`);
console.log(`parseNumericInput battery: ${cases.length - parseFails}/${cases.length} as expected`);
console.log(`FAILS: ${fails.length}   WARNS: ${warns.length}`);

if (fails.length) {
  console.log(`\n--- FAILS (deduped) ---`);
  for (const { issue, count } of dedupe(fails)) {
    console.log(`  [x${count}] ${issue.lesson}/${issue.slot}  (e.g. ${issue.cycle})\n        ${issue.msg}`);
  }
}
if (warns.length) {
  console.log(`\n--- WARNS (deduped) ---`);
  for (const { issue, count } of dedupe(warns)) {
    console.log(`  [x${count}] ${issue.lesson}/${issue.slot}  (e.g. ${issue.cycle})\n        ${issue.msg}`);
  }
}
console.log('');
