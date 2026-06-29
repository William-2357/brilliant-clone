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

/**
 * On the first-ever visit to a lesson the player shows a one-question **pretest**
 * (errorful generation) *before* the concept step — a never-graded cold guess.
 * Tests that just want to reach the lesson dismiss it with "I'm not sure — teach me".
 * Safe to call even when no pretest shows (e.g. a non-numeric first problem): it
 * resolves as soon as either the pretest or the lesson's step title is on screen.
 */
export async function dismissPretest(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: /not sure/i });
  const stepTitle = page.locator('.player-step-title');
  await expect(skip.or(stepTitle).first()).toBeVisible({ timeout: 15_000 });
  if (await skip.isVisible()) {
    await skip.click();
  }
  await expect(stepTitle).toBeVisible({ timeout: 15_000 });
}

/** Navigate straight to a lesson and land on its first step (past any pretest). */
export async function openLesson(page: Page, lessonId: string): Promise<void> {
  await page.goto(`/#/learn/${lessonId}`);
  await dismissPretest(page);
}
