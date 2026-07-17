import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STICKERS, CATEGORIES, stickerById, stickersByCategory } from '../js/stickers.js';
import { FILTERS, BRUSHES, PAINT_COLORS, slotForAnchor } from '../js/editor.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('there are at least 50 stickers', () => {
  assert.ok(STICKERS.length >= 50, `expected >= 50 stickers, got ${STICKERS.length}`);
});

test('sticker ids are unique', () => {
  const ids = STICKERS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every sticker has required fields and a real asset file', () => {
  for (const s of STICKERS) {
    assert.ok(s.id, `missing id`);
    assert.ok(s.name, `missing name on ${s.id}`);
    assert.ok(s.category, `missing category on ${s.id}`);
    assert.equal(typeof s.scale, 'number', `scale must be number on ${s.id}`);
    assert.ok(s.asset && s.asset.endsWith('.svg'), `bad asset on ${s.id}`);
    assert.ok(existsSync(join(ROOT, s.asset)), `asset file missing: ${s.asset}`);
  }
});

test('every sticker category exists in CATEGORIES', () => {
  const catIds = new Set(CATEGORIES.map((c) => c.id));
  for (const s of STICKERS) {
    assert.ok(catIds.has(s.category), `unknown category ${s.category} on ${s.id}`);
  }
});

test('every category has stickers and a thumbnail that exists', () => {
  for (const c of CATEGORIES) {
    assert.ok(stickersByCategory(c.id).length > 0, `empty category ${c.id}`);
    assert.ok(existsSync(join(ROOT, c.thumb)), `category thumb missing: ${c.thumb}`);
  }
});

test('face-tracked stickers declare an anchor that maps to a zone', () => {
  for (const s of STICKERS.filter((x) => x.faceTracked)) {
    assert.ok(s.anchor, `faceTracked sticker ${s.id} missing anchor`);
    assert.ok(slotForAnchor(s.anchor), `no zone for anchor ${s.anchor} (${s.id})`);
  }
});

test('rich mix of face-tracked and free stickers', () => {
  const tracked = STICKERS.filter((s) => s.faceTracked).length;
  const free = STICKERS.filter((s) => !s.faceTracked).length;
  assert.ok(tracked >= 25, `expected >= 25 face stickers, got ${tracked}`);
  assert.ok(free >= 8, `expected >= 8 free stickers, got ${free}`);
});

test('face zones: hats/ears share one zone, eyes another, etc.', () => {
  assert.equal(slotForAnchor('crown'), 'head');
  assert.equal(slotForAnchor('eyes'), 'eyes');
  assert.equal(slotForAnchor('leftEye'), 'eyes');
  assert.equal(slotForAnchor('cheeks'), 'cheeks');
  assert.equal(slotForAnchor('nose'), 'nose');
  assert.equal(slotForAnchor('mouth'), 'mouth');
});

test('stickerById works and returns null for misses', () => {
  assert.equal(stickerById('crown').name, 'Gold Crown');
  assert.equal(stickerById('nope'), null);
});

test('filters are unique and valid', () => {
  const ids = FILTERS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(FILTERS.length >= 12, `expected >= 12 filters, got ${FILTERS.length}`);
  for (const f of FILTERS) assert.ok(f.css || f.special, `filter ${f.id} invalid`);
});

test('brushes and colors exist', () => {
  assert.ok(BRUSHES.length >= 5);
  assert.ok(BRUSHES.some((b) => b.id === 'eraser'));
  assert.ok(PAINT_COLORS.length >= 8);
});
