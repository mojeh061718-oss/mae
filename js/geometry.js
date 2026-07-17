// geometry.js
// Pure, dependency-free math helpers for placing stickers on detected faces.
// This module is imported by both the browser app and the Node test suite,
// so it must NOT touch any browser-only APIs.

// MediaPipe FaceMesh landmark indices we rely on.
export const LM = {
  foreheadTop: 10,
  chin: 152,
  noseTip: 1,
  faceLeft: 234,
  faceRight: 454,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
  lowerLip: 14,
  leftCheek: 50,
  rightCheek: 280,
};

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Convert a normalized landmark (0..1) into pixel coordinates.
export function toPixel(landmark, width, height) {
  return { x: landmark.x * width, y: landmark.y * height };
}

// Given a full set of normalized landmarks from MediaPipe, compute a compact
// "face metrics" object with everything the sticker placer needs.
export function faceMetrics(landmarks, width, height) {
  const p = (i) => toPixel(landmarks[i], width, height);

  const leftEye = midpoint(p(LM.leftEyeOuter), p(LM.leftEyeInner));
  const rightEye = midpoint(p(LM.rightEyeInner), p(LM.rightEyeOuter));
  const eyesCenter = midpoint(leftEye, rightEye);
  const noseTip = p(LM.noseTip);
  const mouth = midpoint(p(LM.upperLip), p(LM.lowerLip));
  const chin = p(LM.chin);
  const foreheadTop = p(LM.foreheadTop);
  const faceLeft = p(LM.faceLeft);
  const faceRight = p(LM.faceRight);
  const leftCheek = p(LM.leftCheek);
  const rightCheek = p(LM.rightCheek);

  const width_ = dist(faceLeft, faceRight);
  const height_ = dist(foreheadTop, chin);

  // Head roll: angle of the line connecting the two eyes.
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  // Unit vector pointing "up" relative to the (possibly tilted) head.
  const up = { x: Math.sin(roll), y: -Math.cos(roll) };
  // Unit vector pointing "down" relative to the head.
  const down = { x: -up.x, y: -up.y };

  const center = midpoint(eyesCenter, mouth);

  return {
    width: width_,
    height: height_,
    roll,
    up,
    down,
    center,
    anchors: {
      crown: foreheadTop,
      leftEye,
      rightEye,
      eyesCenter,
      nose: noseTip,
      mouth,
      chin,
      leftCheek,
      rightCheek,
      faceCenter: center,
    },
  };
}

// Compute where and how big a sticker should be drawn for a given face.
// sticker: { anchor, scale, offsetY }
//   anchor  : key of metrics.anchors
//   scale   : sticker size as a fraction of face width
//   offsetY : shift along the head's down-axis, as a fraction of face height
//             (negative = up toward the crown, positive = down toward chin)
export function placeSticker(metrics, sticker) {
  const anchor = metrics.anchors[sticker.anchor] || metrics.anchors.faceCenter;
  const offset = (sticker.offsetY || 0) * metrics.height;
  const x = anchor.x + metrics.down.x * offset;
  const y = anchor.y + metrics.down.y * offset;
  const size = metrics.width * (sticker.scale || 1);
  return {
    x,
    y,
    size,
    rotation: sticker.rotates === false ? 0 : metrics.roll,
  };
}

// Rough bounding box of the face, handy for hit-testing / cropping.
export function faceBox(metrics) {
  const { center, width, height } = metrics;
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}
