import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { InteractionType } from '../../src/types/lesson';
import type { Tier, GeneratedProblem } from '../../src/content/generated/index';
import { generatedProblems } from '../../src/content/generated/index';
import { planBatch } from './planner';
import { runOne, type Deps } from './orchestrator';
import { Deduper } from './harness/dedup';
import { appendEntry, snapshotBank, restoreBank } from './harness/emit';
import { runRepoGate } from './harness/gate';
import { SdkCaller } from './sdkClient';
import { kernels } from '../../src/content/generated/kernels';
import { runWriter } from './agents/writer';
import { runVerifier } from './agents/verifier';
import { runSolver } from './agents/solver';
import { runFormatter } from './agents/formatter';

export interface Flags {
  count: number; sectionId?: string; interaction?: InteractionType; tier?: Tier;
  model: string; dryRun: boolean; seed: number;
}

export function parseFlags(argv: string[]): Flags {
  const get = (k: string): string | undefined => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    count: Number(get('--count') ?? 10),
    sectionId: get('--section'),
    interaction: get('--interaction') as InteractionType | undefined,
    tier: get('--tier') as Tier | undefined,
    model: get('--model') ?? 'composer-2.5',
    dryRun: argv.includes('--dry-run'),
    seed: Number(get('--seed') ?? Date.now() % 2_000_000_000),
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) { console.error('Set CURSOR_API_KEY'); process.exit(1); }

  const caller = new SdkCaller(apiKey, flags.model);
  const deduper = new Deduper();
  deduper.seed(generatedProblems.map((g) => ({ kernel: g.kernel, args: g.args, prose: g.step.body })));

  const deps: Deps = {
    writer: (t, avoid) => runWriter(caller, t, kernels[t.kernel], avoid),
    verifier: (s, a) => runVerifier(caller, s, a),
    solver: (sc, q) => runSolver(caller, sc, q),
    formatter: (s, a) => runFormatter(caller, s, a),
    deduper,
    model: flags.model,
  };

  const targets = planBatch({ count: flags.count, seed: flags.seed, sectionId: flags.sectionId, interaction: flags.interaction, tier: flags.tier });
  const accepted: GeneratedProblem[] = [];
  const manifest: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await runOne(target, deps);
      if (result.status !== 'rejected') break;
    }
    manifest.push({ target, status: result!.status, reason: result!.status !== 'accepted' ? (result as { reason: string }).reason : undefined });
    if (result!.status === 'accepted') accepted.push(result!.problem);
  }

  console.log(`Planned ${targets.length}, accepted ${accepted.length}.`);

  mkdirSync('scripts/genloop/.manifest', { recursive: true });
  writeFileSync(join('scripts/genloop/.manifest', `${Date.now()}.json`), JSON.stringify(manifest, null, 2));

  if (flags.dryRun) { console.log('Dry run — no files written.'); return; }
  if (accepted.length === 0) { console.log('Nothing accepted.'); return; }

  snapshotBank();
  for (const g of accepted) appendEntry(g);
  const gate = runRepoGate();
  if (!gate.ok) {
    restoreBank();
    console.error(`Repo gate FAILED (${gate.failed.join(', ')}); reverted ${accepted.length} entries.`);
    console.error(gate.logs[gate.failed[0]]?.slice(-2000) ?? '');
    process.exit(2);
  }
  console.log(`Wrote ${accepted.length} problems; repo gate passed.`);
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('run.ts')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
