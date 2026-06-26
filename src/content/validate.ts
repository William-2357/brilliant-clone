import { isCorrect } from '../lib/probability';
import { parseNumericInput } from '../lib/answer';
import type { LessonStep } from '../types/lesson';

const approx = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const sameArr = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);
const isPermutation = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
};

export function gradeNumericStr(step: LessonStep, s: string): boolean {
  const v = parseNumericInput(s);
  if (v === null) return false;
  return isCorrect(v, step.answer ?? 0, step.tolerance ?? 0);
}
export function gradeOrderArr(step: LessonStep, order: number[]): boolean {
  const t = step.answerOrder ?? [];
  return order.length === t.length && order.every((v, i) => v === t[i]);
}
export function gradeDrawHeights(step: LessonStep, drawn: number[]): boolean {
  const truth = step.answerShape ?? [];
  const total = drawn.reduce((a, b) => a + b, 0);
  if (total <= 0) return false;
  const dist = drawn.map((h) => h / total);
  const tv = 0.5 * dist.reduce((acc, d, i) => acc + Math.abs(d - (truth[i] ?? 0)), 0);
  return tv <= (step.tolerance ?? 0.15);
}
export function gradeWheelProbs(step: LessonStep, probs: number[]): boolean {
  const payouts = step.wheelPayouts ?? [];
  const ev = payouts.reduce((s, v, i) => s + v * (probs[i] ?? 0), 0);
  return isCorrect(ev, step.answer ?? 0, step.tolerance ?? 0);
}

const MIN_SEG = 0.05;
export function wheelReach(payouts: number[], target: number): { minEV: number; maxEV: number; probs: number[] | null } {
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
    const x = (target - baseEV - L * minPay) / (maxPay - minPay);
    const xc = Math.max(0, Math.min(L, x));
    probs = new Array(n).fill(MIN_SEG);
    probs[iHi] += xc;
    probs[iLo] += L - xc;
  }
  return { minEV, maxEV, probs };
}

/** Returns a list of problems with the step; empty array means it is valid + answerable. */
export function validateStep(step: LessonStep): string[] {
  const issues: string[] = [];
  const push = (cond: boolean, msg: string) => { if (!cond) issues.push(msg); };

  push(step.type === 'problem', 'step is not a problem');
  push(!!step.question, 'missing question text');
  push(!!step.feedback?.correct && !!step.feedback?.incorrect, 'missing feedback text');
  const interaction = step.interaction ?? 'numeric';

  if (interaction === 'numeric' || interaction === 'slider') {
    const ans = step.answer;
    const tol = step.tolerance;
    push(typeof ans === 'number' && Number.isFinite(ans), `bad answer: ${ans}`);
    push(typeof tol === 'number' && (tol as number) > 0, `bad tolerance: ${tol}`);
    if (typeof ans === 'number' && Number.isFinite(ans)) {
      push(gradeNumericStr(step, String(ans)), `true answer ${ans} rejected (tol ${tol})`);
      push(!gradeNumericStr(step, String(ans + (tol ?? 0) * 6 + 1)), 'a clearly wrong answer was accepted');
      if (interaction === 'slider') {
        const lo = step.sliderMin ?? 0, hi = step.sliderMax ?? 1, st = step.sliderStep ?? 0.01;
        push(lo < hi, `slider range invalid [${lo}, ${hi}]`);
        push(st > 0, `slider step invalid ${st}`);
        const grid = Math.min(hi, Math.max(lo, Math.round((ans - lo) / st) * st + lo));
        push(gradeNumericStr(step, String(grid)), `slider unreachable: grid ${grid} vs ans ${ans}`);
      }
      if (step.unit === 'count') push((tol ?? 0) >= 1, `count tolerance ${tol} < 1`);
    }
  } else if (interaction === 'order') {
    const items = step.orderItems ?? [], ord = step.answerOrder ?? [];
    push(items.length >= 2, 'order: fewer than 2 items');
    push(isPermutation(items, ord), `order: answerOrder ${ord} not a permutation of ${items}`);
    push(gradeOrderArr(step, ord), 'order: the true order is rejected');
    const rev = [...ord].reverse();
    if (!sameArr(rev, ord)) push(!gradeOrderArr(step, rev), 'order: reversed order accepted');
  } else if (interaction === 'draw') {
    const cats = step.drawCategories ?? [], shape = step.answerShape ?? [];
    push(cats.length >= 2, 'draw: fewer than 2 categories');
    push(shape.length === cats.length, `draw: shape len ${shape.length} != categories ${cats.length}`);
    const sum = shape.reduce((a, b) => a + b, 0);
    push(approx(sum, 1, 1e-6), `draw: answerShape sums to ${sum}, not 1`);
    push(shape.every((v) => v >= 0), 'draw: negative shape value');
    const tol = step.tolerance ?? 0;
    push(tol > 0 && tol < 1, `draw: tolerance ${tol} not in (0,1)`);
    push(gradeDrawHeights(step, shape.slice()), 'draw: the true shape is rejected');
    const spike = shape.map((_, i) => (i === 0 ? 1 : 0));
    push(!gradeDrawHeights(step, spike), 'draw: a single-bar spike was accepted');
  } else if (interaction === 'wheel') {
    const payouts = step.wheelPayouts ?? [], target = step.answer ?? 0, tol = step.tolerance ?? 0;
    push(payouts.length >= 2, 'wheel: fewer than 2 payouts');
    push(tol > 0, 'wheel: tolerance <= 0');
    const { minEV, maxEV, probs } = wheelReach(payouts, target);
    push(target >= minEV - 1e-9 && target <= maxEV + 1e-9, `wheel: target ${target} out of reach [${minEV.toFixed(2)}, ${maxEV.toFixed(2)}]`);
    push(probs !== null && gradeWheelProbs(step, probs), `wheel: cannot hit target ${target} within tol ${tol}`);
  }
  return issues;
}
