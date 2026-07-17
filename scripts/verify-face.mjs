// verify-face.mjs — proves the MediaPipe face pipeline actually detects a face
// and that a hat auto-places above the eyes. Loads a local face image so the
// browser stays same-origin (only the model/wasm come from the CDN).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8089;
const BASE = `http://localhost:${PORT}`;
const IMG = `${BASE}/.tmp-face.png`;

if (!existsSync('.tmp-face.png')) {
  console.log('⚠️  no local face image — skipping live face test');
  process.exit(0);
}

async function main() {
  const server = spawn('node', ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 800));

  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 1200 } })).newPage();
  page.setDefaultTimeout(60000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));

  // Serve the model + wasm locally (same origin) so the test needs no CDN/proxy.
  await page.addInitScript((base) => {
    window.__MAE_VISION_BUNDLE = `${base}/.vendor/vision_bundle.mjs`;
    window.__MAE_VISION_WASM = `${base}/.vendor/wasm`;
    window.__MAE_MODEL_URL = `${base}/.vendor/face_landmarker.task`;
  }, BASE);

  await page.goto(BASE, { waitUntil: 'load' });

  // Wait for the face model to finish loading from the CDN.
  const ready = await page.waitForFunction(
    () => window.__mae && window.__mae.detector && window.__mae.detector.ready,
    { timeout: 55000 }
  ).then(() => true).catch(() => false);
  console.log(ready ? '✅ MediaPipe face model loaded' : '❌ model did not load');
  if (!ready) {
    const err = await page.evaluate(() => String(window.__mae?.detector?.error || 'unknown'));
    console.log('   error:', err);
    await browser.close(); server.kill(); process.exitCode = 1; return;
  }

  // Load the face image, push it into the editor, run detection.
  const result = await page.evaluate(async (imgUrl) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgUrl; });
    const { editor, detector } = window.__mae;
    editor.setPhoto(img, false);
    const faces = await detector.detect(editor.base, editor.width, editor.height);
    editor.setFaces(faces);

    const crown = { asset: 'assets/stickers/crown.svg', anchor: 'crown', scale: 0.95, offsetY: -0.55, faceTracked: true };
    const tophat = { asset: 'assets/stickers/tophat.svg', anchor: 'crown', scale: 0.95, offsetY: -0.6, faceTracked: true };
    const hearts = { asset: 'assets/stickers/hearteyes.svg', anchor: 'eyes', perEye: true, scale: 0.34, faceTracked: true };

    editor.addFaceSticker(crown);
    editor.addFaceSticker(hearts);
    const afterCrownHearts = editor.placed.length;

    // Choosing a new hat should SWAP the crown, not stack a second hat.
    editor.addFaceSticker(tophat);
    const headStickers = editor.placed.filter((p) => p.slot === 'head').length;

    const f = faces[0];
    const crownPlaced = editor.placed.find((p) => p.asset.includes('tophat')) || editor.placed[0];
    return {
      faceCount: faces.length,
      landmarkOk: !!f,
      eyesY: f ? f.anchors.eyesCenter.y : null,
      hatY: crownPlaced ? crownPlaced.y : null,
      afterCrownHearts,
      headStickers,
      placedCount: editor.placed.length,
    };
  }, IMG);

  const checks = [];
  const ok = (n, c, e = '') => { checks.push(c); console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); };

  ok('detected at least one face', result.faceCount >= 1, `faces=${result.faceCount}`);
  ok('face landmarks produced metrics', result.landmarkOk);
  ok('hat auto-placed above the eyes',
    result.hatY != null && result.eyesY != null && result.hatY < result.eyesY,
    `hatY=${Math.round(result.hatY)} < eyesY=${Math.round(result.eyesY)}`);
  ok('crown + 2 heart eyes = 3 stickers', result.afterCrownHearts === 3, `placed=${result.afterCrownHearts}`);
  ok('new hat SWAPS old hat (one per zone)', result.headStickers === 1, `head stickers=${result.headStickers}`);
  ok('after swap: tophat + 2 heart eyes = 3', result.placedCount === 3, `placed=${result.placedCount}`);
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  await browser.close();
  server.kill();
  const passed = checks.filter(Boolean).length;
  console.log(`\n${passed}/${checks.length} face checks passed`);
  if (passed !== checks.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
