// preview-face.mjs — apply several stickers to the real face photo and
// screenshot the composited canvas so we can eyeball placement + quality.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8093;
const BASE = `http://localhost:${PORT}`;
if (!existsSync('.tmp-face.png')) { console.log('no face image'); process.exit(0); }

async function main() {
  const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 })).newPage();
  await page.addInitScript((base) => {
    window.__MAE_VISION_BUNDLE = `${base}/.vendor/vision_bundle.mjs`;
    window.__MAE_VISION_WASM = `${base}/.vendor/wasm`;
    window.__MAE_MODEL_URL = `${base}/.vendor/face_landmarker.task`;
  }, BASE);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__mae?.detector?.ready, { timeout: 55000 });

  const dataUrl = await page.evaluate(async (base) => {
    const load = (src) => new Promise((res, rej) => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = rej; im.src = src;
    });
    const img = await load(base + '/.tmp-face.png');
    const { editor, detector } = window.__mae;
    editor.setPhoto(img, false);
    const faces = await detector.detect(editor.base, editor.width, editor.height);
    editor.setFaces(faces);
    const S = (asset, anchor, scale, offsetY, perEye) =>
      ({ asset: 'assets/stickers/' + asset, anchor, scale, offsetY: offsetY || 0, perEye: !!perEye, faceTracked: true });
    editor.addFaceSticker(S('crown.svg', 'crown', 0.95, -0.55));
    editor.addFaceSticker(S('sunglasses.svg', 'eyes', 1.1));
    editor.addFaceSticker(S('blush.svg', 'cheeks', 0.34));
    editor.setFrame('rainbow');
    // wait until sticker + frame images are decoded, then render clean frames
    const urls = ['assets/stickers/crown.svg', 'assets/stickers/sunglasses.svg',
      'assets/stickers/blush.svg', 'assets/frames/rainbow.svg'];
    await Promise.all(urls.map((u) => load(base + '/' + u)));
    await new Promise((r) => setTimeout(r, 300));
    editor.render();
    const framed = editor.canvas.toDataURL('image/png');

    // second image: Big Head funny effect
    editor.setFrame('none');
    editor.placed = [];
    editor.setFilter('bighead');
    editor.render();
    const bighead = editor.canvas.toDataURL('image/png');
    return { framed, bighead };
  }, BASE);

  const { writeFileSync } = await import('node:fs');
  writeFileSync('scripts/preview-face.png', Buffer.from(dataUrl.framed.split(',')[1], 'base64'));
  writeFileSync('scripts/preview-bighead.png', Buffer.from(dataUrl.bighead.split(',')[1], 'base64'));
  await browser.close();
  server.kill();
  console.log('preview-face.png written');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
