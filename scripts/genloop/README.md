# genloop — autonomous probability problem generator

Offline authoring pipeline. NOT part of the app bundle. Writes a self-verifying typed
problem bank to `src/content/generated/`. Answers always come from `src/lib/probability.ts`.

## Run

```bash
export CURSOR_API_KEY="cursor_..."
npm run genloop -- --count 20 --section s3-conditional --model composer-2.5
npm run genloop -- --count 5 --dry-run          # plan + agents, write nothing
```

## How correctness is guaranteed (no human gate)

1. The answer is `kernel.fn(...args)` from probability.ts — never the LLM's arithmetic.
2. A Monte-Carlo sampler must converge to that value.
3. (numeric/slider) An independent blind solver must reach the same number.
4. The app's own `validateStep()` must pass (answer accepted, wrong rejected, reachable).
5. Dedup rejects repeats; a heuristic rejects trivial/answer-in-prose problems.
6. The whole repo gate (`tsc -b && eslint . && vitest run`) must pass; on failure the
   batch is reverted. `generated.test.ts` recomputes every answer forever.

## Flags

`--count --section --interaction --tier --model --seed --dry-run`

## Manifest

Every attempt (accepted/rejected + reason) is logged to
`scripts/genloop/.manifest/<timestamp>.json` (git-ignored).
