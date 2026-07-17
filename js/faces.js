// faces.js
// Thin wrapper around MediaPipe Tasks Vision FaceLandmarker.
//
// The heavy WASM + model are loaded lazily from a CDN the first time we
// actually need face detection, so the camera opens instantly and the app
// still works (manual stickers) even if the model can't be fetched offline.

import { faceMetrics } from './geometry.js';

const VISION_VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}`;

// Optional self-hosting / test overrides. Set these globals before the app
// loads to serve the model + wasm from your own origin (fully offline / no CDN).
const g = typeof window !== 'undefined' ? window : {};
const BUNDLE_URL = g.__MAE_VISION_BUNDLE || `${CDN}/vision_bundle.mjs`;
const WASM_PATH = g.__MAE_VISION_WASM || `${CDN}/wasm`;
const MODEL_URL =
  g.__MAE_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise = null;

async function loadLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    const vision = await import(/* @vite-ignore */ BUNDLE_URL);
    const { FaceLandmarker, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numFaces: 8,
    });
    return landmarker;
  })();

  return landmarkerPromise;
}

export class FaceDetector {
  constructor() {
    this.ready = false;
    this.error = null;
  }

  // Preload in the background; never throws.
  async warmUp() {
    try {
      await loadLandmarker();
      this.ready = true;
    } catch (err) {
      this.error = err;
      this.ready = false;
    }
    return this.ready;
  }

  // Detect faces in an image-like source (HTMLImageElement / Canvas).
  // Returns an array of face metrics objects (see geometry.faceMetrics),
  // sized to `width` x `height`. Returns [] and records .error on failure.
  async detect(source, width, height) {
    let landmarker;
    try {
      landmarker = await loadLandmarker();
      this.ready = true;
    } catch (err) {
      this.error = err;
      return [];
    }

    let result;
    try {
      result = landmarker.detect(source);
    } catch (err) {
      this.error = err;
      return [];
    }

    const faces = result && result.faceLandmarks ? result.faceLandmarks : [];
    return faces.map((landmarks) => faceMetrics(landmarks, width, height));
  }
}
