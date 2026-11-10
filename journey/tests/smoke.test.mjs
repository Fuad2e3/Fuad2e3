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

// Share of pixels (on a 64x40 downscale) that differ clearly from the clear colour.
const litShare = (page) => page.evaluate(() => {
  const src = document.getElementById('scene');
  const c = Object.assign(document.createElement('canvas'), { width: 64, height: 40 });
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0, 64, 40);
  const d = g.getImageData(0, 0, 64, 40).data;
  let lit = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 11) + Math.abs(d[i + 1] - 16) + Math.abs(d[i + 2] - 32) > 40) lit++;
  return lit / (64 * 40);
});

test('scene boots', () => withPage({}, async ({ page, errors }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  assert.ok(await page.evaluate(() => document.getElementById('scene').width > 0));
  await page.evaluate(() => window.__journey.setProgress(0.5));
  await page.waitForTimeout(1200);
  const share = await litShare(page);
  assert.ok(share > 0.03, `only ${(share * 100).toFixed(1)}% of pixels lit`);
  assert.deepEqual(errors, []);
}));

const scrollToStation = (page, id, frac = 0.5) => page.evaluate(([id, frac]) => {
  const s = document.getElementById(`station-${id}`);
  const max = document.documentElement.scrollHeight - innerHeight;
  // solve scrollY so the moving reading line (scrollY + vh*scrollY/max) hits the section at `frac`
  const y = s.offsetTop + s.offsetHeight * frac;
  scrollTo(0, y / (1 + innerHeight / max));
}, [id, frac]);

test('scroll drives character', () => withPage({}, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await scrollToStation(page, 'web');
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => window.__journey.state().station), 'web');
}));

test('end key lands at contact', () => withPage({}, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await page.keyboard.press('End');
  await page.waitForTimeout(1200);
  const s = await page.evaluate(() => window.__journey.state());
  assert.equal(s.station, 'contact');
  assert.ok(s.progress > 0.95, `progress ${s.progress}`);
}));

test('scroll up walks backwards', () => withPage({}, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await scrollToStation(page, 'web');
  await page.waitForTimeout(900);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__journey.state().facing), -1);
}));

test('reduced motion shows static page', () => withPage({ context: { reducedMotion: 'reduce' } }, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({
    animating: window.__journey.state().animating,
    transforms: [...document.querySelectorAll('.station .card')].map((c) => getComputedStyle(c).transform),
  }));
  assert.equal(s.animating, false);
  assert.ok(s.transforms.every((t) => t === 'none'), s.transforms.join(','));
  await scrollToStation(page, 'ai');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__journey.state().station), 'ai');
}));

test('resize keeps aspect', () => withPage({}, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(500);
  const aspect = await page.evaluate(() => window.__journey.state().aspect);
  assert.ok(Math.abs(aspect - 600 / 900) < 0.01, `aspect ${aspect}`);
}));

test('keyboard reachable', () => withPage({}, async ({ page }) => {
  await page.waitForSelector('.project');
  let onProject = false;
  for (let i = 0; i < 20 && !onProject; i++) {
    await page.keyboard.press('Tab');
    onProject = await page.evaluate(() => document.activeElement?.classList.contains('project'));
  }
  assert.ok(onProject, 'Tab never reached a project link');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, 'none');
}));

test('hero wears the photo face', () => withPage({}, async ({ page, errors }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__journey.state().heroPhoto === true, null, { timeout: 10000 });
  assert.deepEqual(errors, []);
}));

test('day theme follows a light device', () => withPage({ context: { colorScheme: 'light' } }, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__journey.state().theme), 'day');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r, g, b] = bg.match(/\d+/g).map(Number);
  assert.ok(r + g + b > 500, `body background ${bg} is not light`);
}));

test('theme switches live when the device changes', () => withPage({}, async ({ page }) => {
  await page.waitForFunction(() => window.__journey?.ready, null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__journey.state().theme), 'night');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__journey.state().theme), 'day');
}));

test('landscape phone has no horizontal overflow and a reachable card', () => withPage({ viewport: { width: 740, height: 360 } }, async ({ page }) => {
  await page.waitForSelector('.station');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 740));
  const h = await page.evaluate(() => document.querySelector('#station-mobile .card').getBoundingClientRect().height);
  assert.ok(h <= 360, `card ${h}px taller than the 360px viewport`);
}));
