// Records a ~6s scroll through the journey and writes assets/journey-preview.gif (repo root).
// Usage: node journey/tests/record-preview.mjs   (needs ffmpeg)
import { mkdtempSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
import { openPage } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = fileURLToPath(new URL('../../assets/journey-preview.gif', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'journey-rec-'));
const srv = await startServer(ROOT);
const { browser, page } = await openPage(`${srv.url}/index.html?test=1`, {
  viewport: { width: 800, height: 450 },
  context: { recordVideo: { dir, size: { width: 800, height: 450 } } },
});
await page.waitForFunction(() => window.__journey?.state().heroPhoto, null, { timeout: 30000 });
await page.waitForTimeout(1500); // the wave
const glide = async (from, to, ms) => {
  const n = Math.round(ms / 40);
  for (let i = 1; i <= n; i++) {
    const f = from + ((to - from) * i) / n;
    await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
    await page.waitForTimeout(40);
  }
};
await glide(0, 0.16, 3500); // walk into the Mobile station
await page.waitForTimeout(1600); // phone + idle turn
await glide(0.16, 0.36, 3500); // on to Web & Cloud
await page.waitForTimeout(1200); // hero turns to look at the viewer
await page.close();
await browser.close();
await srv.close();
const video = join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
const palette = join(dir, 'palette.png');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '2.2', '-i', video, '-vf', 'fps=10,scale=480:-1:flags=lanczos,palettegen=max_colors=80', palette]);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '2.2', '-i', video, '-i', palette, '-lavfi', 'fps=10,scale=480:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4', join(dir, 'out.gif')]);
renameSync(join(dir, 'out.gif'), OUT);
rmSync(dir, { recursive: true, force: true });
console.log('wrote', OUT);
