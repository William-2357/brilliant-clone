import { test, expect, signUp } from './fixtures';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test.describe('Course catalog', () => {
  test('lists all eight units', async ({ page }) => {
    await page.goto('/#/learn');
    await expect(page.locator('.page-title')).toHaveText('Probability & Statistics');
    await expect(page.locator('.unit-grid .unit-card')).toHaveCount(8);
  });

  test('locks later units until free navigation is on', async ({ page }) => {
    await page.goto('/#/learn');
    const units = page.locator('.unit-grid .unit-card');

    // A brand-new learner can start unit 1 but later units are gated.
    await expect(units.first()).toBeEnabled();
    await expect(page.locator('.unit-grid .unit-card:disabled').first()).toBeVisible();

    // Toggling "Free navigation" unlocks every unit.
    await page.locator('.unlock-toggle').click();
    await expect(page.locator('.unit-grid .unit-card:disabled')).toHaveCount(0);
  });

  test('drills into a unit and opens its first lesson', async ({ page }) => {
    await page.goto('/#/learn');

    // First unit (Foundations) → its lesson list.
    await page.locator('.unit-grid .unit-card').first().click();
    await page.waitForURL(/#\/learn\/section\/s1-foundations/);

    // First lesson in the unit → the lesson player.
    await page.locator('.lesson-cards .lcard').first().click();
    await page.waitForURL(/#\/learn\/l1-coin-flip/);
    await expect(page.locator('.player-step-title')).toBeVisible();
  });
});
