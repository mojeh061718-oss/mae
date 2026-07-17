// editor.js
// The photo editor: base image + filter + paint layer + placed HD stickers.
// Stickers are original hand-crafted SVG artwork drawn as images, so they stay
// razor-sharp at any size. Handles auto face-placement (one per face zone),
// drawing brushes, filters, touch manipulation and an autosave hook.

import { placeSticker } from './geometry.js';

// -------------------------------------------------------------- asset store
// Loads + caches sticker SVGs as <img>, redrawing when new ones arrive.
class AssetStore {
  constructor(onLoad) {
    this.map = new Map();
    this.onLoad = onLoad;
  }
  preload(urls) { urls.forEach((u) => this.get(u)); }
  get(url) {
    let rec = this.map.get(url);
    if (rec) return rec;
    const img = new Image();
    rec = { img, ready: false };
    img.onload = () => { rec.ready = true; this.onLoad && this.onLoad(); };
    img.onerror = () => { rec.ready = false; };
    img.decoding = 'async';
    img.src = url;
    this.map.set(url, rec);
    return rec;
  }
}

// Which "zone" a face sticker occupies. Only one sticker per zone at a time,
// so choosing new eyes swaps the eyes instead of stacking them.
export function slotForAnchor(anchor) {
  if (anchor === 'crown') return 'head';
  if (anchor === 'eyes' || anchor === 'leftEye' || anchor === 'rightEye') return 'eyes';
  if (anchor === 'cheeks' || anchor === 'leftCheek' || anchor === 'rightCheek') return 'cheeks';
  return anchor; // nose, mouth, chin
}

// ------------------------------------------------------------------- filters
export const FILTERS = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'bright', name: 'Bright', css: 'brightness(1.25) saturate(1.1)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(2) contrast(1.15)' },
  { id: 'warm', name: 'Sunny', css: 'sepia(0.4) saturate(1.6) hue-rotate(-15deg) brightness(1.05)' },
  { id: 'cool', name: 'Frosty', css: 'saturate(1.3) hue-rotate(160deg) brightness(1.05)' },
  { id: 'gray', name: 'Old Movie', css: 'grayscale(1) contrast(1.1)' },
  { id: 'sepia', name: 'Vintage', css: 'sepia(0.7) contrast(1.05) brightness(1.05)' },
  { id: 'invert', name: 'Spooky', css: 'invert(1)' },
  { id: 'dreamy', name: 'Dreamy', css: 'blur(1px) brightness(1.15) saturate(1.3)' },
  { id: 'candy', name: 'Cotton Candy', css: 'hue-rotate(300deg) saturate(1.7) brightness(1.1)' },
  { id: 'mint', name: 'Minty', css: 'hue-rotate(90deg) saturate(1.5)' },
  { id: 'night', name: 'Moonlight', css: 'brightness(0.85) contrast(1.2) hue-rotate(200deg) saturate(1.3)' },
  { id: 'ghost', name: 'Ghosty', css: 'invert(1) hue-rotate(180deg) contrast(1.1)' },
  { id: 'sunburst', name: 'Golden', css: 'sepia(0.3) saturate(2) hue-rotate(-25deg) brightness(1.15)' },
  { id: 'bubblegum', name: 'Bubblegum', css: 'hue-rotate(320deg) saturate(1.8) contrast(1.05)' },
  { id: 'pop', name: 'Comic Pop', css: 'contrast(1.6) saturate(1.8) brightness(1.05)' },
  { id: 'pixel', name: 'Pixel', css: 'none', special: 'pixelate' },
  { id: 'posterize', name: 'Poster', css: 'none', special: 'posterize' },
];

export function filterById(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}

// --------------------------------------------------------------------- brushes
export const BRUSHES = [
  { id: 'crayon', name: 'Crayon', icon: '🖍️' },
  { id: 'marker', name: 'Marker', icon: '🖊️' },
  { id: 'neon', name: 'Neon', icon: '💡' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'glitter', name: 'Glitter', icon: '✨' },
  { id: 'eraser', name: 'Eraser', icon: '🧽' },
];

export const PAINT_COLORS = [
  '#ff2d6f', '#ff7a00', '#ffd23f', '#4cd964', '#3fa9ff',
  '#a05cff', '#ff5cc8', '#8b5a2b', '#ffffff', '#111111',
];

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

// --------------------------------------------------------------------- Editor
const MAX_DIM = 1600; // cap working resolution for smooth touch + memory

export class Editor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.base = document.createElement('canvas');
    this.baseCtx = this.base.getContext('2d');
    this.paint = document.createElement('canvas');
    this.paintCtx = this.paint.getContext('2d');

    this.assets = new AssetStore(() => this.render());

    this.faces = [];
    this.placed = [];
    this.filter = 'none';
    this.selected = null;

    this.tool = 'sticker';
    this.brush = 'crayon';
    this.color = '#ff2d6f';
    this.brushSize = 14;

    this.history = [];
    this.future = [];
    this._rainbowHue = 0;
    this._stroke = null;

    this.onSelectionChange = null;
    this.onChange = null; // fired after any edit (for autosave)
    this._bindPointer();
  }

  preloadAssets(urls) { this.assets.preload(urls); }

  // targetAspect (width/height) crops the source "cover"-style so the saved
  // photo matches what was framed on screen — WYSIWYG, no letterboxing.
  setPhoto(source, mirror = false, targetAspect = null) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;

    let cropX = 0, cropY = 0, cropW = sw, cropH = sh;
    if (targetAspect && sw > 0 && sh > 0) {
      const srcAspect = sw / sh;
      if (srcAspect > targetAspect) {
        cropW = sh * targetAspect; cropX = (sw - cropW) / 2;
      } else {
        cropH = sw / targetAspect; cropY = (sh - cropH) / 2;
      }
    }

    const scale = Math.min(1, MAX_DIM / Math.max(cropW, cropH));
    const w = Math.round(cropW * scale);
    const h = Math.round(cropH * scale);

    for (const c of [this.canvas, this.base, this.paint]) { c.width = w; c.height = h; }

    this.baseCtx.save();
    if (mirror) { this.baseCtx.translate(w, 0); this.baseCtx.scale(-1, 1); }
    this.baseCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, w, h);
    this.baseCtx.restore();

    this.paintCtx.clearRect(0, 0, w, h);
    this.placed = [];
    this.faces = [];
    this.filter = 'none';
    this.selected = null;
    this.history = [];
    this.future = [];
    this._snapshot();
    this.render();
  }

  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  setFaces(faces) { this.faces = faces || []; }
  faceCount() { return this.faces.length; }

  _placedSize(placed) {
    const rec = this.assets.get(placed.asset);
    const ar = rec.ready && rec.img.naturalWidth
      ? rec.img.naturalHeight / rec.img.naturalWidth : 1;
    return { w: placed.size, h: placed.size * ar };
  }

  _anchorTargets(sticker) {
    if (sticker.anchor === 'eyes' && sticker.perEye) return ['leftEye', 'rightEye'];
    if (sticker.anchor === 'cheeks') return ['leftCheek', 'rightCheek'];
    return [sticker.anchor];
  }

  // Auto-place a face sticker onto every face. Only one sticker per face zone,
  // so a new hat replaces the old hat, new eyes replace the old eyes, etc.
  addFaceSticker(sticker) {
    if (!this.faces.length) return 0;
    this._pushHistory();
    const slot = slotForAnchor(sticker.anchor);
    // remove any existing face sticker occupying the same zone
    this.placed = this.placed.filter((p) => !(p.faceTracked && p.slot === slot));
    let count = 0;
    for (const face of this.faces) {
      for (const anchorName of this._anchorTargets(sticker)) {
        const p = placeSticker(face, { ...sticker, anchor: anchorName });
        this.placed.push(this._makePlaced(sticker, p, true, slot));
        count++;
      }
    }
    this.render();
    this._changed();
    return count;
  }

  addFreeSticker(sticker) {
    this._pushHistory();
    const size = Math.min(this.width, this.height) * (sticker.scale || 0.25);
    const placed = this._makePlaced(sticker, {
      x: this.width / 2, y: this.height / 2, size, rotation: 0,
    }, false, null);
    this.placed.push(placed);
    this.selected = placed;
    this.tool = 'sticker';
    this._emitSelection();
    this.render();
    this._changed();
    return placed;
  }

  _makePlaced(sticker, p, faceTracked, slot) {
    return {
      uid: `p${this._uid = (this._uid || 0) + 1}`,
      asset: sticker.asset,
      faceTracked, slot,
      x: p.x, y: p.y, size: p.size,
      rotation: p.rotation || 0,
      mirror: false,
    };
  }

  setFilter(id) { this.filter = id; this.render(); this._changed(); }

  setTool(tool) {
    this.tool = tool;
    if (tool === 'draw') { this.selected = null; this._emitSelection(); }
    this.render();
  }
  setBrush(b) { this.brush = b; }
  setColor(c) { this.color = c; }
  setBrushSize(px) { this.brushSize = px; }

  scaleSelected(f) { if (this.selected) { this._pushHistory(); this.selected.size = Math.max(16, this.selected.size * f); this.render(); this._changed(); } }
  rotateSelected(r) { if (this.selected) { this._pushHistory(); this.selected.rotation += r; this.render(); this._changed(); } }
  flipSelected() { if (this.selected) { this._pushHistory(); this.selected.mirror = !this.selected.mirror; this.render(); this._changed(); } }
  deleteSelected() {
    if (!this.selected) return;
    this._pushHistory();
    this.placed = this.placed.filter((p) => p !== this.selected);
    this.selected = null;
    this._emitSelection();
    this.render();
    this._changed();
  }
  bringSelectedToFront() {
    if (!this.selected) return;
    this.placed = this.placed.filter((p) => p !== this.selected);
    this.placed.push(this.selected);
    this.render();
  }

  clearStickers() {
    this._pushHistory();
    this.placed = [];
    this.selected = null;
    this._emitSelection();
    this.render();
    this._changed();
  }
  clearDrawing() {
    this._pushHistory();
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.render();
    this._changed();
  }

  // -------------------------------------------------------------- history
  _snapshot() {
    return {
      placed: JSON.stringify(this.placed),
      paint: this.paintCtx.getImageData(0, 0, this.width, this.height),
    };
  }
  _pushHistory() {
    this.history.push(this._snapshot());
    if (this.history.length > 12) this.history.shift();
    this.future = [];
  }
  _restore(snap) {
    this.placed = JSON.parse(snap.placed);
    this.paintCtx.putImageData(snap.paint, 0, 0);
    this.selected = null;
    this._emitSelection();
    this.render();
  }
  undo() { if (this.history.length > 1) { this.future.push(this.history.pop()); this._restore(this.history[this.history.length - 1]); this._changed(); } }
  redo() { if (this.future.length) { const s = this.future.pop(); this.history.push(s); this._restore(s); this._changed(); } }
  canUndo() { return this.history.length > 1; }
  canRedo() { return this.future.length > 0; }

  // -------------------------------------------------------------- render
  render() {
    const { ctx, width: w, height: h } = this;
    ctx.clearRect(0, 0, w, h);

    const f = filterById(this.filter);
    ctx.save();
    ctx.filter = f.css || 'none';
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();

    if (f.special === 'pixelate') this._applyPixelate(14);
    if (f.special === 'posterize') this._applyPosterize(5);

    ctx.drawImage(this.paint, 0, 0);

    for (const p of this.placed) this._drawPlaced(p);
    if (this.selected) this._drawSelection(this.selected);
  }

  _drawPlaced(p) {
    const rec = this.assets.get(p.asset);
    if (!rec.ready) return;
    const { w, h } = this._placedSize(p);
    const { ctx } = this;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);
    if (p.mirror) ctx.scale(-1, 1);
    ctx.drawImage(rec.img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  _drawSelection(p) {
    const { ctx } = this;
    const { w, h } = this._placedSize(p);
    const r = Math.max(w, h) * 0.6;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = '#3fa9ff';
    ctx.lineWidth = Math.max(2, this.width * 0.004);
    ctx.setLineDash([this.width * 0.02, this.width * 0.015]);
    circle(ctx, 0, 0, r);
    ctx.stroke();
    ctx.restore();
  }

  _applyPixelate(block) {
    const { ctx, width: w, height: h } = this;
    const tmp = document.createElement('canvas');
    const tw = Math.max(1, Math.round(w / block));
    const th = Math.max(1, Math.round(h / block));
    tmp.width = tw; tmp.height = th;
    tmp.getContext('2d').drawImage(this.base, 0, 0, tw, th);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tmp, 0, 0, tw, th, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  _applyPosterize(levels) {
    const { ctx, width: w, height: h } = this;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
    ctx.putImageData(img, 0, 0);
  }

  // -------------------------------------------------------------- pointer
  _bindPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._pointerDown(e));
    c.addEventListener('pointermove', (e) => this._pointerMove(e));
    c.addEventListener('pointerup', (e) => this._pointerUp(e));
    c.addEventListener('pointercancel', (e) => this._pointerUp(e));
    c.addEventListener('pointerleave', (e) => this._pointerUp(e));
  }
  _toCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }
  _hitSticker(pt) {
    for (let i = this.placed.length - 1; i >= 0; i--) {
      const p = this.placed[i];
      const { w, h } = this._placedSize(p);
      if (Math.hypot(pt.x - p.x, pt.y - p.y) <= Math.max(w, h) * 0.55) return p;
    }
    return null;
  }
  _pointerDown(e) {
    e.preventDefault();
    this.canvas.setPointerCapture?.(e.pointerId);
    const pt = this._toCanvas(e);
    if (this.tool === 'draw') {
      this._pushHistory();
      this._rainbowHue = (this._rainbowHue + 20) % 360;
      this._stroke = { last: pt };
      this._paintDab(pt, pt);
      this.render();
      return;
    }
    const hit = this._hitSticker(pt);
    this.selected = hit;
    this._emitSelection();
    if (hit) {
      this.bringSelectedToFront();
      this._drag = { dx: pt.x - hit.x, dy: pt.y - hit.y, moved: false };
      this._pushHistory();
    }
    this.render();
  }
  _pointerMove(e) {
    if (this.tool === 'draw' && this._stroke) {
      const pt = this._toCanvas(e);
      this._paintDab(this._stroke.last, pt);
      this._stroke.last = pt;
      this.render();
      return;
    }
    if (this._drag && this.selected) {
      const pt = this._toCanvas(e);
      this.selected.x = pt.x - this._drag.dx;
      this.selected.y = pt.y - this._drag.dy;
      this._drag.moved = true;
      this.render();
    }
  }
  _pointerUp() {
    if (this._stroke) { this._stroke = null; this._changed(); }
    if (this._drag) {
      if (!this._drag.moved) this.history.pop();
      else this._changed();
    }
    this._drag = null;
  }

  _paintDab(from, to) {
    const ctx = this.paintCtx;
    const size = this.brushSize;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (this.brush === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.brush === 'glitter') {
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const x = from.x + (to.x - from.x) * t + (this._pseudo(i) - 0.5) * size * 3;
        const y = from.y + (to.y - from.y) * t + (this._pseudo(i + 7) - 0.5) * size * 3;
        ctx.fillStyle = `hsl(${(this._rainbowHue + i * 40) % 360},95%,65%)`;
        circle(ctx, x, y, size * (0.25 + this._pseudo(i + 3) * 0.4)); ctx.fill();
      }
      return;
    }
    ctx.save();
    if (this.brush === 'neon') {
      ctx.shadowColor = this.color; ctx.shadowBlur = size * 1.5;
      ctx.strokeStyle = this.color; ctx.lineWidth = size * 0.8;
    } else if (this.brush === 'rainbow') {
      this._rainbowHue = (this._rainbowHue + 6) % 360;
      ctx.strokeStyle = `hsl(${this._rainbowHue},90%,55%)`; ctx.lineWidth = size;
    } else if (this.brush === 'marker') {
      ctx.globalAlpha = 0.55; ctx.strokeStyle = this.color; ctx.lineWidth = size * 1.6;
    } else {
      ctx.strokeStyle = this.color; ctx.lineWidth = size;
    }
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.restore();
  }

  _pseudo(n) {
    const x = Math.sin(n * 12.9898 + this._rainbowHue * 0.017) * 43758.5453;
    return x - Math.floor(x);
  }

  _emitSelection() { this.onSelectionChange?.(this.selected); }
  _changed() { this.onChange?.(); }

  // -------------------------------------------------------------- export
  async toBlob(type = 'image/png', quality = 0.95) {
    const sel = this.selected; this.selected = null; this.render(); this.selected = sel;
    const blob = await new Promise((r) => this.canvas.toBlob(r, type, quality));
    this.render();
    return blob;
  }
}
