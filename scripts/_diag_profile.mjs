import { chromium, devices } from 'playwright';

const BASE = 'http://localhost:5173';
const mobile = devices['iPhone 13'];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...mobile });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });

// sign up
await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
await page.waitForSelector('.auth-card');
const uid = Date.now();
await page.fill('input[placeholder="Name"]', 'Diag');
await page.fill('input[type="email"]', `diag-${uid}@test.local`);
await page.fill('input[type="password"]', 'testpass123');
await page.click('.btn-primary');
await page.waitForURL(/#\/learn/);

// from the (well-loaded) course page, click profile avatar
await page.waitForSelector('.page-title');
const before = await page.evaluate(() => location.hash);
const trig = page.locator('.profile-trigger');
console.log('profile-trigger count:', await trig.count(), 'visible:', await trig.first().isVisible());
await trig.click();
await page.waitForTimeout(500);
const afterRealClick = await page.evaluate(() => location.hash);
// Now try a direct DOM .click() to see if the React handler is wired at all.
await page.evaluate(() => document.querySelector('.profile-trigger')?.click());
await page.waitForTimeout(500);
const afterDomClick = await page.evaluate(() => location.hash);
// What element is actually at the avatar's center point (hit-test)?
const hit = await page.evaluate(() => {
  const el = document.querySelector('.profile-trigger');
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const cs = getComputedStyle(el);
  const av = document.querySelector('.profile-trigger .avatar');
  return {
    topTag: top?.className ?? top?.tagName,
    triggerPE: cs.pointerEvents,
    avatarPE: av ? getComputedStyle(av).pointerEvents : 'n/a',
    rect: { w: Math.round(r.width), h: Math.round(r.height) },
  };
});
const after = afterDomClick;
const hasHero = await page.locator('.acct-hero').count();
console.log('hash before click:', JSON.stringify(before));
console.log('hash after REAL click:', JSON.stringify(afterRealClick));
console.log('hash after DOM .click():', JSON.stringify(afterDomClick));
console.log('hit-test/PE:', JSON.stringify(hit));
console.log('.acct-hero count :', hasHero);
console.log('page errors      :', errs.length ? errs : 'none');
await browser.close();
