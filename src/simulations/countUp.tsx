import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette, type SimPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import SimControls, { initParams, type ControlSpec } from './controls';

/**
 * Shared engine for the combinatorics "enumerator" sims. Counting answers are
 * exact, so verify does not converge via Monte-Carlo — it animates the count
 * climbing to the computed total while a topic-specific illustration is drawn.
 * The number is hidden behind "?" until the run starts, preserving predict-then-verify.
 */
export interface CountUpScene {
  /** The exact total the count animates to — the owned answer. */
  target: (config: Record<string, number>) => number;
  /** Draw the illustration for this topic. `shown` is the current animated count. */
  draw: (a: {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    c: SimPalette;
    config: Record<string, number>;
    shown: number;
    target: number;
    reveal: boolean;
  }) => void;
  unitLabel?: string;
  height?: number;
  runLabel?: string;
  /** Explore-mode controls that override the defining params (verify ignores them). */
  controls?: ControlSpec[];
  /** Optional dependent-param clamp applied to the explore config (e.g. r ≤ n). */
  clampParams?: (p: Record<string, number>) => Record<string, number>;
}

/**
 * Lay out `count` enumerated objects in a column-major grid and call `render` for
 * each with its cell box, so a sim can draw the actual combinatorial objects
 * (arrangements, star/bar rows, …) rather than anonymous dots. The caller decides
 * how to style the first `shown` items. Returns false when there are too many to
 * enumerate cleanly, so the caller can fall back to a compact summary.
 */
export function drawEnumGrid(
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  render: (i: number, cx: number, cy: number, cw: number, ch: number) => void,
  cap = 40,
): boolean {
  if (count <= 0 || count > cap) return false;
  const rowH = 22;
  const rowsThatFit = Math.max(1, Math.floor(h / rowH));
  const cols = Math.ceil(count / rowsThatFit);
  const rows = Math.ceil(count / cols);
  const cellW = w / cols;
  const ch = Math.min(rowH, h / rows);
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / rows);
    const row = i % rows;
    render(i, x + col * cellW, y + row * ch, cellW, ch);
  }
  return true;
}

export function makeCountUpSim(scene: CountUpScene) {
  function CountUp({ config, mode, runSignal, onSettled }: SimulationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [, force] = useState(0);
    const specs = scene.controls ?? [];
    const [params, setParams] = useState(() => initParams(config, specs));
    const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
    const eff =
      mode === 'explore' && specs.length
        ? scene.clampParams
          ? scene.clampParams({ ...config, ...params })
          : { ...config, ...params }
        : config;
    const stateRef = useRef({ shown: 0, target: 0, running: false });
    const rafRef = useRef(0);
    const accRef = useRef(0);
    const lastRunRef = useRef(runSignal);
    const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(
      null,
    );

    function ensure() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      dimsRef.current = setupCanvas(canvas);
      return dimsRef.current;
    }

    function draw() {
      const dims = dimsRef.current ?? ensure();
      if (!dims) return;
      const { ctx, width, height } = dims;
      const c = simPalette();
      const s = stateRef.current;
      ctx.clearRect(0, 0, width, height);
      const reveal = mode === 'explore' || s.running || s.shown > 0;
      const target = scene.target(eff);
      scene.draw({ ctx, width, height, c, config: eff, shown: s.shown, target, reveal });

      // Big count readout
      ctx.textAlign = 'center';
      ctx.fillStyle = c.textH;
      ctx.font = '700 30px system-ui, sans-serif';
      const label = reveal ? Math.round(s.shown).toLocaleString() : '?';
      ctx.fillText(label, width / 2, height - 26);
      ctx.fillStyle = c.muted;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(scene.unitLabel ?? 'ways', width / 2, height - 9);
    }

    function run() {
      cancelAnimationFrame(rafRef.current);
      ensure();
      const target = scene.target(eff);
      const s = stateRef.current;
      s.shown = 0;
      s.target = target;
      s.running = true;
      accRef.current = 0;
      const perFrame = target <= 60 ? 1 : Math.ceil(target / 60);
      const tick = () => {
        const todo = scaledStep(accRef, perFrame);
        s.shown = Math.min(target, s.shown + todo);
        draw();
        if (s.shown < target) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          s.running = false;
          onSettled?.();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    useEffect(() => {
      ensure();
      draw();
      const onResize = () => {
        ensure();
        draw();
      };
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(rafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Explore: changing a control changes the structure — reset the count and redraw.
    useEffect(() => {
      if (mode !== 'explore') return;
      cancelAnimationFrame(rafRef.current);
      const s = stateRef.current;
      s.shown = 0;
      s.running = false;
      ensure();
      draw();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    useEffect(() => {
      if (mode === 'verify' && runSignal !== lastRunRef.current) {
        lastRunRef.current = runSignal;
        run();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runSignal]);

    return (
      <div className="sim">
        <canvas ref={canvasRef} data-height={scene.height ?? 240} className="sim-canvas" />
        {mode === 'explore' && (
          <div className="sim-controls">
            {specs.length > 0 && <SimControls specs={specs} params={params} set={set} />}
            <button
              type="button"
              className="btn"
              onClick={() => {
                run();
                force((n) => n + 1);
              }}
            >
              {scene.runLabel ?? 'Count the ways'}
            </button>
          </div>
        )}
      </div>
    );
  }
  return CountUp;
}
