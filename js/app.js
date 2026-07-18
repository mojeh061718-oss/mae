// app.js — orchestrates screens, camera, editor, stickers, gallery, PWA.
import { Camera } from './camera.js';
import { FaceDetector } from './faces.js';
import { Editor, FILTERS, FRAMES, frameAsset, BRUSHES, PAINT_COLORS } from './editor.js';
import { STICKERS, CATEGORIES, stickersByCategory } from './stickers.js';
import { Gallery } from './gallery.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const video = $('#video');
const canvas = $('#canvas');

const camera = new Camera(video);
const detector = new FaceDetector();
const editor = new Editor(canvas);
const gallery = new Gallery();

// ---------------------------------------------------------------- screens
function show(screenId) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === screenId));
}

// ---------------------------------------------------------------- toast
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 1800);
}

// ---------------------------------------------------------------- sound (tiny, no assets)
let audioCtx = null;
function beep(freq = 880, dur = 0.08, gain = 0.06) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (_) { /* ignore */ }
}

// ---------------------------------------------------------------- camera
async function startCamera() {
  const msg = $('#cam-message');
  if (!Camera.isSupported()) {
    msg.textContent = '📷 Camera not supported on this device.';
    msg.classList.remove('hidden');
    return;
  }
  try {
    await camera.start('user');
    video.classList.toggle('mirror', camera.isFrontFacing());
    msg.classList.add('hidden');
  } catch (err) {
    msg.textContent = '📷 Please allow camera access, then tap here to retry.';
    msg.classList.remove('hidden');
    msg.onclick = () => startCamera();
  }
}

$('#btn-flip').addEventListener('click', async () => {
  try {
    await camera.flip();
    video.classList.toggle('mirror', camera.isFrontFacing());
    toast(camera.isFrontFacing() ? '🤳 Selfie camera' : '📸 Back camera');
  } catch (err) {
    toast('Only one camera here!');
  }
});

// ---- self timer (Off / 10s)
let timerOn = false;
$('#btn-timer').addEventListener('click', () => {
  timerOn = !timerOn;
  $('#timer-label').textContent = timerOn ? '10s' : 'Off';
  $('#btn-timer').classList.toggle('active', timerOn);
});

$('#btn-shutter').addEventListener('click', async () => {
  // Prime audio on the user gesture.
  beep(0, 0.001, 0.0001);
  if (timerOn) await runCountdown(10);
  await capture();
});

// Animated countdown ring visualiser (used by the self-timer and photo booth).
const CIRC = 2 * Math.PI * 45;
function runCountdown(seconds, opts = {}) {
  return new Promise((resolve) => {
    const wrap = $('#countdown');
    const ring = $('#cd-progress');
    const num = $('#cd-num');
    const counter = $('#cd-counter');
    const caption = $('#cd-caption');
    ring.style.strokeDasharray = `${CIRC}`;
    ring.style.strokeDashoffset = '0';
    caption.classList.add('hidden');
    if (opts.counter) { counter.textContent = opts.counter; counter.classList.remove('hidden'); }
    else counter.classList.add('hidden');
    wrap.classList.remove('hidden');

    const total = seconds * 1000;
    let start = null;
    let lastShown = -1;

    const frame = (ts) => {
      if (start === null) start = ts;
      const elapsed = Math.min(total, ts - start);
      const p = elapsed / total;
      ring.style.strokeDashoffset = `${CIRC * p}`;
      const hue = 130 * (1 - p);
      ring.style.stroke = `hsl(${hue}, 90%, 55%)`;

      const remaining = Math.ceil((total - elapsed) / 1000);
      if (remaining !== lastShown && remaining > 0) {
        lastShown = remaining;
        num.textContent = remaining;
        num.classList.remove('pop');
        void num.offsetWidth;
        num.classList.add('pop');
        beep(remaining <= 3 ? 1200 : 760, 0.09);
      }

      if (elapsed < total) {
        requestAnimationFrame(frame);
      } else {
        num.textContent = '';
        caption.textContent = 'Smile!';
        caption.classList.remove('hidden');
        beep(1600, 0.18, 0.08);
        setTimeout(() => {
          wrap.classList.add('hidden');
          counter.classList.add('hidden');
          caption.classList.add('hidden');
          resolve();
        }, 300);
      }
    };
    requestAnimationFrame(frame);
  });
}

function doFlash() {
  const flash = $('#cam-flash');
  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture() {
  if (!video.videoWidth) { toast('Camera is still waking up…'); return; }
  doFlash();
  beep(1600, 0.12, 0.05);

  // Capture a clean 3:4 portrait photo (centered crop) — a real photo shape
  // that fills the editor nicely on both phone and iPad.
  editor.setPhoto(video, camera.isFrontFacing(), 3 / 4);
  openEditor();
  await startNewGalleryEntry(); // auto-save the fresh photo immediately
  detectFaces();
}

// ---------------------------------------------------------------- photo booth
let boothBusy = false;
$('#btn-booth').addEventListener('click', boothCapture);

async function boothCapture() {
  if (boothBusy) return;
  if (!video.videoWidth) { toast('Camera is still waking up…'); return; }
  boothBusy = true;
  try {
    beep(0, 0.001, 0.0001); // prime audio
    const shots = [];
    for (let i = 0; i < 4; i++) {
      await runCountdown(3, { counter: `${i + 1} of 4` });
      doFlash();
      beep(1600, 0.12, 0.05);
      shots.push(grabFrame());
      await wait(320);
    }
    const collage = buildCollage(shots);
    editor.setPhoto(collage, false, null);
    openEditor();
    await startNewGalleryEntry();
    fireConfetti();
    detectFaces();
    toast('Photo booth strip made!');
  } finally {
    boothBusy = false;
  }
}

// grab the current video frame cropped to 3:4 (mirrored for the selfie cam)
function grabFrame() {
  const vw = video.videoWidth, vh = video.videoHeight, targetA = 3 / 4;
  let cw = vw, ch = vh, cx = 0, cy = 0;
  if (vw / vh > targetA) { cw = vh * targetA; cx = (vw - cw) / 2; }
  else { ch = vw / targetA; cy = (vh - ch) / 2; }
  const outW = 640, outH = 853;
  const c = document.createElement('canvas');
  c.width = outW; c.height = outH;
  const ctx = c.getContext('2d');
  if (camera.isFrontFacing()) { ctx.translate(outW, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, cx, cy, cw, ch, 0, 0, outW, outH);
  return c;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// compose four shots into a cute 2x2 collage on a confetti gradient
function buildCollage(shots) {
  const W = 900, H = 1200;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#ff8fd6'); g.addColorStop(0.5, '#c97bff'); g.addColorStop(1, '#7b3ff2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cols = ['#ffffff', '#ffd23f', '#4cd964', '#3fa9ff'];
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.45 + 0.5 * Math.random();
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const pad = 42, gap = 26;
  const cw = (W - 2 * pad - gap) / 2, ch = (H - 2 * pad - gap) / 2;
  shots.forEach((s, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const x = pad + col * (cw + gap), y = pad + row * (ch + gap);
    ctx.save();
    roundRectPath(ctx, x, y, cw, ch, 24);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    const sa = s.width / s.height, ta = cw / ch;
    let dw, dh, dx, dy;
    if (sa > ta) { dh = ch; dw = ch * sa; dx = x - (dw - cw) / 2; dy = y; }
    else { dw = cw; dh = cw / sa; dx = x; dy = y - (dh - ch) / 2; }
    ctx.drawImage(s, dx, dy, dw, dh);
    ctx.restore();
    ctx.save();
    roundRectPath(ctx, x, y, cw, ch, 24);
    ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  });
  return c;
}

// ---------------------------------------------------------------- confetti 🎉
function fireConfetti() {
  const c = $('#confetti');
  c.classList.remove('hidden');
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = window.innerWidth * dpr;
  c.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = window.innerWidth, H = window.innerHeight;
  const cols = ['#ff2d6f', '#ffd23f', '#3fa9ff', '#4cd964', '#a05cff', '#ff7a00', '#ff5cc8'];
  const parts = [];
  for (let i = 0; i < 130; i++) {
    parts.push({
      x: W * (0.15 + 0.7 * Math.random()), y: H * 0.3 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 9, vy: -7 - Math.random() * 10, g: 0.3,
      rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.5,
      w: 7 + Math.random() * 9, h: 9 + Math.random() * 11,
      col: cols[i % cols.length], round: Math.random() < 0.4,
    });
  }
  let startT = null;
  function frame(t) {
    if (startT === null) startT = t;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t - startT < 1600) requestAnimationFrame(frame);
    else c.classList.add('hidden');
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- autosave
let currentPhotoId = null;
let autosaveTimer = null;

async function startNewGalleryEntry() {
  const blob = await editor.toBlob('image/png');
  if (!blob) return;
  currentPhotoId = await gallery.save(blob);
  await updateGalleryCount();
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(doAutosave, 650);
}
async function doAutosave() {
  if (!currentPhotoId) return;
  const blob = await editor.toBlob('image/png');
  if (!blob) return;
  await gallery.update(currentPhotoId, blob);
  await updateGalleryCount();
  flashAutosaved();
}
editor.onChange = scheduleAutosave;

function flashAutosaved() {
  const b = $('#autosave-badge');
  b.classList.add('show');
  clearTimeout(flashAutosaved._t);
  flashAutosaved._t = setTimeout(() => b.classList.remove('show'), 1200);
}

// ---------------------------------------------------------------- editor open
function openEditor() {
  show('screen-editor');
  refreshHistoryButtons();
  $('#sel-toolbar').classList.add('hidden');
  selectTab('stickers');
}

// Silent: never announces when no face is found (she may shoot other things).
async function detectFaces() {
  const faces = await detector.detect(editor.base, editor.width, editor.height);
  editor.setFaces(faces);
}

$('#btn-retake').addEventListener('click', async () => {
  await doAutosave();
  show('screen-camera');
});

// ---------------------------------------------------------------- tabs
function selectTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tray-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
  editor.setTool(name === 'draw' ? 'draw' : 'sticker');
}
$$('.tab').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));

// ---------------------------------------------------------------- stickers UI
let activeCat = CATEGORIES[0].id;

function buildStickerCats() {
  const row = $('#sticker-cats');
  row.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat.id === activeCat ? ' active' : '');
    b.innerHTML = `<img src="${cat.thumb}" alt=""><span>${cat.name}</span>`;
    b.addEventListener('click', () => {
      activeCat = cat.id;
      buildStickerCats();
      buildStickerGrid();
    });
    row.appendChild(b);
  });
}

const CATEGORY_TINT = {
  hats: '#fff2c9',
  eyes: '#ffd9ea',
  animal: '#d9f5df',
  face: '#ffe1cf',
  mouth: '#ffd8e0',
  cheeks: '#efdcff',
  fun: '#d7ecff',
};

function buildStickerGrid() {
  const grid = $('#sticker-grid');
  grid.innerHTML = '';
  const tint = CATEGORY_TINT[activeCat] || '#f3eefc';
  stickersByCategory(activeCat).forEach((s) => {
    const b = document.createElement('button');
    b.className = 'sticker-btn';
    b.style.setProperty('--tile', tint);
    b.innerHTML = `<img src="${s.asset}" alt="${s.name}" loading="lazy"><span class="lbl">${s.name}</span>`;
    b.addEventListener('click', () => placeSticker(s));
    grid.appendChild(b);
  });
}

function placeSticker(sticker) {
  if (sticker.faceTracked) {
    const n = editor.addFaceSticker(sticker); // swaps same-zone sticker automatically
    if (n === 0) editor.addFreeSticker(sticker); // no face: drop it, she can drag it
  } else {
    editor.addFreeSticker(sticker);
  }
  refreshHistoryButtons();
}

// ---------------------------------------------------------------- filters UI
function buildFilters() {
  const grid = $('#filter-grid');
  grid.innerHTML = '';
  FILTERS.forEach((f) => {
    const b = document.createElement('button');
    b.className = 'filter-btn' + (f.id === editor.filter ? ' active' : '');
    const sw = document.createElement('span');
    sw.className = 'sw';
    // the swatch is a rainbow gradient (CSS); show the filter live on top of it
    sw.style.filter = f.css && f.css !== 'none' ? f.css : 'none';
    b.appendChild(sw);
    b.appendChild(document.createTextNode(f.name));
    b.addEventListener('click', () => { editor.setFilter(f.id); buildFilters(); });
    grid.appendChild(b);
  });
}

// ---------------------------------------------------------------- draw UI
function buildBrushes() {
  const row = $('#brush-row');
  row.innerHTML = '';
  BRUSHES.forEach((br) => {
    const b = document.createElement('button');
    b.className = 'chip brush-chip' + (br.id === editor.brush ? ' active' : '');
    b.innerHTML = `<img class="ico" src="${br.icon}" alt=""><span>${br.name}</span>`;
    b.addEventListener('click', () => {
      editor.setTool('draw');
      editor.setBrush(br.id);
      buildBrushes();
    });
    row.appendChild(b);
  });
}

function buildFrames() {
  const grid = $('#frame-grid');
  grid.innerHTML = '';
  FRAMES.forEach((fr) => {
    const b = document.createElement('button');
    b.className = 'filter-btn frame-btn' + (fr.id === editor.frame ? ' active' : '');
    const sw = document.createElement('span');
    sw.className = 'sw' + (fr.id === 'none' ? ' none' : '');
    if (fr.id !== 'none') {
      const im = document.createElement('img');
      im.src = frameAsset(fr.id); im.alt = '';
      sw.appendChild(im);
    }
    b.appendChild(sw);
    b.appendChild(document.createTextNode(fr.name));
    b.addEventListener('click', () => { editor.setFrame(fr.id); buildFrames(); });
    grid.appendChild(b);
  });
}

function buildColors() {
  const row = $('#color-row');
  row.innerHTML = '';
  PAINT_COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (c === editor.color ? ' active' : '');
    b.style.background = c;
    b.addEventListener('click', () => {
      editor.setColor(c);
      editor.setTool('draw');
      buildColors();
    });
    row.appendChild(b);
  });
}

$('#brush-size').addEventListener('input', (e) => editor.setBrushSize(Number(e.target.value)));
$('#btn-clear-draw').addEventListener('click', () => {
  editor.clearDrawing();
  refreshHistoryButtons();
  toast('Drawing cleared 🧼');
});

// ---------------------------------------------------------------- magic
$('#btn-surprise').addEventListener('click', () => {
  if (!editor.faceCount()) { toast('Point at a face first! 😀'); return; }
  const pool = STICKERS.filter((s) => s.faceTracked);
  let seed = editor.placed.length + 3;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  ['hats', 'eyes', 'face', 'cheeks'].forEach((g) => {
    const opts = pool.filter((s) => s.category === g);
    if (opts.length) editor.addFaceSticker(opts[Math.floor(rand() * opts.length)]);
  });
  refreshHistoryButtons();
  toast('✨ Ta-da! ✨');
});

$('#btn-clear-stickers').addEventListener('click', () => {
  editor.clearStickers();
  $('#sel-toolbar').classList.add('hidden');
  refreshHistoryButtons();
  toast('Stickers cleared 🧹');
});

// ---------------------------------------------------------------- selection toolbar
editor.onSelectionChange = (sel) => $('#sel-toolbar').classList.toggle('hidden', !sel);

$('#sel-toolbar').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act;
  if (!act) return;
  if (act === 'bigger') editor.scaleSelected(1.2);
  if (act === 'smaller') editor.scaleSelected(1 / 1.2);
  if (act === 'rotate') editor.rotateSelected(Math.PI / 8);
  if (act === 'flip') editor.flipSelected();
  if (act === 'delete') editor.deleteSelected();
  refreshHistoryButtons();
});

// ---------------------------------------------------------------- undo/redo
function refreshHistoryButtons() {
  $('#btn-undo').disabled = !editor.canUndo();
  $('#btn-redo').disabled = !editor.canRedo();
}
$('#btn-undo').addEventListener('click', () => { editor.undo(); refreshHistoryButtons(); });
$('#btn-redo').addEventListener('click', () => { editor.redo(); refreshHistoryButtons(); });

// ---------------------------------------------------------------- done + gallery
$('#btn-save').addEventListener('click', async () => {
  await doAutosave();
  fireConfetti();
  toast('Saved to My Photos!');
  setTimeout(() => show('screen-camera'), 550);
});

async function updateGalleryCount() {
  const n = await gallery.count();
  $('#gallery-count').textContent = n;
}

$('#btn-open-gallery').addEventListener('click', openGallery);
$('#btn-gallery-back').addEventListener('click', () => show('screen-camera'));

async function openGallery() {
  show('screen-gallery');
  const items = await gallery.all();
  const grid = $('#gallery-grid');
  const empty = $('#gallery-empty');
  grid.innerHTML = '';
  empty.classList.toggle('hidden', items.length > 0);
  grid.classList.toggle('hidden', items.length === 0);
  for (const item of items) {
    const url = URL.createObjectURL(item.blob);
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="${url}" alt="photo" />
      <div class="row">
        <button class="dl" title="Download">⬇️</button>
        <button class="del" title="Delete">🗑️</button>
      </div>`;
    card.querySelector('.dl').addEventListener('click', () => downloadBlob(item.blob));
    card.querySelector('.del').addEventListener('click', async () => {
      await gallery.delete(item.id);
      URL.revokeObjectURL(url);
      await updateGalleryCount();
      openGallery();
    });
    grid.appendChild(card);
  }
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mae-photo-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Downloaded! 📥');
}

// ---------------------------------------------------------------- PWA install
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#btn-install').classList.remove('hidden');
});
$('#btn-install').addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#btn-install').classList.add('hidden');
  } else {
    showIosHintIfNeeded(true);
  }
});

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}
function showIosHintIfNeeded(force = false) {
  if (force || (isIos() && !isStandalone())) $('#ios-hint').classList.remove('hidden');
}
$('#ios-hint-close').addEventListener('click', () => $('#ios-hint').classList.add('hidden'));

// ---------------------------------------------------------------- service worker
if ('serviceWorker' in navigator) {
  // When a new version activates and takes control, reload once to show it.
  // (Only when a controller already existed — i.e. a real update, not first install.)
  if (navigator.serviceWorker.controller) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => reg.update())
      .catch(() => {});
  });
}

// ---------------------------------------------------------------- boot
function boot() {
  editor.preloadAssets([
    ...STICKERS.map((s) => s.asset),
    ...FRAMES.map((f) => frameAsset(f.id)).filter(Boolean),
  ]);
  buildStickerCats();
  buildStickerGrid();
  buildFilters();
  buildFrames();
  buildBrushes();
  buildColors();
  updateGalleryCount();
  startCamera();
  detector.warmUp();
  if (isIos() && !isStandalone()) setTimeout(() => showIosHintIfNeeded(), 4000);
}
boot();

// Exposed for automated end-to-end verification. Harmless in production.
window.__mae = {
  editor, gallery, detector, camera, capture, placeSticker, show, runCountdown,
  grabFrame, buildCollage, fireConfetti, boothCapture,
};
