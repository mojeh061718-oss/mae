// shot-ui.mjs — screenshot the app in iPad portrait to review the UI.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8097;
const BASE = `http://localhost:${PORT}`;
const W = Number(process.env.W || 820);
const H = Number(process.env.H || 1180);

async function main() {
  const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ permissions: ['camera'], viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await ctx.route(/jsdelivr\.net|googleapis\.com|mediapipe/i, (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#video')?.videoWidth > 0, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/ui-camera.png' });

  // editor
  await page.click('#btn-shutter');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'scripts/ui-editor-stickers.png' });

  await page.click('.tab[data-tab="draw"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/ui-editor-draw.png' });

  await page.click('.tab[data-tab="filters"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/ui-editor-filters.png' });

  await browser.close();
  server.kill();
  console.log(`shots written at ${W}x${H}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
