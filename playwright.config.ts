import { defineConfig, devices } from '@playwright/test';

// Distinctive port (outside Vite's 5173+ auto-increment range) reserved for the
// e2e test server, so we never accidentally reuse a developer's `npm run dev`.
const PORT = 53117;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Playwright config for The Long Run.
 *
 * The web server is started with `--mode test` so Vite loads `.env.test`, which
 * blanks the Firebase vars and forces the localStorage backend — tests are then
 * deterministic, offline, and isolated from the production Firebase project. A
 * dedicated port (5174) avoids colliding with a normal `npm run dev` on 5173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:test',
    url: BASE_URL,
    // Always start our own fresh server (in `test` mode → localStorage backend).
    // Never reuse a stray server, which could be an older build or Firebase mode.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
