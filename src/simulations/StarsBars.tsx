import { makeCountUpSim, drawEnumGrid } from './countUp';
import { starsAndBars } from '../lib/probability';

/** All nonnegative integer tuples of length `boxes` summing to `stars`. */
function genCompositions(stars: number, boxes: number, cap: number): number[][] {
  const res: number[][] = [];
  const cur: number[] = [];
  const rec = (remStars: number, remBoxes: number) => {
    if (res.length > cap) return;
    if (remBoxes === 1) {
      res.push([...cur, remStars]);
      return;
    }
    for (let s = 0; s <= remStars; s++) {
      cur.push(s);
      rec(remStars - s, remBoxes - 1);
      cur.pop();
    }
  };
  rec(stars, boxes);
  return res;
}

/**
 * Stars and bars. When few enough, it lists every distinct distribution as a row
 * of stars split by bars (lit up as the count climbs); otherwise it shows one
 * example arrangement and the running total.
 */
export default makeCountUpSim({
  unitLabel: 'ways',
  runLabel: 'Count the ways',
  height: 250,
  controls: [
    { kind: 'range', key: 'stars', label: 'Stars (items)', min: 1, max: 8 },
    { kind: 'range', key: 'boxes', label: 'Boxes', min: 2, max: 5 },
  ],
  target: (config) => starsAndBars(Math.round(config.stars ?? 5), Math.round(config.boxes ?? 3)),
  draw: ({ ctx, width, height, c, config, shown, target }) => {
    const stars = Math.max(0, Math.round(config.stars ?? 5));
    const boxes = Math.max(1, Math.round(config.boxes ?? 3));
    const CAP = 40;
    const area = { x: 14, y: 16, w: width - 28, h: height - 70 };

    const drawArrangement = (comp: number[], cx: number, cy: number, cw: number, active: boolean) => {
      const tokens = stars + (boxes - 1);
      const tw = Math.min(13, (cw - 12) / Math.max(1, tokens));
      let x = cx + 6;
      const y = cy;
      for (let b = 0; b < boxes; b++) {
        for (let s = 0; s < comp[b]; s++) {
          ctx.fillStyle = active ? c.accent : c.surface3;
          ctx.beginPath();
          ctx.arc(x + tw / 2, y, Math.max(2.5, tw * 0.32), 0, Math.PI * 2);
          ctx.fill();
          x += tw;
        }
        if (b < boxes - 1) {
          ctx.strokeStyle = active ? c.textH : c.borderStrong;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x + tw / 2, y - 7);
          ctx.lineTo(x + tw / 2, y + 7);
          ctx.stroke();
          x += tw;
        }
      }
    };

    if (target <= CAP) {
      const comps = genCompositions(stars, boxes, CAP);
      drawEnumGrid(area.x, area.y, area.w, area.h, comps.length, (i, cx, cy, cw, ch) => {
        drawArrangement(comps[i], cx, cy + ch / 2, cw, i < shown);
      });
      return;
    }

    // Fallback: one example arrangement (roughly even split) + caption.
    const example: number[] = [];
    let placed = 0;
    for (let b = 0; b < boxes; b++) {
      const count = Math.round((stars * (b + 1)) / boxes) - placed;
      example.push(count);
      placed += count;
    }
    drawArrangement(example, width / 2 - (stars + boxes) * 7, area.y + area.h / 2, (stars + boxes) * 14 + 12, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${stars} stars · ${boxes - 1} bars — too many to list`, width / 2, area.y + area.h / 2 + 26);
  },
});
