import { useEffect, useRef, useState } from 'react';
import type { SimulationProps } from './types';
import { setupCanvas, simPalette } from './canvasUtils';
import { scaledStep } from '../lib/simSpeed';

/**
 * The Central Limit Theorem. Repeatedly draws a sample of size m from a chosen
 * parent and histograms the sample means. However jagged the parent (shown as
 * the inset), the means pile into a bell centered on μ with spread σ/√m.
 *
 * Two parents:
 *   • Fair die  — discrete uniform on 1..6 (μ = 3.5, σ = √(35/12)).
 *   • Lopsided  — a right-skewed continuous distribution whose mean and standard
 *     deviation the learner sets directly with sliders (X = μ + σ·(Exp(1) − 1),
 *     which has exactly that mean and SD but a long right tail).
 *
 * The normal overlay and μ line reveal the answer, so they stay hidden until a
 * batch runs. The means histogram auto-zooms around μ for the lopsided parent.
 */
const BINS = 60;
const DIE_SD = Math.sqrt(35 / 12);

function rangeFor(die: boolean, mean: number, sd: number, m: number): [number, number] {
  if (die) return [1, 6];
  const pad = Math.max(4.5 * (sd / Math.sqrt(Math.max(1, m))), 0.6);
  return [mean - pad, mean + pad];
}

export default function CLT({ config, mode, runSignal, onSettled }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parentIdx, setParentIdx] = useState(Math.round(config.parent ?? 0));
  const [m, setM] = useState(config.m ?? 10);
  // Learner-tunable mean / spread for the lopsided parent.
  const [muL, setMuL] = useState(3.5);
  const [sdL, setSdL] = useState(1.2);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRunRef = useRef(runSignal);

  const isDie = parentIdx === 0;
  const mean = isDie ? 3.5 : muL;
  const sd = isDie ? DIE_SD : sdL;

  const stateRef = useRef({
    counts: new Array(BINS).fill(0) as number[],
    processed: 0,
    total: 0,
    sum: 0,
    sumSq: 0,
    m,
    die: isDie,
    mean,
    sd,
    lo: 1,
    hi: 6,
    settled: false,
  });

  function sampleValue(): number {
    if (isDie) return 1 + Math.floor(Math.random() * 6);
    const e = -Math.log(1 - Math.random()); // Exp(1): mean 1, sd 1
    return muL + sdL * (e - 1);
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const s = stateRef.current;
    const c = simPalette();
    ctx.clearRect(0, 0, width, height);
    const ran = s.total > 0;
    // Use the settings captured at run time once a batch exists, so the bars and
    // axis always agree; otherwise preview the current (live) parent settings.
    const die = ran ? s.die : isDie;
    const dMean = ran ? s.mean : mean;
    const dSd = ran ? s.sd : sd;
    const dM = ran ? s.m : m;
    const [lo, hi] = ran ? [s.lo, s.hi] : rangeFor(die, dMean, dSd, dM);
    const reveal = mode === 'explore' || s.processed > 0;
    const SE = dSd / Math.sqrt(Math.max(1, dM));

    // Parent inset (top-left) — always reflects the live selection.
    const inX = 12;
    const inY = 30;
    const inW = 138;
    const inH = 56;
    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`parent: ${isDie ? 'Fair die' : 'Lopsided'}`, inX, inY - 6);
    if (isDie) {
      const pbW = inW / 6;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = c.muted;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(inX + i * pbW + 1, inY + 6, pbW - 2, inH - 6);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = c.muted;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(inX, inY + inH);
      for (let k = 0; k <= 28; k++) {
        const f = k / 28;
        const dens = Math.exp(-5 * f); // right-skewed: tall left, long right tail
        ctx.lineTo(inX + f * inW, inY + inH - dens * inH);
      }
      ctx.lineTo(inX + inW, inY + inH);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inX, inY + inH + 0.5);
    ctx.lineTo(inX + inW, inY + inH + 0.5);
    ctx.stroke();

    // Readout (top-right)
    ctx.textAlign = 'right';
    ctx.fillStyle = c.textH;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`sample size m = ${dM}`, width - 14, 22);
    if (s.settled) {
      const obsMean = s.processed > 0 ? s.sum / s.processed : 0;
      const obsSE =
        s.processed > 0 ? Math.sqrt(Math.max(0, s.sumSq / s.processed - obsMean ** 2)) : 0;
      ctx.fillStyle = c.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`center ${obsMean.toFixed(2)} · std error ${obsSE.toFixed(3)}`, width - 14, 40);
    }

    // Sample-mean histogram
    const plotLeft = 34;
    const plotRight = width - 14;
    const plotTop = 104;
    const plotBottom = height - 22;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const xToPx = (v: number) => plotLeft + ((v - lo) / (hi - lo)) * plotW;
    const binW = plotW / BINS;
    const binValW = (hi - lo) / BINS;

    const maxCount = Math.max(1, ...s.counts);
    const peakPred = reveal && SE > 0 ? (s.total * binValW) / (SE * Math.sqrt(2 * Math.PI)) : 0;
    const denom = Math.max(maxCount, peakPred, 1);
    const yToPx = (count: number) => plotBottom - (count / denom) * plotH;

    ctx.fillStyle = c.accent;
    for (let b = 0; b < BINS; b++) {
      if (s.counts[b] <= 0) continue;
      const h = (s.counts[b] / denom) * plotH;
      ctx.fillRect(plotLeft + b * binW, plotBottom - h, Math.max(1, binW - 0.5), h);
    }

    if (reveal && SE > 0) {
      ctx.strokeStyle = c.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let first = true;
      for (let px = 0; px <= plotW; px += 2) {
        const v = lo + (px / plotW) * (hi - lo);
        const pdf = Math.exp(-((v - dMean) ** 2) / (2 * SE * SE)) / (SE * Math.sqrt(2 * Math.PI));
        const y = yToPx(s.total * binValW * pdf);
        if (first) {
          ctx.moveTo(plotLeft + px, y);
          first = false;
        } else {
          ctx.lineTo(plotLeft + px, y);
        }
      }
      ctx.stroke();

      const mx = xToPx(dMean);
      ctx.strokeStyle = c.accentStrong;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, plotTop);
      ctx.lineTo(mx, plotBottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.accentStrong;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`μ = ${dMean.toFixed(2)}`, mx, plotTop - 2);
    }

    // Axis baseline + ticks
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom + 0.5);
    ctx.lineTo(plotRight, plotBottom + 0.5);
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (die) {
      for (let v = 1; v <= 6; v++) ctx.fillText(String(v), xToPx(v), plotBottom + 5);
    } else {
      for (const v of [lo, (lo + hi) / 2, hi]) {
        ctx.fillText(v.toFixed(1), xToPx(v), plotBottom + 5);
      }
    }

    ctx.fillStyle = c.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`sample means (n=${s.processed})`, plotLeft, plotTop - 14);
  }

  function run(samples: number) {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.counts = new Array(BINS).fill(0);
    s.processed = 0;
    s.total = samples;
    s.sum = 0;
    s.sumSq = 0;
    s.m = m;
    s.die = isDie;
    s.mean = mean;
    s.sd = sd;
    [s.lo, s.hi] = rangeFor(isDie, mean, sd, m);
    s.settled = false;
    accRef.current = 0;
    const span = s.hi - s.lo;
    const binOf = (x: number) =>
      Math.max(0, Math.min(BINS - 1, Math.floor(((x - s.lo) / span) * BINS)));
    const perFrame = Math.max(1, Math.ceil(samples / 70));
    const tick = () => {
      const todo = scaledStep(accRef, perFrame);
      for (let i = 0; i < todo && s.processed < samples; i++) {
        let acc = 0;
        for (let j = 0; j < s.m; j++) acc += sampleValue();
        const mean_ = acc / s.m;
        s.counts[binOf(mean_)]++;
        s.sum += mean_;
        s.sumSq += mean_ * mean_;
        s.processed++;
      }
      draw();
      if (s.processed < samples) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!s.settled) {
        s.settled = true;
        onSettled?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repaint when the live parent settings change so the inset/axis preview tracks
  // the sliders (the histogram keeps its last run's data until you draw again).
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentIdx, muL, sdL, m]);

  useEffect(() => {
    if (mode === 'verify' && runSignal !== lastRunRef.current) {
      lastRunRef.current = runSignal;
      run(config.samples ?? 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="sim">
      <canvas ref={canvasRef} data-height="300" className="sim-canvas" />
      {mode === 'explore' && (
        <div className="sim-controls">
          <div className="sim-toggle">
            <button
              type="button"
              className={`btn ${isDie ? 'btn-primary' : ''}`}
              onClick={() => setParentIdx(0)}
            >
              Fair die
            </button>
            <button
              type="button"
              className={`btn ${!isDie ? 'btn-primary' : ''}`}
              onClick={() => setParentIdx(1)}
            >
              Lopsided
            </button>
          </div>
          {!isDie && (
            <>
              <label className="sim-slider">
                <span>Lopsided mean μ: {muL.toFixed(1)}</span>
                <input
                  type="range"
                  min={1.5}
                  max={5.5}
                  step={0.1}
                  value={muL}
                  onChange={(e) => setMuL(Number(e.target.value))}
                />
              </label>
              <label className="sim-slider">
                <span>Lopsided spread σ: {sdL.toFixed(1)}</span>
                <input
                  type="range"
                  min={0.4}
                  max={2.5}
                  step={0.1}
                  value={sdL}
                  onChange={(e) => setSdL(Number(e.target.value))}
                />
              </label>
            </>
          )}
          <label className="sim-slider">
            <span>Sample size m: {m}</span>
            <input
              type="range"
              min={1}
              max={60}
              value={m}
              onChange={(e) => setM(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn" onClick={() => run(600)}>
            Draw 600 sample means
          </button>
        </div>
      )}
    </div>
  );
}
