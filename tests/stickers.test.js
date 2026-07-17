import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STICKERS, CATEGORIES, stickerById, stickersByCategory } from '../js/stickers.js';
import { RENDERERS, FILTERS, BRUSHES, PAINT_COLORS } from '../js/editor.js';

test('there are at least 50 stickers', () => {
  assert.ok(STICKERS.length >= 50, `expected >= 50 stickers, got ${STICKERS.length}`);
});

test('sticker ids are unique', () => {
  const ids = STICKERS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every sticker has the required fields', () => {
  for (const s of STICKERS) {
    assert.ok(s.id, `missing id on ${JSON.stringify(s)}`);
    assert.ok(s.name, `missing name on ${s.id}`);
    assert.ok(s.icon, `missing icon on ${s.id}`);
    assert.ok(s.category, `missing category on ${s.id}`);
    assert.equal(typeof s.scale, 'number', `scale must be number on ${s.id}`);
    assert.ok(s.draw, `missing draw on ${s.id}`);
  }
});

test('every sticker category exists in CATEGORIES', () => {
  const catIds = new Set(CATEGORIES.map((c) => c.id));
  for (const s of STICKERS) {
    assert.ok(catIds.has(s.category), `unknown category ${s.category} on ${s.id}`);
  }
});

test('every category has at least one sticker', () => {
  for (const c of CATEGORIES) {
    assert.ok(stickersByCategory(c.id).length > 0, `empty category ${c.id}`);
  }
});

test('face-tracked stickers declare an anchor', () => {
  for (const s of STICKERS.filter((s) => s.faceTracked)) {
    assert.ok(s.anchor, `faceTracked sticker ${s.id} missing anchor`);
  }
});

test('every draw type has a renderer (or is a valid emoji)', () => {
  for (const s of STICKERS) {
    if (s.draw === 'emoji') {
      assert.ok(s.glyph, `emoji sticker ${s.id} missing glyph`);
    } else {
      assert.equal(typeof RENDERERS[s.draw], 'function', `no renderer for ${s.draw} (${s.id})`);
    }
  }
});

test('we ship a rich set of face-tracked and free stickers', () => {
  const tracked = STICKERS.filter((s) => s.faceTracked).length;
  const free = STICKERS.filter((s) => !s.faceTracked).length;
  assert.ok(tracked >= 20, `expected >= 20 face stickers, got ${tracked}`);
  assert.ok(free >= 15, `expected >= 15 free stickers, got ${free}`);
});

test('stickerById works and returns null for misses', () => {
  assert.equal(stickerById('crown').name, 'Crown');
  assert.equal(stickerById('nope'), null);
});

test('filters are unique and valid', () => {
  const ids = FILTERS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(FILTERS.length >= 12, `expected >= 12 filters, got ${FILTERS.length}`);
  for (const f of FILTERS) {
    assert.ok(f.css || f.special, `filter ${f.id} has neither css nor special`);
  }
});

test('brushes and colors exist', () => {
  assert.ok(BRUSHES.length >= 5);
  assert.ok(BRUSHES.some((b) => b.id === 'eraser'));
  assert.ok(PAINT_COLORS.length >= 8);
});
