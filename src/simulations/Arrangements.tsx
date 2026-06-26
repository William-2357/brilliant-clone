import { makeCountUpSim, drawEnumGrid } from './countUp';
import { permutations, multinomialArrangements } from '../lib/probability';

/** Multiset letter counts from config (c0, c1, …) when in anagram mode. */
function multisetCounts(config: Record<string, number>): number[] {
  const groups = Math.max(1, Math.round(config.groups ?? 2));
  const out: number[] = [];
  for (let i = 0; i < groups; i++) out.push(Math.max(1, Math.round(config[`c${i}`] ?? 1)));
  return out;
}

/** All ordered selections of r distinct items from n (as letter indices). */
function genPerms(n: number, r: number, capN: number): number[][] {
  const res: number[][] = [];
  const used = new Array(n).fill(false);
  const cur: number[] = [];
  const rec = () => {
    if (res.length > capN) return;
    if (cur.length === r) {
      res.push(cur.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return res;
}

/** All distinct permutations of a multiset given group counts (as letter indices). */
function genMultiset(counts: number[], capN: number): number[][] {
  const total = counts.reduce((a, b) => a + b, 0);
  const rem = counts.slice();
  const res: number[][] = [];
  const cur: number[] = [];
  const rec = () => {
    if (res.length > capN) return;
    if (cur.length === total) {
      res.push(cur.slice());
      return;
    }
    for (let i = 0; i < rem.length; i++) {
      if (rem[i] <= 0) continue;
      rem[i]--;
      cur.push(i);
      rec();
      cur.pop();
      rem[i]++;
    }
  };
  rec();
  return res;
}

/**
 * Ordered arrangements. When few enough, it lists the actual distinct
 * arrangements as rows of letter chips (lit up as the count climbs); otherwise it
 * shows the slots and the running total.
 */
export default makeCountUpSim({
  unitLabel: 'arrangements',
  runLabel: 'Count the arrangements',
  height: 250,
  // Permutation mode only (multiset lessons pass fixed config in verify).
  controls: [
    { kind: 'range', key: 'n', label: 'Items (n)', min: 1, max: 6 },
    { kind: 'range', key: 'r', label: 'Choose (r)', min: 1, max: 6 },
  ],
  clampParams: (p) => ({ ...p, r: Math.min(p.r, p.n) }),
  target: (config) => {
    if (config.multiset) return multinomialArrangements(multisetCounts(config));
    const n = Math.round(config.n ?? 4);
    const r = Math.round(config.r ?? n);
    return permutations(n, r);
  },
  draw: ({ ctx, width, height, c, config, shown, target }) => {
    const CAP = 40;
    const area = { x: 14, y: 16, w: width - 28, h: height - 70 };

    if (target <= CAP) {
      const items = config.multiset
        ? genMultiset(multisetCounts(config), CAP)
        : genPerms(Math.round(config.n ?? 4), Math.round(config.r ?? config.n ?? 4), CAP);
      drawEnumGrid(area.x, area.y, area.w, area.h, items.length, (i, cx, cy, cw, ch) => {
        const seq = items[i];
        const active = i < shown;
        const chip = Math.min(16, (cw - 8) / seq.length - 2);
        const startX = cx + 6;
        const yMid = cy + ch / 2;
        for (let k = 0; k < seq.length; k++) {
          const x = startX + k * (chip + 2);
          ctx.fillStyle = active ? c.accent : c.surface3;
          ctx.beginPath();
          ctx.roundRect(x, yMid - chip / 2, chip, chip, 3);
          ctx.fill();
          ctx.fillStyle = active ? '#fff' : c.muted;
          ctx.font = `${Math.round(chip * 0.7)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String.fromCharCode(65 + seq[k]), x + chip / 2, yMid + 0.5);
        }
      });
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // Fallback: a row of empty slots + caption for large counts.
    const slots = config.multiset
      ? multisetCounts(config).reduce((a, b) => a + b, 0)
      : Math.round(config.r ?? config.n ?? 4);
    const shownSlots = Math.min(slots, 8);
    const sw = 30;
    const sgap = 8;
    const totalW = shownSlots * sw + (shownSlots - 1) * sgap;
    let x = (width - totalW) / 2;
    const y = area.y + area.h / 2 - 24;
    for (let i = 0; i < shownSlots; i++) {
      ctx.fillStyle = c.surface3;
      ctx.strokeStyle = c.borderStrong;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x, y, sw, sw, 7);
      ctx.fill();
      ctx.stroke();
      x += sw + sgap;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('too many to list — counting them all', width / 2, y + sw + 18);
  },
});
