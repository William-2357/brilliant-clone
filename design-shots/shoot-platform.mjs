import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = pathToFileURL(resolve(__dirname, '..', 'design-platform.html')).href;
const out = __dirname;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1320, height: 1000 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { const t = document.querySelector('.gal-top'); if (t) t.style.display = 'none'; });
await page.waitForTimeout(400);

async function shot(selector, name) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: resolve(out, name) });
  console.log('  ✓', name);
}

await shot('#dash .frame', 'platform-dashboard.png');
await shot('#path .frame', 'platform-path.png');
await shot('#lesson .frame', 'platform-lesson.png');

if (errs.length) console.log('PAGE ERRORS:', errs);
await browser.close();
console.log('done');
