import type { SimulationType } from '../types/lesson';
import { wheelConfig, EV_WHEEL } from './simData';

export interface SandboxSim {
  type: SimulationType;
  label: string;
  blurb: string;
  config: Record<string, number>;
}

/**
 * Free-play simulation catalog shared by the Sandbox page and the Home page's
 * "simulation to try" spotlight. Configs use mid-range, interactive counts so each
 * sim is lively the moment it opens in `explore` mode.
 */
export const SANDBOX_SIMS: SandboxSim[] = [
  {
    type: 'coinFlip',
    label: 'Coin Flip',
    blurb:
      'Flip a coin over and over and watch the running fraction of heads settle inside the $\\pm 2\\sqrt{p(1-p)/N}$ convergence band. The law of large numbers reels it back toward $p$, but only slowly — the band shrinks like $1/\\sqrt{N}$.',
    config: { flips: 200, p: 0.5 },
  },
  {
    type: 'diceRoll',
    label: 'Two Dice',
    blurb:
      'Roll two dice many times and stack their sums into a histogram. The shape is triangular because a $7$ can happen six ways while $2$ and $12$ each have only one.',
    config: { rolls: 300 },
  },
  {
    type: 'galtonBoard',
    label: 'Galton Board',
    blurb:
      'Drop balls through a lattice of pegs and watch them pile into a bell curve. Each peg is a left/right coin flip, so the bins follow the binomial — skew the right-bounce chance to lean the bell to one side.',
    config: { rows: 12, balls: 300, p: 0.5 },
  },
  {
    type: 'randomWalk',
    label: 'Random Walk',
    blurb:
      'Send a fan of $\\pm 1$ random walks stepping out from the origin. They drift with the bias $p$ but spread only as fast as $\\sqrt{n}$, so the typical distance grows far slower than the number of steps.',
    config: { steps: 120, p: 0.5 },
  },
  {
    type: 'clt',
    label: 'Central Limit',
    blurb:
      'Average $m$ draws from a lumpy parent distribution and plot the sample means. However skewed the parent is, the central limit theorem pulls those averages toward a smooth normal bell as $m$ grows.',
    config: { parent: 0, m: 8, samples: 600 },
  },
  {
    type: 'expectedValue',
    label: 'Expected Value',
    blurb:
      'Spin a weighted prize wheel and track the running average of your winnings. Each slice contributes value times probability, so the average homes in on the expected value $E[X]=\\sum x\\,p(x)$.',
    config: wheelConfig(EV_WHEEL),
  },
  {
    type: 'conditional',
    label: 'Conditional',
    blurb:
      'Draw cards one at a time without replacement and watch how each draw reshapes the deck. Because the remaining cards shift, the conditional probability of the next card depends on everything already seen.',
    config: { metric: 0, scaleMax: 0.15 },
  },
  {
    type: 'montyHall',
    label: 'Monty Hall',
    blurb:
      'Pick one of three doors, watch the host reveal a goat behind another, then switch or stay. Switching wins $2/3$ of the time, because the host’s forced choice quietly concentrates the odds on the last door.',
    config: { doors: 3 },
  },
  {
    type: 'venn',
    label: 'Venn',
    blurb:
      'Sample equally-likely outcomes and read any region’s probability straight off the Venn diagram. It’s a hands-on way to see how unions, intersections, and complements combine the underlying counts.',
    config: { aOnly: 8, bOnly: 10, both: 6, neither: 6, region: 2, trials: 500 },
  },
  {
    type: 'countingTree',
    label: 'Counting Tree',
    blurb:
      'Watch the choices fan out stage by stage into a branching tree. The number of leaves is the product of the options at each stage — the multiplication principle made visible.',
    config: { slots: 3, o0: 3, o1: 4, o2: 2 },
  },
  {
    type: 'arrangements',
    label: 'Arrangements',
    blurb:
      'List out every ordered arrangement of $r$ items chosen from $n$. The total is the permutation $nPr = n!/(n-r)!$, since each filled slot leaves one fewer choice for the next.',
    config: { n: 4, r: 3 },
  },
  {
    type: 'pascal',
    label: 'Pascal',
    blurb:
      'Watch the sums trickle down Pascal’s triangle and funnel into the target square $\\binom{n}{k}$. That single value counts both the $k$-element subsets of $n$ and the lattice paths into the cell.',
    config: { n: 6, k: 3 },
  },
  {
    type: 'starsBars',
    label: 'Stars & Bars',
    blurb:
      'Slide bars between identical stars to split items among distinct boxes. Every star-and-bar pattern is one distribution, so the count is $\\binom{n+b-1}{b-1}$.',
    config: { stars: 5, boxes: 3 },
  },
  {
    type: 'matching',
    label: 'Hat-Check',
    blurb:
      'Hand back $n$ hats at random and watch how often nobody gets their own. The chance of zero matches settles near $1/e \\approx 0.368$ and barely budges once $n$ is large.',
    config: { n: 6, metric: 0, trials: 3000 },
  },
  {
    type: 'urnTree',
    label: 'Urn Tree',
    blurb:
      'Pick an urn according to its weight, then draw a ball from inside it. Averaging the draw probability over which urn you chose is exactly the law of total probability.',
    config: { urns: 2, w0: 7, p0: 0.9, w1: 3, p1: 0.2, trials: 1500 },
  },
  {
    type: 'bayesGrid',
    label: 'Bayes Grid',
    blurb:
      'Lay out a whole population and reveal its true positives, false positives, and the rest. Reading $P(\\text{disease}\\mid+)$ off the grid shows why a positive test can still mean low risk when the disease is rare.',
    config: { prior: 0.1, sens: 0.9, spec: 0.9, total: 100 },
  },
  {
    type: 'expectedSteps',
    label: 'Expected Steps',
    blurb:
      'Repeat an experiment until the target event finally happens, then average the number of trials it took. That mean waiting time is the reciprocal of the event’s probability, $1/p$.',
    config: { kind: 0, faces: 6, trials: 2000 },
  },
  {
    type: 'scatter',
    label: 'Scatter',
    blurb:
      'Tune the correlation $\\rho$ and watch the point cloud morph from a round blob to a tight diagonal. Correlation captures only the linear trend — not the slope, and not any curved relationship.',
    config: { rho: 0.6, n: 220 },
  },
  {
    type: 'waitingTime',
    label: 'Geometric',
    blurb:
      'Count the trials up to and including the first success and stack them into a histogram. The bars decay geometrically and the average waiting time lands at $1/p$.',
    config: { p: 0.4, trials: 1500 },
  },
  {
    type: 'poisson',
    label: 'Poisson',
    blurb:
      'Tally how many rare events fall in each fixed interval and watch the Poisson shape emerge. With rate $\\lambda$ the distribution has mean and variance both equal to $\\lambda$.',
    config: { lambda: 3, trials: 1500 },
  },
  {
    type: 'tailBound',
    label: 'Chebyshev',
    blurb:
      'Compare how often a sample lands beyond $k$ standard deviations against Chebyshev’s $1/k^2$ guarantee. The bound always holds but is famously loose, since it must cover every distribution at once.',
    config: { k: 2, trials: 4000 },
  },
  {
    type: 'markov',
    label: 'Markov Chain',
    blurb:
      'A token hops between states using fixed transition probabilities. Track the long-run share of time spent in each state and watch it converge to the stationary distribution, no matter where it started.',
    config: { states: 2, t00: 0.8, t01: 0.2, t10: 0.5, t11: 0.5, targetState: 0, trials: 3000 },
  },
  {
    type: 'branching',
    label: 'Branching',
    blurb:
      'Each individual independently spawns a random number of offspring, generation after generation. Whether the family line survives forever or dies out hinges on whether the mean offspring count tops $1$.',
    config: { maxOffspring: 2, p0: 0.25, p1: 0.25, p2: 0.5, trials: 2000 },
  },
  {
    type: 'dartThrow',
    label: 'Dart Throw',
    blurb:
      'Scatter darts uniformly over the square and count how many land inside the target region. The fraction that hit converges to the region’s area — geometric probability in action.',
    config: { shape: 0, size: 0.5, trials: 1500 },
  },
  {
    type: 'buffon',
    label: 'Buffon’s Needle',
    blurb:
      'Drop needles onto a floor of evenly ruled lines and tally how many cross a line. The crossing rate works out to $2L/(\\pi d)$, so the experiment quietly estimates $\\pi$.',
    config: { L: 1, trials: 2000 },
  },
  {
    type: 'orderStats',
    label: 'Order Statistics',
    blurb:
      'Sample $n$ uniform points, sort them, and follow the $r$-th smallest one. Its average sits at $r/(n+1)$, spacing the order statistics evenly across the interval.',
    config: { n: 5, r: 5, trials: 2000 },
  },
  {
    type: 'hypergeometric',
    label: 'Hypergeometric',
    blurb:
      'Draw a handful from a finite pool without replacement and count the successes. Unlike the binomial, each draw changes the remaining mix — that dependence is the hypergeometric distribution.',
    config: { N: 52, K: 13, n: 5, trials: 2000 },
  },
  {
    type: 'uniformLine',
    label: 'Uniform',
    blurb:
      'Drop points uniformly along a line segment and watch where they fall. The chance of landing in any band equals that band’s length, the continuous analogue of equally-likely outcomes.',
    config: { mode: 0, lo: 0.25, hi: 0.6, trials: 1200 },
  },
  {
    type: 'randomChord',
    label: 'Bertrand Chord',
    blurb:
      'Draw “random” chords of a circle three different ways and see how often each beats the inscribed triangle’s side. The three methods give three different answers — the heart of Bertrand’s paradox.',
    config: { method: 0, trials: 1500 },
  },
  {
    type: 'blackjackEdge',
    label: 'Blackjack Edge',
    blurb:
      'Play perfect basic strategy for tens of thousands of hands — the cumulative net still sinks below zero. That gap is the house edge $E[\\text{net}] < 0$, which only separates from the noise in the long run.',
    config: { decks: 6, hands: 100000 },
  },
];
