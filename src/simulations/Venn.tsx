import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import { VENN_REGION_ORDER, type VennRegion } from '../lib/probability';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  {
    kind: 'toggle',
    key: 'region',
    label: 'Target region',
    options: [
      { value: 0, label: 'A' },
      { value: 1, label: 'B' },
      { value: 2, label: 'A∩B' },
      { value: 3, label: 'A∪B' },
    ],
  },
  { kind: 'range', key: 'aOnly', label: 'A only', min: 0, max: 16 },
  { kind: 'range', key: 'bOnly', label: 'B only', min: 0, max: 16 },
  { kind: 'range', key: 'both', label: 'A and B', min: 0, max: 16 },
  { kind: 'range', key: 'neither', label: 'Neither', min: 0, max: 16 },
];

type Base = 'aOnly' | 'bOnly' | 'both' | 'neither';
interface Dot {
  x: number;
  y: number;
  inTarget: boolean;
}

const REGION_LABEL: Record<VennRegion, string> = {
  a: 'A',
  b: 'B',
  and: 'A ∩ B',
  or: 'A ∪ B',
  aOnly: 'A only',
  bOnly: 'B only',
  notA: 'not A',
  neither: 'neither',
};

function inTargetRegion(base: Base, t: VennRegion): boolean {
  switch (t) {
    case 'a':
      return base === 'aOnly' || base === 'both';
    case 'b':
      return base === 'bOnly' || base === 'both';
    case 'and':
      return base === 'both';
    case 'or':
      return base !== 'neither';
    case 'aOnly':
      return base === 'aOnly';
    case 'bOnly':
      return base === 'bOnly';
    case 'notA':
      return base === 'bOnly' || base === 'neither';
    case 'neither':
      return base === 'neither';
  }
}

/**
 * Sample-space Venn. Two events A, B over `total` equally-likely outcomes (drawn
 * as dots in the right regions). A verify run samples outcomes at random and the
 * running fraction landing in the target region converges to its probability.
 * The numeric target is hidden until the run starts.
 */
export default function Venn({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trials, setTrials] = useState(config.trials ?? 400);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const aOnly = Math.max(0, Math.round(eff.aOnly ?? 6));
  const bOnly = Math.max(0, Math.round(eff.bOnly ?? 6));
  const both = Math.max(0, Math.round(eff.both ?? 4));
  const neither = Math.max(0, Math.round(eff.neither ?? 4));
  const counts: Record<Base, number> = { aOnly, bOnly, both, neither };
  const total = aOnly + bOnly + both + neither;
  const target = VENN_REGION_ORDER[Math.round(eff.region ?? 0)] ?? 'a';
  const targetCount = (['aOnly', 'bOnly', 'both', 'neither'] as Base[]).reduce(
    (s, b) => s + (inTargetRegion(b, target) ? counts[b] : 0),
    0,
  );
  const trueProb = total === 0 ? 0 : targetCount / total;

  const stateRef = useRef({ hits: 0, processed: 0, total: 0, last: -1 });
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);
  const dimsRef = useRef<{ ctx: CanvasRenderingContext2D; width: number; height: number } | null>(
    null,
  );

  function geometry(width: number) {
    const cx = width / 2;
    const cy = 92;
    const r = Math.min(66, width * 0.22);
    const sep = r * 0.6;
    return { A: { x: cx - sep, y: cy }, B: { x: cx + sep, y: cy }, r };
  }

  function buildDots(width: number) {
    const { A, B, r } = geometry(width);
    const inA = (x: number, y: number) => (x - A.x) ** 2 + (y - A.y) ** 2 < r * r;
    const inB = (x: number, y: number) => (x - B.x) ** 2 + (y - B.y) ** 2 < r * r;
    const matches = (base: Base, x: number, y: number) => {
      const a = inA(x, y);
      const b = inB(x, y);
      if (base === 'aOnly') return a && !b;
      if (base === 'bOnly') return b && !a;
      if (base === 'both') return a && b;
      return !a && !b;
    };
    const dots: Dot[] = [];
    const x0 = 12;
    const x1 = width - 12;
    const y0 = 24;
    const y1 = 168;
    for (const base of ['aOnly', 'bOnly', 'both', 'neither'] as Base[]) {
      const n = counts[base];
      let made = 0;
      let tries = 0;
      while (made < n && tries < n * 600 + 400) {
        const x = x0 + Math.random() * (x1 - x0);
        const y = y0 + Math.random() * (y1 - y0);
        tries++;
        if (matches(base, x, y)) {
          dots.push({ x, y, inTarget: inTargetRegion(base, target) });
          made++;
        }
      }
    }
    dotsRef.current = dots;
  }

  function ensure() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    dimsRef.current = setupCanvas(canvas);
    buildDots(dimsRef.current.width);
    return dimsRef.current;
  }

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    const { A, B, r } = geometry(width);
    ctx.clearRect(0, 0, width, height);

    // Circles
    ctx.lineWidth = 1.5;
    for (const [ctr, label, lx] of [
      [A, 'A', A.x - r * 0.7],
      [B, 'B', B.x + r * 0.7],
    ] as const) {
      ctx.fillStyle = c.accentBg;
      ctx.beginPath();
      ctx.arc(ctr.x, ctr.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.borderStrong;
      ctx.beginPath();
      ctx.arc(ctr.x, ctr.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ctr.y - r + 2);
    }

    // Dots — target-region outcomes glow in the accent, others stay muted.
    for (const d of dotsRef.current) {
      ctx.fillStyle = d.inTarget ? c.accent : c.muted;
      ctx.globalAlpha = d.inTarget ? 0.95 : 0.4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (s.last >= 0 && dotsRef.current[s.last]) {
      const d = dotsRef.current[s.last];
      ctx.strokeStyle = c.textH;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Target label
    ctx.fillStyle = c.textH;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`P(${REGION_LABEL[target]}) = ?`, width / 2, 188);

    // Running estimate bar
    const reveal = mode === 'explore' || s.processed > 0;
    const estimate = s.processed > 0 ? s.hits / s.processed : 0;
    const barX = 24;
    const barW = width - 48;
    const barY = 200;
    const barH = 18;
    ctx.fillStyle = c.surface3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();
    if (estimate > 0) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barH, barW * estimate), barH, 9);
      ctx.fill();
    }
    if (reveal) {
      const tx = barX + barW * trueProb;
      ctx.strokeStyle = c.accent2;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY - 6);
      ctx.lineTo(tx, barY + barH + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = c.textH;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(estimate.toFixed(3), width / 2, barY + barH + 24);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${s.hits} of ${s.processed} outcomes`, width / 2, barY + barH + 40);
  }

  function run(n: number) {
    cancelAnimationFrame(rafRef.current);
    ensure();
    if (total === 0) return;
    const s = stateRef.current;
    s.hits = 0;
    s.processed = 0;
    s.total = n;
    s.last = -1;
    accRef.current = 0;
    const dots = dotsRef.current;
    const small = n <= 24;
    const perFrame = small ? 1 / 6 : Math.ceil(n / 70);
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < n; i++) {
        const idx = Math.floor(Math.random() * dots.length);
        s.last = idx;
        if (dots[idx]?.inTarget) s.hits++;
        s.processed++;
      }
      draw();
      if (s.processed < n) rafRef.current = requestAnimationFrame(tick);
      else onSettled?.();
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

  useEffect(() => {
    if (mode !== 'explore') return;
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.hits = 0;
    s.processed = 0;
    s.last = -1;
    ensure();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.trials ?? trials);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="258" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <RangeField label="Samples" value={trials} min={20} max={3000} onChange={setTrials} />
          <button type="button" className="btn" onClick={() => run(trials)}>
            Sample {trials}×
          </button>
        </div>
      )}
    </div>
  );
}
