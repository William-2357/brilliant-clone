# Simulation authoring reference

Detailed contracts for `create-simulations`. The live files in `src/simulations/`
and `src/lib/` are the source of truth; this captures what you must honor.

## Lifecycle (the five moving parts)

| Piece | Shape | Job |
|---|---|---|
| `canvasRef` | `useRef<HTMLCanvasElement>` | the drawing surface |
| `stateRef` | `useRef({...})` | mutable run state the rAF loop mutates without re-render |
| `rafRef` | `useRef<number>` | current `requestAnimationFrame` id (cancel on rerun/unmount) |
| `accRef` | `useRef(0)` | `scaledStep` accumulator; reset to 0 at each run start |
| `lastRunRef` | `useRef(runSignal)` | guards against auto-run; only run when `runSignal` changes |

Optional `dimsRef` caches `{ ctx, width, height }` so `setupCanvas` is never called per
frame (required for heavy/streaming sims; recommended for all new sims).

**Two effects, always:**

```typescript
// 1. Mount: paint once, repaint on resize (also fired on theme toggle), clean up.
useEffect(() => {
  ensureCanvas(); draw();
  const onResize = () => { ensureCanvas(); draw(); };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// 2. Verify trigger: run only when runSignal actually changes.
useEffect(() => {
  if (mode === 'verify' && runSignal !== lastRunRef.current) {
    lastRunRef.current = runSignal;
    run(config.trials ?? trials);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [runSignal]);
```

## canvasUtils API (`src/simulations/canvasUtils.ts`)

- `setupCanvas(canvas)` → `{ ctx, width, height }`. Handles devicePixelRatio (clamped
  to 2), reads height from `canvas.dataset.height` (the `data-height` attr), sets the
  CSS height, and applies the dpr transform. Width comes from the element's CSS box.
- `cssVar(name, fallback)` → resolved CSS variable string (SSR-safe).
- `simPalette()` → all theme colors as a typed object (see SKILL.md token list). Call it
  **inside `draw()`** so a theme change is picked up on the next paint.

## simSpeed API (`src/lib/simSpeed.ts`)

- `scaledStep(accRef, rawPerFrame)` → integer count to process this frame, scaled by the
  global speed and carried fractionally (no work lost/duplicated). Reset `accRef.current = 0`
  at run start.
- `getSimSpeed()` → live multiplier; read per frame for *continuous* motion (e.g.
  `GaltonBoard` ball fall speed) that isn't a discrete trial count.
- The `SpeedControl` component is global and rendered by `LessonPlayer`/`SandboxPage`,
  not by the sim. Don't add your own speed UI.

## Control components & CSS classes

All classes are styled in `src/App.css` with CSS variables (light + dark safe). Don't
add new global CSS for a sim; reuse these:

| Class / component | Purpose |
|---|---|
| `.sim` | the surface card wrapping canvas + controls |
| `.sim-canvas` (+ `data-height`) | full-width canvas; `touch-action: none` |
| `.sim-controls` | column stack of controls, shown only in `explore` |
| `RangeField` → `.sim-slider`, `.sim-slider-head`, `.sim-num` | slider + number box |
| `.sim-slider input[type=range]` | `accent-color: var(--accent)` |
| `.sim-toggle` + `.btn` / `.btn-ghost` | segmented toggle (e.g. switch/stay) |
| `.btn`, `.btn-primary`, `.btn-ghost` | buttons (run, toggles) |
| `.speed-control` | the global speed slider (rendered by the player) |

## Registration

1. **Type:** add the new key to the `SimulationType` union in `src/types/lesson.ts`.
2. **Registry:** add `newSim: NewSim` to the `simulations` record in
   `src/simulations/index.ts` (and import the component). Both the lessons and Sandbox
   resolve components through this record.
3. **Sandbox (optional):** add a `SandboxSim` to `SANDBOX_SIMS` in
   `src/content/sandboxSims.ts` — `{ type, label, blurb, config }`. This also powers the
   Home page "simulation to try" spotlight. `blurb` supports inline `$...$` KaTeX.

## Config decoding

`config` is `Record<string, number>`. Read scalars directly (`config.flips ?? 100`).
For structured inputs, encode/decode via flat numeric keys:

- **EV wheels:** `wheelConfig(segments)` (in `src/content/simData.ts`) emits `n`, `v0..vk`,
  `p0..pk`; decode them back into segments inside the sim (see `ExpectedValue.tsx`).
- **Mode/metric switches:** pass an integer (e.g. `strategy: 1` = switch, `metric: 0..4`)
  and branch on it (see `MontyHall.tsx`, `ConditionalProbability.tsx`).

Keep `explore` defaults small for interactivity; `verify` configs use large counts so the
estimate visibly converges.

## Performance

- Cache dims; refresh only on mount/resize/run-start. Never reassign `canvas.width` per frame.
- Animate aggregates for large N; only animate individual sprites/trials for small N.
- Plain fills only inside the loop — **no per-frame `shadowBlur`** (very expensive with
  many sprites).
- Bound concurrent sprites if you stream them (`GaltonBoard` caps at `MAX_ON_SCREEN`).
- One `requestAnimationFrame` chain per run; always `cancelAnimationFrame` before a new
  run and on unmount.

## Reveal-gating (what counts as "the answer")

Hide anything that discloses the result until `mode === 'explore' || s.processed > 0`:
target/expectation lines, theoretical PMF/PDF curves, convergence bands, the winning
door/card, and final markers. The running estimate itself (which starts at 0 and moves)
is fine to show; the *target it moves toward* is not.

## Toolchain gotchas

- `erasableSyntaxOnly`: no `enum`s, no constructor parameter properties — use plain
  fields/objects.
- `noUnusedLocals` / `noUnusedParameters` are on — destructure only what you use from
  `SimulationProps` (e.g. omit `onSettled` if a sim never settles, like a pure-explore viz).
- Mirror the existing `// eslint-disable-next-line react-hooks/exhaustive-deps` on the two
  effects rather than widening deps (re-running them would restart/auto-run the sim).
- Keep the default export a single component; the registry imports it by default.
