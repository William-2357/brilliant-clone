import { test, expect, signUp } from './fixtures';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test.describe('Course catalog', () => {
  test('lists all eight lessons', async ({ page }) => {
    await page.goto('/#/learn');
    await expect(page.locator('.page-title')).toHaveText('All lessons');
    await expect(page.locator('.lesson-cards .lcard')).toHaveCount(8);
  });

  test('locks later lessons until free navigation is on', async ({ page }) => {
    await page.goto('/#/learn');
    const cards = page.locator('.lesson-cards .lcard');

    // A brand-new learner can start lesson 1 but later lessons are gated.
    await expect(cards.first()).toBeEnabled();
    await expect(page.locator('.lesson-cards .lcard:disabled').first()).toBeVisible();

    // Toggling "Free navigation" unlocks every lesson.
    await page.locator('.unlock-toggle').click();
    await expect(page.locator('.lesson-cards .lcard:disabled')).toHaveCount(0);
  });

  test('opens the first lesson from the catalog', async ({ page }) => {
    await page.goto('/#/learn');
    await page.locator('.lesson-cards .lcard').first().click();
    await page.waitForURL(/#\/learn\/l1-coin-flip/);
    await expect(page.locator('.player-step-title')).toBeVisible();
  });
});
