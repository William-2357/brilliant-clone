import { makeCountUpSim } from './countUp';

/** Read the per-stage option counts from config (o0, o1, …). */
function options(config: Record<string, number>): number[] {
  const slots = Math.max(1, Math.round(config.slots ?? 2));
  const opts: number[] = [];
  for (let i = 0; i < slots; i++) opts.push(Math.max(1, Math.round(config[`o${i}`] ?? 2)));
  return opts;
}

/**
 * Multiplication principle as an actual branching tree: the root fans into the
 * first stage's options, each of those into the next stage's, and so on, so the
 * number of leaves IS the product. Leaves light up as the count climbs. For large
 * products (too wide to draw) it falls back to the stage expression alone.
 */
export default makeCountUpSim({
  unitLabel: 'outcomes',
  runLabel: 'Count the outcomes',
  height: 250,
  controls: [
    { kind: 'range', key: 'slots', label: 'Stages', min: 1, max: 4 },
    { kind: 'range', key: 'o0', label: 'Stage 1 options', min: 1, max: 4, default: 2 },
    { kind: 'range', key: 'o1', label: 'Stage 2 options', min: 1, max: 4, default: 2 },
    { kind: 'range', key: 'o2', label: 'Stage 3 options', min: 1, max: 4, default: 2 },
    { kind: 'range', key: 'o3', label: 'Stage 4 options', min: 1, max: 4, default: 2 },
  ],
  target: (config) => options(config).reduce((a, b) => a * b, 1),
  draw: ({ ctx, width, height, c, config, shown, target }) => {
    const opts = options(config);
    // Stage expression boxes across the top (always shown).
    const boxW = 40;
    const gap = 22;
    const y = 18;
    const bh = 32;
    const totalW = opts.length * boxW + (opts.length - 1) * gap;
    let x = (width - totalW) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < opts.length; i++) {
      ctx.fillStyle = c.accentBg;
      ctx.strokeStyle = c.borderStrong;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, bh, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.textH;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(String(opts[i]), x + boxW / 2, y + bh / 2 + 1);
      if (i < opts.length - 1) {
        ctx.fillStyle = c.muted;
        ctx.font = '700 15px system-ui, sans-serif';
        ctx.fillText('×', x + boxW + gap / 2, y + bh / 2);
      }
      x += boxW + gap;
    }
    ctx.textBaseline = 'alphabetic';

    // Branching tree (only when it fits).
    const counts = [1];
    for (let L = 0; L < opts.length; L++) counts.push(counts[L] * opts[L]);
    if (target > 64 || opts.length > 5) return;

    const top = y + bh + 14;
    const bottom = height - 54;
    const levelH = (bottom - top) / opts.length;
    const nodeX = (L: number, i: number) => ((i + 0.5) / counts[L]) * (width - 16) + 8;
    const nodeY = (L: number) => top + L * levelH;

    // edges
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (let L = 0; L < opts.length; L++) {
      for (let i = 0; i < counts[L]; i++) {
        for (let ch = 0; ch < opts[L]; ch++) {
          const child = i * opts[L] + ch;
          ctx.beginPath();
          ctx.moveTo(nodeX(L, i), nodeY(L));
          ctx.lineTo(nodeX(L + 1, child), nodeY(L + 1));
          ctx.stroke();
        }
      }
    }
    // nodes
    for (let L = 0; L <= opts.length; L++) {
      const leaf = L === opts.length;
      for (let i = 0; i < counts[L]; i++) {
        const r = leaf ? 4 : 3;
        ctx.beginPath();
        ctx.arc(nodeX(L, i), nodeY(L), r, 0, Math.PI * 2);
        if (leaf) ctx.fillStyle = i < shown ? c.accent : c.surface3;
        else ctx.fillStyle = c.muted;
        ctx.fill();
      }
    }
  },
});
