type Sampler = (args: number[]) => number;

function bernoulli(p: number): number { return Math.random() < p ? 1 : 0; }

export const samplers: Record<string, Sampler> = {
  longRunFrequency: ([p]) => bernoulli(p),
  binomialPmf: ([n, k, p]) => {
    let h = 0; for (let i = 0; i < n; i++) if (Math.random() < p) h++;
    return h === k ? 1 : 0;
  },
  diceSum: ([sum]) => {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    return a + b === sum ? 1 : 0;
  },
  drawProbability: ([matches, deck]) => bernoulli(matches / deck),
  drawMatchesNoReplacement: ([matches, deck, draws]) => {
    let m = matches, d = deck;
    for (let i = 0; i < draws; i++) { if (Math.random() < m / d) { m--; d--; } else return 0; }
    return 1;
  },
  totalProbability2: ([w0, p0, w1, p1]) => {
    const pick0 = Math.random() < w0 / (w0 + w1);
    return bernoulli(pick0 ? p0 : p1);
  },
  bayesPosterior: ([prior, sens, spec]) => {
    for (;;) {
      const diseased = Math.random() < prior;
      const positive = diseased ? Math.random() < sens : Math.random() >= spec;
      if (positive) return diseased ? 1 : 0;
    }
  },
  montyHallSwitchWin: ([doors]) => {
    const car = Math.floor(Math.random() * doors);
    const pick = Math.floor(Math.random() * doors);
    return pick === car ? 0 : 1;
  },
  geometricMean: ([p]) => { let s = 1; while (Math.random() >= p) s++; return s; },
  poissonPmf: ([k, lambda]) => {
    const L = Math.exp(-lambda); let n = 0, prod = 1;
    do { n++; prod *= Math.random(); } while (prod > L);
    return (n - 1) === k ? 1 : 0;
  },
  randomWalkRMS: ([n]) => {
    let x = 0; for (let i = 0; i < n; i++) x += Math.random() < 0.5 ? 1 : -1;
    return x * x;
  },
  buffonProbability: ([L, d]) => {
    const theta = (Math.random() * Math.PI) / 2;
    const x = Math.random() * (d / 2);
    return x <= (L / 2) * Math.sin(theta) ? 1 : 0;
  },
  expectedValueWheel: (flat) => {
    const r = Math.random(); let acc = 0;
    for (let i = 0; i + 1 < flat.length; i += 2) { acc += flat[i + 1]; if (r <= acc) return flat[i]; }
    return flat[flat.length - 2];
  },
};
