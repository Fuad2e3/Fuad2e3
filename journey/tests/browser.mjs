// Launch Chromium with CDN requests served from npm tarballs in .vendor/ (same pinned versions).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const VENDOR = fileURLToPath(new URL('./.vendor/', import.meta.url));
const MAP = [
  ['https://cdn.jsdelivr.net/npm/three@0.160.0/', `${VENDOR}three-0.160.0/`],
  ['https://cdn.jsdelivr.net/npm/gsap@3.12.5/', `${VENDOR}gsap-3.12.5/`],
];

export async function openPage(url, { args = [], context = {}, viewport = { width: 1280, height: 800 } } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...args] });
  const ctx = await browser.newContext({ viewport, ...context });
  await ctx.route(/^https:\/\/(cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com)\//, async (route) => {
    const u = route.request().url();
    const hit = MAP.find(([prefix]) => u.startsWith(prefix));
    if (!hit) return route.fulfill({ status: 200, body: '' }); // fonts: empty
    const body = await readFile(hit[1] + u.slice(hit[0].length).split('?')[0]);
    route.fulfill({ status: 200, body, contentType: 'text/javascript' });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  return { browser, page, errors };
}
