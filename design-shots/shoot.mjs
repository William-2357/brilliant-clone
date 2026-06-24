import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileUrl = pathToFileURL(resolve(__dirname, '..', 'design-lookbook.html')).href;
const out = __dirname;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce', // render convergence lines fully drawn
});
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

async function shot(selector, name) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: resolve(out, name) });
  console.log('  ✓', name);
}

// Light theme
await shot('#system', 'system.png');
await shot('#signature .sig-grid', 'signature.png');
await shot('#home .frame', 'home-light.png');
await shot('#overview .frame', 'overview.png');
await shot('#profile .frame', 'profile.png');
await shot('#lesson .frame', 'lesson.png');

// Dark theme
await page.click('#themeBtn');
await page.waitForTimeout(300);
await shot('#home .frame', 'home-dark.png');

await browser.close();
console.log('done');
