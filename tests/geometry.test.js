import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, dist, midpoint, toPixel, faceMetrics, placeSticker, faceBox, LM,
} from '../js/geometry.js';

// Build a full 468-length landmark array for an upright, centered face.
function uprightFace() {
  const lm = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const put = (i, x, y) => { lm[i] = { x, y, z: 0 }; };
  put(LM.foreheadTop, 0.5, 0.25);
  put(LM.chin, 0.5, 0.8);
  put(LM.noseTip, 0.5, 0.52);
  put(LM.faceLeft, 0.35, 0.5);
  put(LM.faceRight, 0.65, 0.5);
  put(LM.leftEyeOuter, 0.40, 0.42);
  put(LM.leftEyeInner, 0.46, 0.42);
  put(LM.rightEyeInner, 0.54, 0.42);
  put(LM.rightEyeOuter, 0.60, 0.42);
  put(LM.mouthLeft, 0.45, 0.63);
  put(LM.mouthRight, 0.55, 0.63);
  put(LM.upperLip, 0.5, 0.60);
  put(LM.lowerLip, 0.5, 0.64);
  put(LM.leftCheek, 0.42, 0.55);
  put(LM.rightCheek, 0.58, 0.55);
  return lm;
}

const W = 1000, H = 1000;

test('clamp keeps values in range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('dist and midpoint', () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.deepEqual(midpoint({ x: 0, y: 0 }, { x: 4, y: 2 }), { x: 2, y: 1 });
});

test('toPixel scales normalized coords', () => {
  assert.deepEqual(toPixel({ x: 0.5, y: 0.25 }, 1000, 800), { x: 500, y: 200 });
});

test('faceMetrics computes sane size and orientation', () => {
  const m = faceMetrics(uprightFace(), W, H);
  assert.ok(Math.abs(m.width - 300) < 1, `width ${m.width}`);
  assert.ok(Math.abs(m.height - 550) < 1, `height ${m.height}`);
  assert.ok(Math.abs(m.roll) < 0.01, `roll ${m.roll}`);
  // up vector should point up-screen (negative y)
  assert.ok(m.up.y < -0.99, `up.y ${m.up.y}`);
});

test('face anchors sit where expected', () => {
  const m = faceMetrics(uprightFace(), W, H);
  assert.ok(Math.abs(m.anchors.crown.x - 500) < 1);
  assert.ok(Math.abs(m.anchors.crown.y - 250) < 1);
  // eyes center between the two eyes
  assert.ok(Math.abs(m.anchors.eyesCenter.x - 500) < 1);
  assert.ok(m.anchors.leftEye.x < m.anchors.rightEye.x);
  // nose below eyes, chin below nose
  assert.ok(m.anchors.nose.y > m.anchors.eyesCenter.y);
  assert.ok(m.anchors.chin.y > m.anchors.nose.y);
});

test('a hat placed on the crown lands above the forehead', () => {
  const m = faceMetrics(uprightFace(), W, H);
  const placed = placeSticker(m, { anchor: 'crown', scale: 0.9, offsetY: -0.55 });
  assert.ok(placed.y < m.anchors.crown.y, `hat y ${placed.y} should be above crown ${m.anchors.crown.y}`);
  assert.ok(Math.abs(placed.x - 500) < 1);
  assert.ok(Math.abs(placed.size - 270) < 1, `size ${placed.size}`); // 300 * 0.9
});

test('positive offsetY moves a sticker downward', () => {
  const m = faceMetrics(uprightFace(), W, H);
  const placed = placeSticker(m, { anchor: 'nose', scale: 0.3, offsetY: 0.1 });
  assert.ok(placed.y > m.anchors.nose.y, `expected below nose`);
});

test('sticker rotation follows head roll unless disabled', () => {
  const m = faceMetrics(uprightFace(), W, H);
  const a = placeSticker(m, { anchor: 'nose', scale: 0.3 });
  assert.equal(a.rotation, m.roll);
  const b = placeSticker(m, { anchor: 'nose', scale: 0.3, rotates: false });
  assert.equal(b.rotation, 0);
});

test('a tilted head produces a non-zero roll', () => {
  const lm = uprightFace();
  // tilt: right eye lower than left eye => positive roll
  lm[LM.rightEyeInner] = { x: 0.54, y: 0.50, z: 0 };
  lm[LM.rightEyeOuter] = { x: 0.60, y: 0.52, z: 0 };
  const m = faceMetrics(lm, W, H);
  assert.ok(m.roll > 0.05, `roll ${m.roll}`);
});

test('faceBox is centered on the face', () => {
  const m = faceMetrics(uprightFace(), W, H);
  const box = faceBox(m);
  assert.ok(box.width > 0 && box.height > 0);
  assert.ok(box.x < m.center.x && box.x + box.width > m.center.x);
});

test('unknown anchor falls back to face center', () => {
  const m = faceMetrics(uprightFace(), W, H);
  const placed = placeSticker(m, { anchor: 'nowhere', scale: 0.5 });
  assert.ok(Math.abs(placed.x - m.anchors.faceCenter.x) < 1);
});
