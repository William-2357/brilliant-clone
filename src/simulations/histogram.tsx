import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette, type SimPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';
import RangeField from '../components/RangeField';
import SimControls, { initParams, type ControlSpec } from './controls';

/**
 * Shared engine for discrete-distribution sims: repeatedly sample an integer
 * outcome, build a histogram, overlay the theoretical PMF (revealed only after the
 * run starts), and converge a running mean to the theoretical mean.
 */
export interface HistogramSpec {
  /** Build a sampler returning one integer outcome, from the step config. */
  sampler: (config: Record<string, number>) => () => number;
  /** Theoretical probability mass at bin k. */
  pmf: (config: Record<string, number>, k: number) => number;
  /** Theoretical mean (the target line + readout). */
  mean: (config: Record<string, number>) => number;
  /** Highest bin to display (outcomes above are clamped into it). */
  maxBin: (config: Record<string, number>) => number;
  meanLabel?: string;
  height?: number;
  runLabel?: string;
  /** Explore-mode controls overriding the defining params (verify ignores them). */
  controls?: ControlSpec[];
  /** Optional dependent-param clamp applied to the explore config (e.g. K ≤ N). */
  clampParams?: (p: Record<string, number>) => Record<string, number>;
}

export function makeHistogramSim(spec: HistogramSpec) {
  function Histogram({ config, mode, runSignal, onSettled }: SimulationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [trials, setTrials] = useState(config.trials ?? 1500);
    const specs = spec.controls ?? [];
    const [params, setParams] = useState(() => initParams(config, specs));
    const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));
    const eff =
      mode === 'explore' && specs.length
        ? spec.clampParams
          ? spec.clampParams({ ...config, ...params })
          : { ...config, ...params }
        : config;

    const maxBin = Math.max(1, Math.round(spec.maxBin(eff)));
    const theoMean = spec.mean(eff);

    const stateRef = useRef({ counts: [] as number[], processed: 0, sum: 0 });
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
      const c: SimPalette = simPalette();
      const s = stateRef.current;
      ctx.clearRect(0, 0, width, height);
      const reveal = mode === 'explore' || s.processed > 0;
      // Readout mode: 0 = running mean (default); 1 = probability of a target bin.
      const useK = (eff.readout ?? 0) === 1;
      const targetK = Math.round(eff.targetK ?? 0);

      const plot = { x: 30, y: 14, w: width - 44, h: height - 70 };
      const bins = maxBin + 1;
      const bw = plot.w / bins;
      // peak for scaling: max of empirical fraction and theoretical pmf
      let peak = 0.0001;
      for (let k = 0; k < bins; k++) {
        const emp = s.processed > 0 ? (s.counts[k] ?? 0) / s.processed : 0;
        peak = Math.max(peak, emp, spec.pmf(eff, k));
      }
      // bars
      for (let k = 0; k < bins; k++) {
        const emp = s.processed > 0 ? (s.counts[k] ?? 0) / s.processed : 0;
        const bh = (emp / peak) * plot.h;
        ctx.fillStyle = c.accent;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(plot.x + k * bw + 1.5, plot.y + plot.h - bh, Math.max(0, bw - 3), bh, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Outline the target bin when reading out P(X = k).
      if (useK && targetK >= 0 && targetK < bins) {
        ctx.strokeStyle = c.accent2;
        ctx.lineWidth = 2;
        ctx.strokeRect(plot.x + targetK * bw + 1, plot.y, Math.max(0, bw - 2), plot.h);
      }
      // theoretical overlay
      if (reveal) {
        ctx.strokeStyle = c.accent2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < bins; k++) {
          const ph = (spec.pmf(eff, k) / peak) * plot.h;
          const px = plot.x + k * bw + bw / 2;
          const py = plot.y + plot.h - ph;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // mean line (mean-readout mode only)
        if (!useK) {
          const mx = plot.x + Math.min(bins, theoMean) * bw;
          ctx.strokeStyle = c.warn;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mx, plot.y);
          ctx.lineTo(mx, plot.y + plot.h);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      // axis baseline
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plot.x, plot.y + plot.h);
      ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
      ctx.stroke();

      // readout
      ctx.textAlign = 'center';
      if (useK) {
        const est = s.processed > 0 ? (s.counts[targetK] ?? 0) / s.processed : 0;
        ctx.fillStyle = c.textH;
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.fillText(reveal ? est.toFixed(3) : '—', width / 2, plot.y + plot.h + 30);
        ctx.fillStyle = c.muted;
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(`P(X = ${targetK})`, width / 2, plot.y + plot.h + 46);
      } else {
        const mean = s.processed > 0 ? s.sum / s.processed : 0;
        ctx.fillStyle = c.textH;
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.fillText(reveal ? mean.toFixed(2) : '—', width / 2, plot.y + plot.h + 30);
        ctx.fillStyle = c.muted;
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(spec.meanLabel ?? 'running mean', width / 2, plot.y + plot.h + 46);
      }
    }

    function run(total: number) {
      cancelAnimationFrame(rafRef.current);
      ensure();
      const s = stateRef.current;
      s.counts = new Array(maxBin + 1).fill(0);
      s.processed = 0;
      s.sum = 0;
      accRef.current = 0;
      const sample = spec.sampler(eff);
      const small = total <= 24;
      const perFrame = small ? 1 / 5 : Math.ceil(total / 70);
      const tick = () => {
        const todo = scaledStep(accRef, perFrame);
        for (let i = 0; i < todo && s.processed < total; i++) {
          const v = sample();
          s.sum += v;
          const bin = Math.max(0, Math.min(maxBin, v));
          s.counts[bin] = (s.counts[bin] ?? 0) + 1;
          s.processed++;
        }
        draw();
        if (s.processed < total) rafRef.current = requestAnimationFrame(tick);
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

    // Explore: a new defining param means a new distribution — clear and redraw.
    useEffect(() => {
      if (mode !== 'explore') return;
      cancelAnimationFrame(rafRef.current);
      const s = stateRef.current;
      s.counts = [];
      s.processed = 0;
      s.sum = 0;
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
        <canvas ref={canvasRef} data-height={spec.height ?? 230} className="sim-canvas" />
        {mode === 'explore' && (
          <div className="sim-controls">
            {specs.length > 0 && <SimControls specs={specs} params={params} set={set} />}
            <RangeField label="Trials" value={trials} min={20} max={20000} onChange={setTrials} />
            <button type="button" className="btn" onClick={() => run(trials)}>
              {spec.runLabel ?? `Run ${trials}×`}
            </button>
          </div>
        )}
      </div>
    );
  }
  return Histogram;
}
