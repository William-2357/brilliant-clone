import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { getSimSpeed } from '../lib/simSpeed';
import { bayesPosterior } from '../lib/probability';
import SimControls, { initParams, type ControlSpec } from './controls';

const SPECS: ControlSpec[] = [
  { kind: 'range', key: 'prior', label: 'Prior P(disease)', min: 0.01, max: 0.5, step: 0.01 },
  { kind: 'range', key: 'sens', label: 'Sensitivity', min: 0.5, max: 1, step: 0.01 },
  { kind: 'range', key: 'spec', label: 'Specificity', min: 0.5, max: 1, step: 0.01 },
];

/**
 * Natural-frequency grid for Bayes' theorem. A population of `total` icons splits
 * into diseased / healthy by the prior; the run reveals test positives (true and
 * false) and counts up the posterior P(disease | positive) = TP / (TP + FP). The
 * posterior is hidden until the run starts.
 */
export default function BayesGrid({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState(() => initParams(config, SPECS));
  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
  const eff = mode === 'explore' ? { ...config, ...params } : config;

  const prior = Math.max(0, Math.min(1, eff.prior ?? 0.1));
  const sens = Math.max(0, Math.min(1, eff.sens ?? 0.9));
  const spec = Math.max(0, Math.min(1, eff.spec ?? 0.9));
  const total = Math.max(20, Math.round(eff.total ?? 100));
  const diseasedN = Math.round(total * prior);
  const healthyN = total - diseasedN;
  const tp = Math.round(diseasedN * sens);
  const fp = Math.round(healthyN * (1 - spec));
  const truePost = bayesPosterior(prior, sens, spec);

  const stateRef = useRef({ shown: 0, running: false });
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

  function draw() {
    const dims = dimsRef.current ?? ensure();
    if (!dims) return;
    const { ctx, width, height } = dims;
    const c = simPalette();
    const s = stateRef.current;
    ctx.clearRect(0, 0, width, height);
    const reveal = mode === 'explore' || s.running || s.shown > 0;

    const cols = Math.ceil(Math.sqrt(total * (width / Math.max(1, height - 60))));
    const rows = Math.ceil(total / cols);
    const cell = Math.min((width - 24) / cols, (height - 70) / rows);
    const r = Math.max(3, cell * 0.34);
    const ox = (width - cols * cell) / 2 + cell / 2;
    const oy = 18 + cell / 2;
    for (let i = 0; i < total; i++) {
      const cx = ox + (i % cols) * cell;
      const cy = oy + Math.floor(i / cols) * cell;
      const diseased = i < diseasedN;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = diseased ? c.warn : c.surface3;
      ctx.fill();
      if (reveal) {
        const isTP = diseased && i < tp;
        const isFP = !diseased && i >= diseasedN && i < diseasedN + fp;
        if (isTP || isFP) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = isTP ? c.accentStrong : c.bad;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Posterior readout
    ctx.textAlign = 'center';
    ctx.fillStyle = c.textH;
    ctx.font = '700 22px system-ui, sans-serif';
    const label = reveal ? `${(s.shown * 100).toFixed(1)}%` : '?';
    ctx.fillText(label, width / 2, height - 26);
    ctx.fillStyle = c.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(
      reveal ? `P(disease | positive) — ${tp} of ${tp + fp} positives are real` : 'P(disease | positive)',
      width / 2,
      height - 9,
    );
  }

  function run() {
    cancelAnimationFrame(rafRef.current);
    ensure();
    const s = stateRef.current;
    s.shown = 0;
    s.running = true;
    const tick = () => {
      const inc = (truePost / 45) * Math.max(0.25, getSimSpeed());
      s.shown = Math.min(truePost, s.shown + inc);
      draw();
      if (s.shown < truePost - 1e-9) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        s.shown = truePost;
        s.running = false;
        draw();
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
      <canvas ref={canvasRef} data-height="250" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <SimControls specs={SPECS} params={params} set={set} />
          <button type="button" className="btn" onClick={() => run()}>
            Reveal the positives
          </button>
        </div>
      )}
    </div>
  );
}
