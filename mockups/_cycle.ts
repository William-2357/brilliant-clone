import { generateProblem } from '../src/content/problemTemplates.ts';

const mk = (id: string) => ({ id, type: 'problem', title: '', body: '' }) as never;

console.log('--- l1-s2 (coin) across seeds ---');
for (const seed of [1, 2, 3, 4]) {
  const p = generateProblem('l1-coin-flip', mk('l1-s2'), seed) as { body: string; question: string; answer?: number };
  console.log(seed, '::', p.body, '|', p.question, '| ans', p.answer);
}

console.log('--- l5-s2 (EV) across seeds ---');
for (const seed of [1, 2, 3, 4]) {
  const p = generateProblem('l5-expected-value', mk('l5-s2'), seed) as { body: string; answer?: number };
  console.log(seed, '::', p.body, '| ans', p.answer);
}
