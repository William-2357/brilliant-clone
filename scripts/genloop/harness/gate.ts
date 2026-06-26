import { spawnSync } from 'node:child_process';

export interface GateResult { ok: boolean; failed: string[]; logs: Record<string, string>; }

export function parseGateOutput(codes: Record<string, number>): GateResult {
  const failed = Object.entries(codes).filter(([, c]) => c !== 0).map(([k]) => k);
  return { ok: failed.length === 0, failed, logs: {} };
}

function run(cmd: string, args: string[]): { code: number; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/** Run tsc + eslint + vitest; return pass/fail with logs. */
export function runRepoGate(): GateResult {
  const tsc = run('npx', ['tsc', '-b']);
  const eslint = run('npx', ['eslint', '.']);
  const vitest = run('npx', ['vitest', 'run']);
  const res = parseGateOutput({ tsc: tsc.code, eslint: eslint.code, vitest: vitest.code });
  res.logs = { tsc: tsc.out, eslint: eslint.out, vitest: vitest.out };
  return res;
}
