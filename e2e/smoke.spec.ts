import { test, expect, signUp } from './fixtures';

test.describe('App smoke', () => {
  test('login page renders the sign-up form', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.getByText('The Long Run')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('a new learner can sign up and reach the app', async ({ page }) => {
    await signUp(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('the Google sign-in button signs a learner in', async ({ page }) => {
    // In test mode the backend is localStorage, so "Continue with Google" signs
    // into the deterministic demo Google account (no real OAuth popup).
    await page.goto('/#/login');
    await expect(page.locator('.auth-card')).toBeVisible();
    await page.getByRole('button', { name: /Continue with Google/i }).click();
    await page.waitForURL((url) => !url.hash.includes('/login'), { timeout: 15_000 });
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('unauthenticated visits are redirected to login', async ({ page }) => {
    await page.goto('/#/learn');
    await page.waitForURL((url) => url.hash.includes('/login'), { timeout: 15_000 });
    await expect(page.locator('.auth-card')).toBeVisible();
  });
});
