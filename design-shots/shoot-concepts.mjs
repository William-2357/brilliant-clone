import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = pathToFileURL(resolve(__dirname, '..', 'design-concepts.html')).href;
const out = __dirname;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1320, height: 1000 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(500);

async function shot(selector, name) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: resolve(out, name) });
  console.log('  ✓', name);
}

await shot('#c1 .stage', 'concept-quincunx.png');
await shot('#c2 .stage', 'concept-monte.png');
await shot('#c3 .stage', 'concept-sample.png');
await shot('#c4 .stage', 'concept-walk.png');

await browser.close();
console.log('done');
