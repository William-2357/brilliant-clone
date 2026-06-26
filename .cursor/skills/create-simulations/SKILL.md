---
name: create-simulations
description: >-
  Build new Canvas simulations for The Long Run that match the existing ones in
  structure, animation, and theme — a single React component implementing
  SimulationProps with explore/verify modes, a seeded rAF loop driven by the global
  speed control, answers hidden until the run starts, and colors read from
  simPalette() so they work in light and dark. Use when adding a SimulationType,
  writing a new src/simulations/*.tsx component, animating a probability/process,
  wiring a sim into a lesson or the Sandbox, or asking how the simulation template,
  canvas conventions, or theming work in this repo.
---

# Create Simulations — The Long Run

A simulation is **one Canvas React component** in `src/simulations/` that animates a
random process toward a value the app already owns. Every sim shares the same
contract, lifecycle, control surface, and theming — copy the template below and fill
in the process + drawing.

**Read first:** `src/simulations/types.ts`, `src/simulations/canvasUtils.ts`, and two
existing sims — `CoinFlip.tsx` (convergence path) and `GaltonBoard.tsx` (streaming
sprites + cached dims). The canvas rules in `CLAUDE.md` are binding.

## The contract

Every sim implements `SimulationProps` (`src/simulations/types.ts`):

```typescript
interface SimulationProps {
  config: Record<string, number>;   // flat numeric params, e.g. { flips: 1000, p: 0.5 }
  mode: 'explore' | 'verify';       // explore = concept (controls); verify = problem (batch run)
  runSignal: number;                // increment triggers a verify run
  onSettled?: () => void;           // call when a verify run finishes settling
}
```

- **explore** (concept steps): render learner controls; let them run it freely.
- **verify** (problem steps): run a batch when `runSignal` changes, then `onSettled()`.

`config` is **numbers only**. Encode richer structures as flat keys (the EV wheel uses
`n`, `v0..vk`, `p0..pk` via `wheelConfig()` in `simData.ts`; decode them in the sim).

## Hard rules (non-negotiable)

1. **Never auto-run on mount.** Keep `const lastRunRef = useRef(runSignal)` and run
   only when `mode === 'verify' && runSignal !== lastRunRef.current`.
2. **Hide the answer during predict.** Target lines, theoretical curves, and markers
   must be gated on `const reveal = mode === 'explore' || s.processed > 0`. Drawing
   them earlier leaks the answer into the predict phase.
3. **Theme via `simPalette()` only.** Read every color from CSS variables on each
   paint. No literal hex (white text on a filled accent shape is the only exception).
4. **Cache canvas dims; never call `setupCanvas` in the per-frame loop.** Reassigning
   `canvas.width/height` each frame reallocates + clears the backing store and is the
   #1 cause of jank. Cache `{ ctx, width, height }`, refresh only on mount, resize,
   and run-start.
5. **Drive timing through `scaledStep`.** Use the global speed multiplier so the
   Speed control affects every sim in real time. Reset `accRef.current = 0` per run.
6. **Animate-small / batch-large.** Process ~1 trial per frame for small counts;
   compute in chunks per frame and animate the aggregate for large counts. Hold ~60 FPS.
   Avoid per-frame `shadowBlur`.
7. **The simulated process IS the answer key.** It must converge to the same value
   `probability.ts` computes for the problem; any target line you draw uses that value.

## What you get for free

The shell, theme, and global controls are not authored per sim:

- **`.sim` card + `.sim-canvas` + `.sim-controls`** styles (surface, border, radius,
  shadow) come from `App.css`, all CSS-variable themed.
- **Speed control** is rendered by `LessonPlayer`/Sandbox (`{Sim && <SpeedControl />}`),
  not inside your sim — just read `getSimSpeed()`/`scaledStep` in the loop.
- **Theme switching** dispatches a `resize`; your resize listener repaints with the new
  palette automatically.
- **Layout** (concept grid, problem stage, Sandbox stage) places your sim responsively.

## Template — copy this into `src/simulations/NewSim.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';

/**
 * <One line>: runs `trials` independent trials and animates the running estimate
 * toward the owned answer. The target line reveals the answer, so it stays hidden
 * until the run starts.
 */
export default function NewSim({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Explore control(s); fixed params can be read straight from `config`.
  const [trials, setTrials] = useState(config.trials ?? 200);

  // Mutable run state in a ref so the rAF loop mutates without re-rendering.
  const stateRef = useRef({ hits: 0, processed: 0, total: 0 });
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  // Cache ctx/size; refresh only on mount, resize, and run-start.
  const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(null);

  function ensureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    dimsRef.current = setupCanvas(canvas);
    return dimsRef.current;
  }

  function draw() {
    const dims = dimsRef.current ?? ensureCanvas();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);

    const estimate = s.processed > 0 ? s.hits / s.processed : 0;
    // The target gives away the answer — hide it while the learner predicts.
    const reveal = mode === 'explore' || s.processed > 0;

    const barX = 24, barW = width - 48, barY = 40, barH = 22;
    ctx.fillStyle = c.surface3;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 11); ctx.fill();
    if (estimate > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barH, barW * estimate), barH, 11); ctx.fill();
    }
    if (reveal) {
      const target = config.target ?? 0.5; // must equal the owned answer
      const tx = barX + barW * target;
      ctx.strokeStyle = c.accent2; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, barY - 7); ctx.lineTo(tx, barY + barH + 7); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = c.textH; ctx.font = '700 26px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 34);
    ctx.fillStyle = c.text; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${s.hits} of ${s.processed}`, width / 2, barY + barH + 52);
  }

  // One independent trial — replace with your process; must match the owned answer.
  function trialHits(): boolean {
    return Math.random() < (config.target ?? 0.5);
  }

  function run(total: number) {
    cancelAnimationFrame(rafRef.current);
    ensureCanvas();
    const s = stateRef.current;
    s.hits = 0; s.processed = 0; s.total = total;
    accRef.current = 0;
    const small = total <= 20;
    const perFrame = small ? 1 / 6 : Math.ceil(total / 75);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < total; i++) {
        if (trialHits()) s.hits++;
        s.processed++;
      }
      draw();
      if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    ensureCanvas();
    draw();
    const onResize = () => { ensureCanvas(); draw(); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.trials ?? trials);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="220" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <RangeField label="Trials" value={trials} min={1} max={2000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Run {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
```

## Pick a visualization pattern (copy the closest sim)

| Pattern | Copy from | Use when |
|---|---|---|
| Running estimate → target line/band | `CoinFlip.tsx` | a single rate/probability converging |
| Histogram → theoretical shape | `DiceRoll.tsx` | a distribution over discrete outcomes |
| Streaming sprites piling into bins | `GaltonBoard.tsx` | individual objects fall/accumulate (heavy) |
| Interactive board + win-rate | `MontyHall.tsx` | discrete game states with explore toggles |
| Weighted wheel + running average | `ExpectedValue.tsx` | expected value of payouts |

## Wiring checklist

```
- [ ] src/simulations/NewSim.tsx           — the component (template above)
- [ ] src/types/lesson.ts                   — add the key to the `SimulationType` union
- [ ] src/simulations/index.ts              — add it to the `simulations` record
- [ ] src/content/sandboxSims.ts            — optional: a SandboxSim entry (also shows on Home)
- [ ] lesson step uses simulation/simConfig — see create-topic-lessons
- [ ] npm run build && npm run lint         — both must pass clean
```

Use it in a lesson by setting `simulation: 'newSim'` and a numeric `simConfig` on a
step. `LessonPlayer` keys the sim by `` `${step.id}:${seed}:${attempt}:${retry}` `` and
passes `mode`, `runSignal`, and `onSettled` — don't fight that remount.

## Controls & theme tokens

- **`RangeField`** (`label/value/min/max/step/onChange`) = slider + number box. Plain
  `<input type="range">` works too; set `accent-color: var(--accent)` (already styled
  via `.sim-slider`).
- **Toggle group:** `<div className="sim-toggle">` with `btn` / `btn-ghost` buttons
  (see `MontyHall`).
- **Palette** from `simPalette()`: `accent`, `accent2`, `accentStrong`, `accentBg`,
  `cyan`, `good`, `warn`, `bad`, `text`, `textH`, `muted`, `border`, `borderStrong`,
  `surface`, `surface2`, `surface3`, `ringTrack`, `gridLine`. Fonts: `system-ui, sans-serif`.
- **Canvas height:** set via `data-height="NNN"` on the `<canvas>` (read by `setupCanvas`).

## Verify

1. `npm run build && npm run lint` — both clean.
2. Open the Sandbox, run it large and small, drag Speed mid-run.
3. Confirm the answer (target/curve) is hidden until a verify run starts.
4. Toggle light/dark — colors must update (the `resize` repaint handles this).

## Additional resources

- Lifecycle details, canvas/speed APIs, CSS classes, performance, config decoding: [reference.md](reference.md)
- Putting a sim into a lesson: `.cursor/skills/create-topic-lessons/SKILL.md`
- Motion, palette, and visual polish: `.cursor/skills/engaging-web-design/SKILL.md`
- Binding canvas rules and architecture: `CLAUDE.md`
