import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
import { openPage } from './browser.mjs';

let server;
const ROOT = fileURLToPath(new URL('../', import.meta.url));
before(async () => { server = await startServer(ROOT); });
after(async () => { await server.close(); });

const withPage = async (opts, fn, path = '/index.html?test=1') => {
  const s = await openPage(server.url + path, opts);
  try { await fn(s); } finally { await s.browser.close(); }
};

test('sections render', () => withPage({}, async ({ page }) => {
  await page.waitForSelector('.station');
  assert.equal(await page.locator('.station').count(), 6);
  assert.equal(await page.locator('.station .project').count(), 40);
}));

test('content readable without WebGL', () => withPage({ args: ['--disable-webgl', '--disable-3d-apis'] }, async ({ page, errors }) => {
  await page.waitForSelector('#station-mobile h2');
  assert.ok(await page.locator('#station-mobile h2').isVisible());
  await page.waitForTimeout(500);
  assert.deepEqual(errors, []);
}));

test('no horizontal overflow at 375px', () => withPage({ viewport: { width: 375, height: 740 } }, async ({ page }) => {
  await page.waitForSelector('.station');
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(w <= 375, `scrollWidth ${w}`);
}));
