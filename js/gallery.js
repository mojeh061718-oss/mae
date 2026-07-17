// gallery.js
// Persists finished photos as blobs in IndexedDB so they survive reloads and
// work fully offline. Falls back to an in-memory store if IDB is unavailable.

const DB_NAME = 'mae-camera-studio';
const STORE = 'photos';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('no-indexeddb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Small counter that avoids Date.now/Math.random for stable ids.
let idSeed = 0;
function makeId() {
  idSeed += 1;
  return `photo-${performance.now().toString(36).replace('.', '')}-${idSeed}`;
}

export class Gallery {
  constructor() {
    this.memFallback = null; // Map when IDB unavailable
  }

  async _db() {
    if (this.memFallback) return null;
    try {
      return await openDB();
    } catch (_) {
      if (!this.memFallback) this.memFallback = new Map();
      return null;
    }
  }

  async save(blob) {
    const record = { id: makeId(), blob, createdOrder: ++idSeed };
    const db = await this._db();
    if (!db) {
      this.memFallback.set(record.id, record);
      return record.id;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(record.id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async all() {
    const db = await this._db();
    if (!db) {
      return [...this.memFallback.values()].sort((a, b) => b.createdOrder - a.createdOrder);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve((req.result || []).sort((a, b) => b.createdOrder - a.createdOrder));
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id) {
    const db = await this._db();
    if (!db) {
      this.memFallback.delete(id);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count() {
    const items = await this.all();
    return items.length;
  }
}
