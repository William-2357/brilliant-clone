import { makeRng } from '../../src/lib/rng';
import { kernels } from '../../src/content/generated/kernels';
import type { InteractionType } from '../../src/types/lesson';
import type { PlanTarget } from './types';
import type { Tier } from '../../src/content/generated/index';

const MIX: Array<[InteractionType, number]> = [
  ['numeric', 0.45], ['slider', 0.15], ['order', 0.15], ['draw', 0.15], ['wheel', 0.10],
];
const TIERS: Tier[] = ['school', 'mc-school', 'mc-chapter', 'amc'];

export interface PlanOpts { count: number; seed: number; sectionId?: string; interaction?: InteractionType; tier?: Tier; }

/** Roll an interaction by the configured mix weights. */
function rollInteraction(r: ReturnType<typeof makeRng>): InteractionType {
  const roll = r.next();
  let acc = 0;
  for (const [it, w] of MIX) { acc += w; if (roll <= acc) return it; }
  return 'numeric';
}

/**
 * Interaction-first planning: roll the target interaction by mix weight, then pick a
 * kernel that supports it. Interactions with no supporting kernel (e.g. order/draw
 * until those kernels exist) are simply re-rolled, so the mix is honored among the
 * interactions that are actually buildable.
 */
export function planBatch(opts: PlanOpts): PlanTarget[] {
  const r = makeRng(opts.seed >>> 0);
  const all = Object.values(kernels).filter((k) => !opts.sectionId || k.sectionIds.includes(opts.sectionId));
  if (all.length === 0) throw new Error(`no kernels for section ${opts.sectionId}`);
  const targets: PlanTarget[] = [];
  let guard = 0;
  while (targets.length < opts.count && guard < opts.count * 40) {
    guard++;
    const interaction = opts.interaction ?? rollInteraction(r);
    const candidates = all.filter((k) => k.interactions.includes(interaction));
    if (candidates.length === 0) continue;
    const kernel = candidates[r.int(0, candidates.length - 1)];
    const sectionId = opts.sectionId ?? kernel.sectionIds[r.int(0, kernel.sectionIds.length - 1)];
    const tier = opts.tier ?? TIERS[r.int(0, TIERS.length - 1)];
    targets.push({ sectionId, kernel: kernel.name, interaction, tier, seed: r.int(1, 2 ** 30) });
  }
  return targets;
}
