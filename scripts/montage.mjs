// montage.mjs — render every sticker into one image so we can eyeball quality.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8091;
const BASE = `http://localhost:${PORT}`;

const files = readdirSync('assets/stickers').filter((f) => f.endsWith('.svg')).sort();

async function main() {
  const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 2 })).newPage();

  const cells = files.map((f) => `
    <div class="cell">
      <div class="box"><img src="${BASE}/assets/stickers/${f}"></div>
      <div class="lbl">${f.replace('.svg', '')}</div>
    </div>`).join('');

  await page.setContent(`<!doctype html><html><head><meta charset=utf-8><style>
    body{margin:0;background:#c9c9d6;font-family:system-ui;padding:16px;
      background-image:linear-gradient(45deg,#bbb 25%,transparent 25%),linear-gradient(-45deg,#bbb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#bbb 75%),linear-gradient(-45deg,transparent 75%,#bbb 75%);
      background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0;}
    .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
    .cell{background:rgba(255,255,255,.55);border-radius:12px;padding:8px;display:flex;flex-direction:column;align-items:center;}
    .box{width:130px;height:130px;display:flex;align-items:center;justify-content:center;}
    .box img{max-width:120px;max-height:120px;}
    .lbl{font-size:12px;font-weight:700;color:#222;margin-top:4px;}
  </style></head><body><div class="grid">${cells}</div></body></html>`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(600);
  await page.locator('.grid').screenshot({ path: 'scripts/montage.png' });
  await browser.close();
  server.kill();
  console.log(`montage.png written with ${files.length} stickers`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
