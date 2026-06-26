import { defineConfig } from 'vitest/config';

// Unit tests for the owned answer functions (probability.ts and friends) plus the
// offline problem-generator harness under scripts/genloop. Scoped to these test
// files so it never picks up the Playwright e2e specs, and runs in the node
// environment (the functions under test are pure).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/genloop/**/*.test.ts'],
    environment: 'node',
  },
});
