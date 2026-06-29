import { test, expect, signUp, openLesson } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Commit one prediction for the current problem. Lesson 1's problems are numeric
 * (or, occasionally, a slider) — for the numeric case we type a value that is
 * always wrong for a coin fraction/count so we never depend on the generated
 * answer; the slider case just locks in its current handle position.
 */
async function commitPrediction(page: Page): Promise<void> {
  const input = page.locator('.predict-input');
  if (await input.count()) {
    await input.fill('-5');
  }
  await page.locator('.predict .btn-primary').click();
}

/**
 * Drive a problem to a definitive outcome without knowing the answer. After at
 * most two committed predictions the problem always resolves (green/yellow/red),
 * which runs the simulation and reveals the true value.
 */
async function resolveProblem(page: Page): Promise<void> {
  await commitPrediction(page);
  const continueBtn = page.getByRole('button', { name: 'Continue', exact: true });
  const tryAgainBtn = page.getByRole('button', { name: /Try again/ });
  await expect(continueBtn.or(tryAgainBtn).first()).toBeVisible({ timeout: 20_000 });
  if (await tryAgainBtn.isVisible()) {
    await tryAgainBtn.click();
    await expect(page.locator('.predict')).toBeVisible();
    await commitPrediction(page);
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });
  }
}

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test.describe('Lesson player — predict then verify', () => {
  test('first visit shows the never-graded pretest before any teaching', async ({ page }) => {
    await page.goto('/#/learn/l1-coin-flip');
    // Errorful generation (FR-11.6): one cold guess precedes the concept step on the
    // first-ever visit. It's never graded — "I'm not sure" proceeds straight into the lesson.
    await expect(page.locator('.pretest')).toBeVisible();
    await page.getByRole('button', { name: /not sure/i }).click();
    await expect(page.locator('.player-step-title')).toBeVisible();
  });

  test('concept step mounts a live simulation', async ({ page }) => {
    await openLesson(page, 'l1-coin-flip');
    const canvas = page.locator('.sim-canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeGreaterThan(0);
    await expect(page.locator('.explore-continue')).toBeVisible();
  });

  test('advancing from the concept reaches a gradable problem', async ({ page }) => {
    await openLesson(page, 'l1-coin-flip');
    await page.locator('.explore-continue').click();
    await expect(page.locator('.step-tag.tag-problem')).toBeVisible();
    await expect(page.locator('.predict')).toBeVisible();
  });

  test('committing a prediction grades it and shows feedback', async ({ page }) => {
    await openLesson(page, 'l1-coin-flip');
    await page.locator('.explore-continue').click();
    await expect(page.locator('.predict')).toBeVisible();

    await commitPrediction(page);

    // Whether the prediction was right or wrong, a feedback banner must appear.
    await expect(page.locator('.feedback')).toBeVisible({ timeout: 20_000 });
  });

  test('a resolved problem reveals the answer and lets you continue', async ({ page }) => {
    await openLesson(page, 'l1-coin-flip');
    await page.locator('.explore-continue').click();
    await expect(page.locator('.predict')).toBeVisible();

    await resolveProblem(page);

    await expect(page.locator('.feedback-truth')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  });
});
