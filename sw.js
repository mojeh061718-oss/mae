// sw.js — offline support for Mae's Camera Studio.
// Precaches the app shell and runtime-caches the MediaPipe model/wasm so face
// detection keeps working offline after the first successful load.

const VERSION = 'v1.0.0';
const SHELL_CACHE = `mae-shell-${VERSION}`;
const CDN_CACHE = `mae-cdn-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/camera.js',
  './js/faces.js',
  './js/editor.js',
  './js/stickers.js',
  './js/geometry.js',
  './js/gallery.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Don't let one missing file abort the whole install.
      Promise.allSettled(SHELL.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== CDN_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isCdn(url) {
  return (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('storage.googleapis.com') ||
    url.hostname.includes('mediapipe')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // MediaPipe wasm + model: cache-first, then network, store for offline.
  if (isCdn(url)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Same-origin app shell: cache-first with background refresh.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
