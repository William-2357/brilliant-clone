/**
 * Mobile smoke test — run against `npm run dev` at http://localhost:5173
 * Usage: node scripts/mobile-smoke.mjs
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const mobile = devices['iPhone 13'];

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}: ${detail}`);
}

async function noHorizontalOverflow(page, label) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (scrollWidth > innerWidth + 2) {
    fail(`${label}: no horizontal overflow`, `scrollWidth ${scrollWidth} > viewport ${innerWidth}`);
    return false;
  }
  pass(`${label}: no horizontal overflow`);
  return true;
}

async function minTouchHeight(page, selector, label, min = 44) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    fail(`${label}: visible`, 'element not found');
    return false;
  }
  if (box.height < min - 2) {
    fail(`${label}: touch target`, `height ${Math.round(box.height)}px < ${min}px`);
    return false;
  }
  pass(`${label}: touch target ≥${min}px`);
  return true;
}

async function main() {
  console.log(`\nMobile smoke test (${mobile.viewport.width}×${mobile.viewport.height}) → ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...mobile });
  const page = await context.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  // --- Login page ---
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-card', { timeout: 10000 });
  pass('Login page loads');
  await noHorizontalOverflow(page, 'Login');
  await minTouchHeight(page, '.btn-primary', 'Sign-up button');

  // Sign up with a unique test user
  const uid = Date.now();
  await page.fill('input[placeholder="Name"]', 'Mobile Tester');
  await page.fill('input[type="email"]', `mobile-${uid}@test.local`);
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('.btn-primary');
  await page.waitForURL(/#\/learn/, { timeout: 10000 });
  pass('Sign-up redirects to /learn');

  // --- Course page (mobile) ---
  await page.waitForSelector('.page-title', { timeout: 10000 });
  pass('Course page renders');
  await noHorizontalOverflow(page, 'Course');

  const hamburger = page.locator('.hamburger');
  if (!(await hamburger.isVisible())) {
    fail('Hamburger menu', 'not visible on mobile');
  } else {
    pass('Hamburger menu visible');
    await hamburger.click();
    await page.waitForSelector('.layout.nav-open', { timeout: 3000 });
    pass('Sidebar opens on hamburger tap');
    const sidebar = page.locator('.sidebar');
    if (await sidebar.isVisible()) pass('Sidebar drawer visible');
    else fail('Sidebar drawer', 'not visible after open');
    await page.locator('.nav-backdrop').click();
    await page.waitForFunction(() => !document.querySelector('.layout.nav-open'), { timeout: 3000 });
    pass('Sidebar closes on backdrop tap');
  }

  // Progress panels stack on mobile (course-aside should not sit beside main)
  const grid = await page.evaluate(() => {
    const aside = document.querySelector('.course-aside');
    const main = document.querySelector('.course-main');
    if (!aside || !main) return null;
    const ar = aside.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    return { stacked: ar.top >= mr.bottom - 4, asideTop: ar.top, mainBottom: mr.bottom };
  });
  if (grid?.stacked) pass('Course panels stack vertically on mobile');
  else fail('Course layout', `aside not below main (top ${grid?.asideTop}, main bottom ${grid?.mainBottom})`);

  // --- Lesson player ---
  await page.goto(`${BASE}/#/learn/l1-coin-flip`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.player-step-title', { timeout: 10000 });
  pass('Lesson page loads');
  await noHorizontalOverflow(page, 'Lesson');
  await page.waitForSelector('.sim-canvas', { timeout: 5000 });
  pass('Simulation canvas present');

  const canvasBox = await page.locator('.sim-canvas').first().boundingBox();
  if (canvasBox && canvasBox.width > 0 && canvasBox.height > 0) {
    pass(`Sim canvas sized (${Math.round(canvasBox.width)}×${Math.round(canvasBox.height)})`);
  } else {
    fail('Sim canvas', 'zero-size or missing');
  }

  // Profile page
  await page.locator('.profile-trigger').click();
  await page.waitForURL(/#\/profile/, { timeout: 5000 });
  await page.waitForSelector('.acct-hero', { timeout: 3000 });
  pass('Profile page opens');
  await noHorizontalOverflow(page, 'Profile page');

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  if (jsErrors.length) {
    console.error('\nJS errors on page:', jsErrors);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error('\nFailed:');
    failed.forEach((f) => console.error(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  if (jsErrors.length) process.exit(1);
  console.log('\nMobile smoke test passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
