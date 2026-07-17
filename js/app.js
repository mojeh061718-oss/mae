// app.js — orchestrates screens, camera, editor, stickers, gallery, PWA.
import { Camera } from './camera.js';
import { FaceDetector } from './faces.js';
import { Editor, FILTERS, BRUSHES, PAINT_COLORS } from './editor.js';
import { STICKERS, CATEGORIES, stickersByCategory } from './stickers.js';
import { Gallery } from './gallery.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---- elements
const video = $('#video');
const canvas = $('#canvas');

const camera = new Camera(video);
const detector = new FaceDetector();
const editor = new Editor(canvas);
const gallery = new Gallery();

let timerMode = 0; // 0 = off, 3, 5
const timerCycle = [0, 3, 5];

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
  }, 2200);
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

$('#btn-timer').addEventListener('click', () => {
  timerMode = timerCycle[(timerCycle.indexOf(timerMode) + 1) % timerCycle.length];
  $('#timer-label').textContent = timerMode === 0 ? 'Off' : `${timerMode}s`;
});

$('#btn-shutter').addEventListener('click', async () => {
  if (timerMode > 0) {
    await runCountdown(timerMode);
  }
  await capture();
});

function runCountdown(seconds) {
  return new Promise((resolve) => {
    const el = $('#countdown');
    el.classList.remove('hidden');
    let n = seconds;
    el.textContent = n;
    const tick = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(tick);
        el.classList.add('hidden');
        resolve();
      } else {
        el.textContent = n;
      }
    }, 1000);
  });
}

async function capture() {
  if (!video.videoWidth) {
    toast('Camera is still waking up…');
    return;
  }
  // flash
  const flash = $('#cam-flash');
  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');

  editor.setPhoto(video, camera.isFrontFacing());
  openEditor();
  detectFaces();
}

// ---------------------------------------------------------------- editor open
function openEditor() {
  show('screen-editor');
  refreshHistoryButtons();
  $('#sel-toolbar').classList.add('hidden');
  const badge = $('#face-badge');
  badge.textContent = '🔍…';
  badge.classList.remove('hidden');
  // reset tabs to stickers
  selectTab('stickers');
}

async function detectFaces() {
  const badge = $('#face-badge');
  const faces = await detector.detect(editor.base, editor.width, editor.height);
  editor.setFaces(faces);
  if (detector.error && !faces.length) {
    badge.textContent = '😀 tap to place';
  } else {
    badge.textContent = `😀 ${faces.length}`;
  }
  if (faces.length) toast(`Found ${faces.length} ${faces.length === 1 ? 'face' : 'faces'}! 🎉`);
}

$('#btn-retake').addEventListener('click', () => {
  show('screen-camera');
});

// ---------------------------------------------------------------- tabs
function selectTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tray-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
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
    b.textContent = `${cat.icon} ${cat.name}`;
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
    b.innerHTML = `${s.icon}<span class="lbl">${s.name}</span>`;
    b.addEventListener('click', () => placeSticker(s));
    grid.appendChild(b);
  });
}

function placeSticker(sticker) {
  if (sticker.faceTracked) {
    const n = editor.addFaceSticker(sticker);
    if (n > 0) {
      toast(`${sticker.icon} on ${editor.faceCount()} ${editor.faceCount() === 1 ? 'face' : 'faces'}!`);
    } else {
      editor.addFreeSticker(sticker);
      toast('No face yet — drag me where you like! ✋');
    }
  } else {
    editor.addFreeSticker(sticker);
    toast(`${sticker.icon} added — drag to move!`);
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
    b.addEventListener('click', () => {
      editor.setFilter(f.id);
      buildFilters();
    });
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
      toast(`${br.icon} ${br.name} ready — draw on the photo!`);
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

$('#brush-size').addEventListener('input', (e) => {
  editor.setBrushSize(Number(e.target.value));
});

$('#btn-clear-draw').addEventListener('click', () => {
  editor._pushHistory();
  editor.paintCtx.clearRect(0, 0, editor.width, editor.height);
  editor.render();
  refreshHistoryButtons();
  toast('Drawing cleared 🧼');
});

// When the user picks the Draw tab, switch editor into draw mode.
$('[data-tab="draw"]').addEventListener('click', () => editor.setTool('draw'));
$('[data-tab="stickers"]').addEventListener('click', () => editor.setTool('sticker'));

// ---------------------------------------------------------------- magic
$('#btn-surprise').addEventListener('click', () => {
  if (!editor.faceCount()) {
    toast('Take a photo with a face first! 😀');
    return;
  }
  const pool = STICKERS.filter((s) => s.faceTracked);
  const picks = new Set();
  // deterministic-ish spread using current placed count as a seed
  let seed = editor.placed.length + 1;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const groups = ['hats', 'eyes', 'face', 'cheeks'];
  groups.forEach((g) => {
    const opts = pool.filter((s) => s.category === g);
    if (opts.length) picks.add(opts[Math.floor(rand() * opts.length)]);
  });
  picks.forEach((s) => editor.addFaceSticker(s));
  refreshHistoryButtons();
  toast('✨ Ta-da! ✨');
});

$('#btn-clear-stickers').addEventListener('click', () => {
  editor._pushHistory();
  editor.placed = [];
  editor.selected = null;
  editor.render();
  $('#sel-toolbar').classList.add('hidden');
  refreshHistoryButtons();
  toast('Stickers cleared 🧹');
});

// ---------------------------------------------------------------- selection toolbar
editor.onSelectionChange = (sel) => {
  $('#sel-toolbar').classList.toggle('hidden', !sel);
};

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

// ---------------------------------------------------------------- save + gallery
$('#btn-save').addEventListener('click', async () => {
  const blob = await editor.toBlob('image/png');
  if (!blob) { toast('Hmm, could not save 😢'); return; }
  await gallery.save(blob);
  await updateGalleryCount();
  toast('Saved to My Photos! 🎉');
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
  if ((force || (isIos() && !isStandalone())) ) {
    $('#ios-hint').classList.remove('hidden');
  }
}
$('#ios-hint-close').addEventListener('click', () => $('#ios-hint').classList.add('hidden'));

// ---------------------------------------------------------------- service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ---------------------------------------------------------------- boot
function boot() {
  buildStickerCats();
  buildStickerGrid();
  buildFilters();
  buildBrushes();
  buildColors();
  updateGalleryCount();
  startCamera();
  detector.warmUp(); // preload face model in the background
  // one-time gentle iOS hint after a short delay
  if (isIos() && !isStandalone()) {
    setTimeout(() => showIosHintIfNeeded(), 4000);
  }
}
boot();

// Exposed for automated end-to-end verification. Harmless in production.
window.__mae = { editor, gallery, detector, camera, capture, placeSticker, show };
