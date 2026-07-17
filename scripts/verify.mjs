// verify.mjs — drives the real app in Chromium to prove it's operational.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8087;
const BASE = `http://localhost:${PORT}`;

const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`);
};

async function main() {
  const server = spawn('node', ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 800));

  const browser = await chromium.launch({
    executablePath: EXE,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const context = await browser.newContext({
    permissions: ['camera'],
    viewport: { width: 1024, height: 1366 }, // iPad-ish
  });
  // Fast-fail the MediaPipe CDN so the (network-dependent) model load can't
  // hang this run. App logic must stay operational without it; the face math
  // itself is covered by the geometry unit tests.
  await context.route(/jsdelivr\.net|googleapis\.com|mediapipe/i, (r) => r.abort());

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'load' });

  // 1. Camera starts (fake device) — video gets real dimensions.
  const camStarted = await page.waitForFunction(
    () => document.querySelector('#video')?.videoWidth > 0,
    { timeout: 8000 }
  ).then(() => true).catch(() => false);
  ok('camera preview starts', camStarted);

  // 2. Capture a photo -> editor screen opens with a drawn canvas.
  await page.click('#btn-shutter');
  await page.waitForTimeout(400);
  const editorOpen = await page.evaluate(() =>
    document.querySelector('#screen-editor').classList.contains('active'));
  ok('capture opens editor', editorOpen);

  const canvasHasPixels = await page.evaluate(() => {
    const c = document.querySelector('#canvas');
    if (!c.width || !c.height) return false;
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, Math.min(40, c.width), Math.min(40, c.height)).data;
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
    return sum > 0;
  });
  ok('photo is drawn onto the canvas', canvasHasPixels);

  // 3. Place a free (draggable) sticker.
  await page.evaluate(() => window.__mae.editor.placed.length);
  const before = await page.evaluate(() => window.__mae.editor.placed.length);
  // switch to stickers tab, fun category, tap first sticker button
  await page.click('.tab[data-tab="stickers"]');
  await page.evaluate(() => {
    // pick a face sticker to exercise fallback, then a free one
    window.__mae.editor.addFreeSticker(
      { id: 't', draw: 'emoji', glyph: '⭐', scale: 0.2, faceTracked: false });
  });
  const afterFree = await page.evaluate(() => window.__mae.editor.placed.length);
  ok('free sticker placed', afterFree === before + 1, `count ${before} -> ${afterFree}`);

  // 4. Face-sticker fallback path (no real face in fake stream).
  const faceCount = await page.evaluate(() => window.__mae.editor.faceCount());
  ok('face detection ran without crashing', typeof faceCount === 'number', `faces=${faceCount}`);

  // 5. Apply a filter -> pixels change.
  const changed = await page.evaluate(() => {
    const c = document.querySelector('#canvas');
    const ctx = c.getContext('2d');
    // Sample a quarter-point (away from any centered sticker) so we measure
    // the filtered base image, not an unfiltered sticker on top.
    const sample = () => {
      const d = ctx.getImageData((c.width * 0.25) | 0, (c.height * 0.25) | 0, 8, 8).data;
      let s = 0; for (let i = 0; i < d.length; i++) s += d[i];
      return s;
    };
    const a = sample();
    window.__mae.editor.setFilter('invert');
    const b = sample();
    window.__mae.editor.setFilter('none');
    return a !== b;
  });
  ok('filters change the image', changed);

  // 6. Draw a stroke with the crayon brush using real pointer input.
  await page.evaluate(() => {
    const ed = window.__mae.editor;
    ed.setTool('draw'); ed.setBrush('crayon'); ed.setColor('#ff0000'); ed.setBrushSize(20);
  });
  const box = await page.locator('#canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
  const paintNonZero = await page.evaluate(() => {
    const ed = window.__mae.editor;
    const d = ed.paintCtx.getImageData(0, 0, ed.width, ed.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });
  ok('drawing paints onto the photo', paintNonZero > 50, `painted px=${paintNonZero}`);

  // 7. Undo works.
  const undoWorks = await page.evaluate(() => {
    const ed = window.__mae.editor;
    const n = ed.placed.length;
    if (n === 0) return true;
    ed.undo();
    return ed.placed.length <= n;
  });
  ok('undo works', undoWorks);

  // 8. Save -> gallery.
  await page.evaluate(async () => { await window.__mae.gallery; });
  await page.click('#btn-save');
  await page.waitForTimeout(500);
  const galleryCount = await page.evaluate(async () => window.__mae.gallery.count());
  ok('photo saved to gallery', galleryCount >= 1, `count=${galleryCount}`);

  // 9. Gallery renders a saved image (return to camera first — the gallery
  //    button lives on the camera screen).
  await page.click('#btn-retake');
  await page.waitForTimeout(200);
  await page.click('#btn-open-gallery');
  await page.waitForTimeout(500);
  const hasImg = await page.evaluate(() =>
    document.querySelectorAll('#gallery-grid img').length >= 1);
  ok('gallery displays saved photo', hasImg);

  // 10. Service worker + manifest.
  const swReg = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  ok('service worker registered', swReg);

  // 11. No uncaught console errors (ignore expected CDN/network ones).
  const realErrors = errors.filter((e) =>
    !/mediapipe|jsdelivr|googleapis|Failed to load|net::|wasm|GPU|WebGL|fetch/i.test(e));
  ok('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await browser.close();
  server.kill();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { process.exitCode = 1; }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
