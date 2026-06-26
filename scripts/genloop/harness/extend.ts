import { readFileSync, writeFileSync } from 'node:fs';
import type { NewKernelProposal } from '../types';

const PROB = 'src/lib/probability.ts';
const TEST = 'src/lib/probability.test.ts';

export function buildProbabilityPatch(existing: string, p: NewKernelProposal): string {
  const trimmed = existing.endsWith('\n') ? existing : existing + '\n';
  return `${trimmed}\n${p.source.trim()}\n`;
}

export function buildTestPatch(existing: string, p: NewKernelProposal): string {
  const withImport = existing.replace(
    /import \{\n([\s\S]*?)\n\} from '\.\/probability';/,
    (_m, names) => `import {\n${names}\n  ${p.name},\n} from './probability';`,
  );
  return `${withImport.trimEnd()}\n\ndescribe('generated: ${p.name}', () => {\n  ${p.vitestCase.trim()}\n});\n`;
}

/** Apply both patches to disk. Returns a revert() that restores the originals. */
export function applyNewKernel(p: NewKernelProposal): () => void {
  const prob0 = readFileSync(PROB, 'utf8');
  const test0 = readFileSync(TEST, 'utf8');
  writeFileSync(PROB, buildProbabilityPatch(prob0, p), 'utf8');
  writeFileSync(TEST, buildTestPatch(test0, p), 'utf8');
  return () => { writeFileSync(PROB, prob0, 'utf8'); writeFileSync(TEST, test0, 'utf8'); };
}
