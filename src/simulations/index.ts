import { createElement, lazy, Suspense, type ComponentType } from 'react';
import type { SimulationType } from '../types/lesson';
import type { SimulationProps } from './types';

/**
 * Per-sim dynamic-import loaders. Each one becomes its own chunk, so only the
 * simulation actually on screen is downloaded — the main bundle no longer ships
 * all engines eagerly. Add a new sim by adding its loader here (and its key to
 * the `SimulationType` union in types/lesson.ts).
 */
const loaders: Record<SimulationType, () => Promise<{ default: ComponentType<SimulationProps> }>> = {
  coinFlip: () => import('./CoinFlip'),
  diceRoll: () => import('./DiceRoll'),
  galtonBoard: () => import('./GaltonBoard'),
  expectedValue: () => import('./ExpectedValue'),
  conditional: () => import('./ConditionalProbability'),
  montyHall: () => import('./MontyHall'),
  randomWalk: () => import('./RandomWalk'),
  clt: () => import('./CLT'),
  venn: () => import('./Venn'),
  countingTree: () => import('./CountingTree'),
  arrangements: () => import('./Arrangements'),
  pascal: () => import('./Pascal'),
  starsBars: () => import('./StarsBars'),
  matching: () => import('./Matching'),
  urnTree: () => import('./UrnTree'),
  bayesGrid: () => import('./BayesGrid'),
  expectedSteps: () => import('./ExpectedSteps'),
  scatter: () => import('./Scatter'),
  waitingTime: () => import('./WaitingTime'),
  poisson: () => import('./Poisson'),
  tailBound: () => import('./TailBound'),
  markov: () => import('./Markov'),
  branching: () => import('./Branching'),
  dartThrow: () => import('./DartThrow'),
  buffon: () => import('./Buffon'),
  orderStats: () => import('./OrderStats'),
  randomChord: () => import('./RandomChord'),
  hypergeometric: () => import('./Hypergeometric'),
  uniformLine: () => import('./UniformLine'),
  blackjackEdge: () => import('./BlackjackEdge'),
};

/**
 * Wrap a lazily-loaded sim in its own Suspense boundary so every consumer
 * (LessonPlayer, Sandbox, etc.) can keep rendering `simulations[type]` as an
 * ordinary component — no Suspense plumbing required at the call sites.
 */
function lazySim(type: SimulationType): ComponentType<SimulationProps> {
  const Lazy = lazy(loaders[type]);
  const Wrapped = (props: SimulationProps) =>
    createElement(
      Suspense,
      { fallback: createElement('div', { className: 'sim sim-loading' }) },
      createElement(Lazy, props),
    );
  Wrapped.displayName = `LazySim(${type})`;
  return Wrapped;
}

export const simulations = Object.fromEntries(
  (Object.keys(loaders) as SimulationType[]).map((t) => [t, lazySim(t)]),
) as Record<SimulationType, ComponentType<SimulationProps>>;
