// gen-icons.mjs — generates the PWA icons with zero dependencies.
// Draws a cute camera on a pink→purple gradient into an RGBA buffer at high
// resolution, downsamples for anti-aliasing, and encodes PNG via Node's zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(OUT, { recursive: true });

const SS = 4; // supersample factor for anti-aliasing

function lerp(a, b, t) { return a + (b - a) * t; }
function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Draw the icon into an RGBA buffer of size N x N (hi-res).
function draw(N, { maskable }) {
  const buf = new Uint8ClampedArray(N * N * 4); // transparent
  const c1 = hex('#ff5cc8');
  const c2 = hex('#a05cff');
  const radius = maskable ? 0 : N * 0.23;

  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const insideRR = (x, y, cx, cy, w, h, rr) => {
    const dx = Math.abs(x - cx) - (w / 2 - rr);
    const dy = Math.abs(y - cy) - (h / 2 - rr);
    const qx = Math.max(dx, 0), qy = Math.max(dy, 0);
    const d = Math.hypot(qx, qy) + Math.min(Math.max(dx, dy), 0) - rr;
    return d <= 0;
  };
  const circle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

  const cx = N / 2, cy = N / 2;

  // background gradient inside rounded square
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!insideRR(x, y, cx, cy, N, N, radius)) continue;
      const t = (x + y) / (2 * N);
      set(x, y, lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), 255);
    }
  }

  // sparkles
  const sparkles = [[0.2, 0.22, 0.03], [0.82, 0.18, 0.025], [0.16, 0.8, 0.022], [0.86, 0.78, 0.03]];
  for (const [fx, fy, fr] of sparkles) {
    const sx = fx * N, sy = fy * N, r = fr * N;
    for (let y = Math.floor(sy - r); y <= sy + r; y++)
      for (let x = Math.floor(sx - r); x <= sx + r; x++)
        if (circle(x, y, sx, sy, r)) set(x, y, 255, 255, 255, 235);
  }

  // camera body (white rounded rect)
  const bw = N * 0.64, bh = N * 0.46, by = cy + N * 0.05;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (insideRR(x, y, cx, by, bw, bh, N * 0.08)) set(x, y, 255, 255, 255, 255);

  // viewfinder bump
  const vw = N * 0.2, vh = N * 0.1, vx = cx - N * 0.16, vy = by - bh / 2 - vh * 0.35;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (insideRR(x, y, vx, vy, vw, vh, N * 0.03)) set(x, y, 255, 255, 255, 255);

  // lens outer ring (blue), inner dark, highlight
  const lr = N * 0.17;
  for (let y = Math.floor(by - lr); y <= by + lr; y++)
    for (let x = Math.floor(cx - lr); x <= cx + lr; x++) {
      if (circle(x, y, cx, by, lr)) {
        const [r, g, b] = hex('#3fa9ff');
        set(x, y, r, g, b, 255);
      }
    }
  const lr2 = lr * 0.62;
  for (let y = Math.floor(by - lr2); y <= by + lr2; y++)
    for (let x = Math.floor(cx - lr2); x <= cx + lr2; x++)
      if (circle(x, y, cx, by, lr2)) set(x, y, 42, 26, 58, 255);
  const lr3 = lr * 0.3;
  for (let y = Math.floor(by - lr3); y <= by + lr3; y++)
    for (let x = Math.floor(cx - lr3); x <= cx + lr3; x++)
      if (circle(x, y, cx - lr * 0.2, by - lr * 0.2, lr3)) set(x, y, 255, 255, 255, 235);

  // flash (yellow) top-right of body
  const fr = N * 0.045, fx = cx + N * 0.22, fy = by - bh * 0.28;
  for (let y = Math.floor(fy - fr); y <= fy + fr; y++)
    for (let x = Math.floor(fx - fr); x <= fx + fr; x++)
      if (circle(x, y, fx, fy, fr)) { const [r, g, b] = hex('#ffd23f'); set(x, y, r, g, b, 255); }

  return buf;
}

function downsample(hi, N, factor) {
  const n = N / factor;
  const out = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < factor; dy++)
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * N + (x * factor + dx)) * 4;
          const al = hi[i + 3];
          r += hi[i] * al; g += hi[i + 1] * al; b += hi[i + 2] * al; a += al;
        }
      const o = (y * n + x) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = a / (factor * factor);
    }
  }
  return out;
}

// --- minimal PNG encoder
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = rgba[y * w * 4 + x];
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function make(size, opts, name) {
  const N = size * SS;
  const hi = draw(N, opts);
  const small = downsample(hi, N, SS);
  writeFileSync(join(OUT, name), encodePNG(small, size, size));
  console.log('wrote', name);
}

make(192, { maskable: false }, 'icon-192.png');
make(512, { maskable: false }, 'icon-512.png');
make(512, { maskable: true }, 'icon-512-maskable.png');
make(180, { maskable: true }, 'icon-180.png');
make(32, { maskable: true }, 'favicon-32.png');
console.log('icons done');
