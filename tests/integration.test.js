import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p) => existsSync(join(ROOT, p));

test('core files are present', () => {
  const files = [
    'index.html', 'manifest.webmanifest', 'sw.js', 'css/styles.css',
    'js/app.js', 'js/camera.js', 'js/faces.js', 'js/editor.js',
    'js/stickers.js', 'js/geometry.js', 'js/gallery.js',
  ];
  for (const f of files) assert.ok(exists(f), `missing ${f}`);
});

test('manifest is valid and its icons exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.name && m.short_name && m.start_url);
  assert.ok(Array.isArray(m.icons) && m.icons.length >= 2);
  const hasMaskable = m.icons.some((i) => (i.purpose || '').includes('maskable'));
  assert.ok(hasMaskable, 'manifest needs a maskable icon');
  for (const icon of m.icons) {
    assert.ok(exists(icon.src), `manifest icon missing on disk: ${icon.src}`);
  }
});

test('index.html wires up the app, manifest, styles and icons', () => {
  const html = read('index.html');
  assert.match(html, /js\/app\.js/);
  assert.match(html, /css\/styles\.css/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /id="video"/);
  assert.match(html, /id="canvas"/);
  assert.match(html, /id="btn-shutter"/);
  assert.match(html, /id="btn-flip"/);
});

test('service worker precaches every shell file it lists', () => {
  const sw = read('sw.js');
  const listMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(listMatch, 'could not find SHELL list in sw.js');
  const urls = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const u of urls) {
    if (u === './') continue; // directory root
    const rel = u.replace(/^\.\//, '');
    assert.ok(exists(rel), `sw precache file missing on disk: ${u}`);
  }
});

test('apple touch icon referenced by html exists', () => {
  const html = read('index.html');
  const m = html.match(/apple-touch-icon"\s+href="([^"]+)"/);
  assert.ok(m, 'no apple-touch-icon href');
  assert.ok(exists(m[1]), `apple touch icon missing: ${m[1]}`);
});

test('generated icons are real PNG files', () => {
  for (const p of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/icon-180.png']) {
    assert.ok(exists(p), `missing ${p}`);
    const buf = readFileSync(join(ROOT, p));
    // PNG magic number
    assert.deepEqual([...buf.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${p} is not a PNG`);
  }
});

test('every sticker SVG is well-formed, self-contained and non-trivial', () => {
  const dir = join(ROOT, 'assets/stickers');
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
  assert.ok(files.length >= 50, `expected >= 50 svg assets, got ${files.length}`);
  for (const f of files) {
    const svg = readFileSync(join(dir, f), 'utf8');
    assert.match(svg, /<svg[\s>]/, `${f} has no <svg> root`);
    assert.match(svg, /<\/svg>/, `${f} not closed`);
    assert.ok(svg.length > 300, `${f} looks too small to be real art`);
    // must be self-contained (safe to inline / cache / render to canvas)
    assert.doesNotMatch(svg, /<script/i, `${f} contains a script`);
    assert.doesNotMatch(svg, /<image\b/i, `${f} embeds an external image`);
    assert.doesNotMatch(svg, /https?:\/\/(?!www\.w3\.org)/i, `${f} references an external URL`);
  }
});
