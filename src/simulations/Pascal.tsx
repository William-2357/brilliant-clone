import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { getSimSpeed } from '../lib/simSpeed';
import { combinations } from '../lib/probability';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'n', label: 'Set size (n)', min: 1, max: 12, step: 1 },
  { kind: 'range', key: 'k', label: 'Choose (k)', min: 0, max: 12, step: 1 },
];

// Animation timing, in abstract "t units" advanced ~1.4·speed per frame.
const FILL_PER_ROW = 8; // how long each row takes to trickle in
const STEP_FRAMES = 4; // frames a path marble spends descending one row
const SPAWN_GAP = 6; // gap between successive path marbles
const MAX_PATHS = 16; // representative paths to animate

/** A monotone lattice path apex→(n,k): col[r] is the column at row r (col[n] = k). */
function buildPath(n: number, k: number): number[] {
  const right = new Array(n).fill(0);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  for (let i = 0; i < k; i++) right[idx[i]] = 1;
  const col = [0];
  let c = 0;
  for (let r = 0; r < n; r++) {
    c += right[r];
    col.push(c);
  }
  return col;
}

/**
 * Combinations via Pascal's triangle. On run, the sums trickle down row by row
 * (each cell = the two above it), funneling into the highlighted target cell;
 * then tokens trace monotone lattice paths from the apex down into that square,
 * showing that C(n,k) counts the paths. The answer is hidden until the run starts.
 */
export default function Pascal({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (key: string, v: number) =>
    setParams((p) => {
      const next = { ...p, [key]: v };
      if ((next.k ?? 0) > (next.n ?? 0)) next.k = next.n;
      return next;
    });
  const eff = mode === 'explore' ? { ...config, ...params } : config;
  const n = Math.max(1, Math.min(14, Math.round(eff.n ?? 5)));
  const k = Math.max(0, Math.min(n, Math.round(eff.k ?? 2)));
  const value = combinations(n, k);

  const stateRef = useRef({ t: 0, running: false, settled: false, paths: [] as number[][] });
  const rafRef = useRef(0);
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

  // Which cells can lie on a path to the target (the funnel into it).
  function onFunnel(r: number, j: number): boolean {
    return j >= 0 && j <= r && j <= k && k - j <= n - r;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    if (n > 13) {
      ctx.textAlign = 'center';
      ctx.fillStyle = c.muted;
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(`C(${n}, ${k}) too wide to draw`, width / 2, height / 2);
      return;
    }

    const top = 20;
    const readoutH = 56;
    const rowH = Math.min(24, (height - top - readoutH) / (n + 1));
    const cellW = Math.min(30, (width - 20) / (n + 1));
    const cx = width / 2;
    const pos = (r: number, j: number) => ({ x: cx + (j - r / 2) * cellW, y: top + r * rowH + rowH / 2 });

    const fillEnd = (n + 1) * FILL_PER_ROW;
    const pathT = s.t - fillEnd;

    // Parent→child connectors for revealed cells (the lattice).
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (let r = 1; r <= n; r++) {
      const alpha = Math.max(0, Math.min(1, (s.t - r * FILL_PER_ROW) / FILL_PER_ROW));
      if (alpha <= 0) continue;
      for (let j = 0; j <= r; j++) {
        const ch = pos(r, j);
        for (const pj of [j - 1, j]) {
          if (pj < 0 || pj > r - 1) continue;
          const pp = pos(r - 1, pj);
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(pp.x, pp.y);
          ctx.lineTo(ch.x, ch.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Cells
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r <= n; r++) {
      const alpha = Math.max(0, Math.min(1, (s.t - r * FILL_PER_ROW) / FILL_PER_ROW));
      for (let j = 0; j <= r; j++) {
        const { x, y } = pos(r, j);
        const isTarget = r === n && j === k;
        // Funnel tint
        if (onFunnel(r, j) && alpha > 0) {
          ctx.fillStyle = c.accentBg;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.roundRect(x - cellW / 2 + 1.5, y - rowH / 2 + 1.5, cellW - 3, rowH - 3, 5);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (isTarget) {
          ctx.fillStyle = c.accent;
          ctx.globalAlpha = Math.max(0.25, alpha);
          ctx.beginPath();
          ctx.roundRect(x - cellW / 2 + 1.5, y - rowH / 2 + 1.5, cellW - 3, rowH - 3, 5);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (alpha > 0.05) {
          // a small "drop" as the row trickles in
          const dy = (1 - alpha) * -rowH * 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = isTarget ? '#fff' : onFunnel(r, j) ? c.accentStrong : c.text;
          ctx.font = `${isTarget ? '700 ' : ''}11px system-ui, sans-serif`;
          ctx.fillText(String(combinations(r, j)), x, y + dy);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = isTarget ? c.accent : c.surface3;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.textBaseline = 'alphabetic';

    // Path marbles (after the fill completes)
    if (pathT > 0 && s.paths.length > 0) {
      for (let i = 0; i < s.paths.length; i++) {
        const start = i * SPAWN_GAP;
        const rf = (pathT - start) / STEP_FRAMES;
        if (rf <= 0) continue;
        const path = s.paths[i];
        const clamped = Math.min(n, rf);
        // trail
        ctx.strokeStyle = c.accent2;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const p0 = pos(0, path[0]);
        ctx.moveTo(p0.x, p0.y);
        const whole = Math.floor(clamped);
        for (let r = 1; r <= whole; r++) {
          const p = pos(r, path[r]);
          ctx.lineTo(p.x, p.y);
        }
        // partial segment to the moving head
        let headX: number;
        let headY: number;
        if (whole < n) {
          const frac = clamped - whole;
          const a = pos(whole, path[whole]);
          const b = pos(whole + 1, path[whole + 1]);
          headX = a.x + (b.x - a.x) * frac;
          headY = a.y + (b.y - a.y) * frac;
          ctx.lineTo(headX, headY);
        } else {
          const t = pos(n, path[n]);
          headX = t.x;
          headY = t.y;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        // token
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(headX, headY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Readout
    const revealed = s.t > n * FILL_PER_ROW;
    const ry = top + (n + 1) * rowH + 6;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(revealed ? String(value) : '?', width / 2, ry + 16);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    const sub =
      pathT > 0
        ? `each path is one way to reach the square — C(${n}, ${k}) = ${value}`
        : `C(${n}, ${k}) = sums into the highlighted square`;
    ctx.fillText(sub, width / 2, ry + 32);
  }

  function run() {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.t = 0;
    s.running = true;
    s.settled = false;
    const count = Math.min(value, MAX_PATHS);
    s.paths = Array.from({ length: count }, () => buildPath(n, k));
    const fillEnd = (n + 1) * FILL_PER_ROW;
    const pathsEnd = Math.max(0, (s.paths.length - 1) * SPAWN_GAP) + n * STEP_FRAMES + 8;
    const totalEnd = fillEnd + pathsEnd;
    const tick = () => {
      s.t += 1.4 * Math.max(0.15, getSimSpeed());
      if (!s.settled && s.t >= fillEnd) {
        s.settled = true;
        onSettled?.();
      }
      draw();
      if (s.t < totalEnd) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        s.t = totalEnd;
        s.running = false;
        draw();
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

  // Explore: reset the animation whenever a control changes.
  useEffect(() => {
    if (mode !== 'explore') return;
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.t = 0;
    s.running = false;
    s.settled = false;
    s.paths = [];
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
      <canvas ref={canvasRef} data-height="270" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <button type="button" className="btn" onClick={() => run()}>
            Trickle the sums
          </button>
        </div>
      )}
    </div>
  );
}
