import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GeneratedProblem } from '../../../src/content/generated/index';

const SECTION_FILES: Record<string, string> = {
  's1-foundations': 'src/content/generated/foundations.ts',
  's2-combinatorics': 'src/content/generated/combinatorics.ts',
  's3-conditional': 'src/content/generated/conditional.ts',
  's4-expectation': 'src/content/generated/expectation.ts',
  's5-distributions': 'src/content/generated/distributions.ts',
  's6-limit-theorems': 'src/content/generated/limit.ts',
  's7-stochastic': 'src/content/generated/stochastic.ts',
  's8-geometric': 'src/content/generated/geometric.ts',
};

/** A TS object-literal for one entry. JSON.stringify handles all escaping. */
export function renderEntry(g: GeneratedProblem): string {
  const j = JSON.stringify(g, null, 2)
    .replace(/^/gm, '  ')
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:');
  return j;
}

function sectionFile(sectionId: string): string {
  const f = SECTION_FILES[sectionId];
  if (!f) throw new Error(`no bank file mapped for section ${sectionId}`);
  return f;
}

const ARRAY_NAME: Record<string, string> = {
  's1-foundations': 'foundationsProblems',
  's2-combinatorics': 'combinatoricsProblems',
  's3-conditional': 'conditionalProblems',
  's4-expectation': 'expectationProblems',
  's5-distributions': 'distributionsProblems',
  's6-limit-theorems': 'limitProblems',
  's7-stochastic': 'stochasticProblems',
  's8-geometric': 'geometricProblems',
};

/** Insert one rendered entry before the closing `];` of the section's exported array. */
export function appendEntry(g: GeneratedProblem): void {
  const file = sectionFile(g.sectionId);
  const arr = ARRAY_NAME[g.sectionId];
  const src = readFileSync(file, 'utf8');
  const marker = `export const ${arr}: GeneratedProblem[] = [`;
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`array ${arr} not found in ${file}`);
  const close = src.indexOf('];', at);
  const head = src.slice(0, close);
  const tail = src.slice(close);
  const sep = head.trimEnd().endsWith('[') ? '\n' : '';
  const block = `${sep}${renderEntry(g)},\n`;
  writeFileSync(file, head + block + tail, 'utf8');
}

const SNAP = 'scripts/genloop/.manifest/snapshot';
export function snapshotBank(): void {
  rmSync(SNAP, { recursive: true, force: true });
  mkdirSync(dirname(SNAP), { recursive: true });
  cpSync('src/content/generated', SNAP, { recursive: true });
}
export function restoreBank(): void {
  if (existsSync(SNAP)) { rmSync('src/content/generated', { recursive: true, force: true }); cpSync(SNAP, 'src/content/generated', { recursive: true }); }
}
