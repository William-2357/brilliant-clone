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
    blurb: 'Watch the running fraction settle inside the $\\pm 2\\sqrt{p(1-p)/N}$ convergence band.',
    config: { flips: 200, p: 0.5 },
  },
  {
    type: 'diceRoll',
    label: 'Two Dice',
    blurb: 'Roll two dice and build the triangular distribution of their sums.',
    config: { rolls: 300 },
  },
  {
    type: 'galtonBoard',
    label: 'Galton Board',
    blurb: 'Drop balls through the pegs — skew the right-bounce chance to lean the bell.',
    config: { rows: 12, balls: 300, p: 0.5 },
  },
  {
    type: 'randomWalk',
    label: 'Random Walk',
    blurb: 'Send a fan of $\\pm 1$ walks drifting and spreading like $\\sqrt{n}$.',
    config: { steps: 120, p: 0.5 },
  },
  {
    type: 'clt',
    label: 'Central Limit',
    blurb: 'Average samples from any parent and watch the means go normal.',
    config: { parent: 0, m: 8, samples: 600 },
  },
  {
    type: 'expectedValue',
    label: 'Expected Value',
    blurb: 'Spin a weighted wheel and track the running average toward its EV.',
    config: wheelConfig(EV_WHEEL),
  },
  {
    type: 'birthday',
    label: 'Birthday',
    blurb: 'Fill a room and see how soon a shared birthday appears.',
    config: { people: 23 },
  },
  {
    type: 'conditional',
    label: 'Conditional',
    blurb: 'Draw cards without replacement and watch the odds update.',
    config: { metric: 0, scaleMax: 0.15 },
  },
  {
    type: 'montyHall',
    label: 'Monty Hall',
    blurb: 'Pick a door, watch a goat revealed, then switch or stay.',
    config: { doors: 3 },
  },
];
