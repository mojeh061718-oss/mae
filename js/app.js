// app.js — orchestrates screens, camera, editor, stickers, gallery, PWA.
import { Camera } from './camera.js';
import { FaceDetector } from './faces.js';
import { Editor, FILTERS, BRUSHES, PAINT_COLORS } from './editor.js';
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

// Animated 10-second countdown ring visualiser.
const CIRC = 2 * Math.PI * 45;
function runCountdown(seconds) {
  return new Promise((resolve) => {
    const wrap = $('#countdown');
    const ring = $('#cd-progress');
    const num = $('#cd-num');
    ring.style.strokeDasharray = `${CIRC}`;
    ring.style.strokeDashoffset = '0';
    wrap.classList.remove('hidden');

    const total = seconds * 1000;
    let start = null;
    let lastShown = -1;

    const frame = (ts) => {
      if (start === null) start = ts;
      const elapsed = Math.min(total, ts - start);
      const p = elapsed / total;
      ring.style.strokeDashoffset = `${CIRC * p}`;
      // color shifts green -> yellow -> red as time runs out
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
        num.textContent = '📸';
        beep(1600, 0.18, 0.08);
        setTimeout(() => { wrap.classList.add('hidden'); resolve(); }, 250);
      }
    };
    requestAnimationFrame(frame);
  });
}

async function capture() {
  if (!video.videoWidth) { toast('Camera is still waking up…'); return; }
  const flash = $('#cam-flash');
  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');
  beep(1600, 0.12, 0.05);

  // Capture exactly what she framed: crop to the full-screen preview aspect.
  const aspect = (video.clientWidth / video.clientHeight) || (video.videoWidth / video.videoHeight);
  editor.setPhoto(video, camera.isFrontFacing(), aspect);
  openEditor();
  await startNewGalleryEntry(); // auto-save the fresh photo immediately
  detectFaces();
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

function buildStickerGrid() {
  const grid = $('#sticker-grid');
  grid.innerHTML = '';
  stickersByCategory(activeCat).forEach((s) => {
    const b = document.createElement('button');
    b.className = 'sticker-btn';
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
    sw.textContent = '🌈';
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
    b.className = 'chip' + (br.id === editor.brush ? ' active' : '');
    b.textContent = `${br.icon} ${br.name}`;
    b.addEventListener('click', () => {
      editor.setTool('draw');
      editor.setBrush(br.id);
      buildBrushes();
    });
    row.appendChild(b);
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
  toast('Saved to My Photos! 🎉');
  show('screen-camera');
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
  editor.preloadAssets(STICKERS.map((s) => s.asset));
  buildStickerCats();
  buildStickerGrid();
  buildFilters();
  buildBrushes();
  buildColors();
  updateGalleryCount();
  startCamera();
  detector.warmUp();
  if (isIos() && !isStandalone()) setTimeout(() => showIosHintIfNeeded(), 4000);
}
boot();

// Exposed for automated end-to-end verification. Harmless in production.
window.__mae = { editor, gallery, detector, camera, capture, placeSticker, show, runCountdown };
