import type { ComponentType } from 'react';
import type { SimulationType } from '../types/lesson';
import type { SimulationProps } from './types';
import CoinFlip from './CoinFlip';
import DiceRoll from './DiceRoll';
import GaltonBoard from './GaltonBoard';
import BirthdayProblem from './BirthdayProblem';
import ExpectedValue from './ExpectedValue';
import ConditionalProbability from './ConditionalProbability';
import MontyHall from './MontyHall';
import RandomWalk from './RandomWalk';
import CLT from './CLT';

export const simulations: Record<SimulationType, ComponentType<SimulationProps>> = {
  coinFlip: CoinFlip,
  diceRoll: DiceRoll,
  galtonBoard: GaltonBoard,
  birthday: BirthdayProblem,
  expectedValue: ExpectedValue,
  conditional: ConditionalProbability,
  montyHall: MontyHall,
  randomWalk: RandomWalk,
  clt: CLT,
};
