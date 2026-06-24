import { test as base, expect, type Page } from '@playwright/test';

/**
 * Base test extended with an automatic guard: any uncaught exception thrown in
 * the page fails the test. This catches the most common "I broke something"
 * regressions (a render crash, a bad import, a runtime TypeError) on every route
 * the tests touch, without each test having to opt in.
 */
export const test = base.extend<{ failOnPageError: void }>({
  failOnPageError: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const onError = (err: Error) => errors.push(err.message);
      page.on('pageerror', onError);
      await use();
      page.off('pageerror', onError);
      expect(errors, `Uncaught page error(s):\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

let userCounter = 0;

/**
 * Register a fresh local-mode account through the real login UI and land in the
 * authenticated app. Each call uses a unique email so tests stay independent
 * (every test also gets its own browser context, hence its own localStorage).
 */
export async function signUp(page: Page): Promise<void> {
  const unique = `${Date.now()}-${userCounter++}`;
  await page.goto('/#/login');
  await expect(page.locator('.auth-card')).toBeVisible();
  await page.getByPlaceholder('Name').fill('E2E Tester');
  await page.locator('input[type="email"]').fill(`e2e-${unique}@test.local`);
  await page.locator('input[type="password"]').fill('test-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  // AuthGuard bounces unauthenticated users back to /login; leaving it means success.
  await page.waitForURL((url) => !url.hash.includes('/login'), { timeout: 15_000 });
  await expect(page.locator('.page-title')).toBeVisible();
}
