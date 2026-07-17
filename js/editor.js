// editor.js
// The photo editor: base image + filter + paint layer + placed stickers.
// Handles auto face-placement, drawing brushes, and touch manipulation.

import { placeSticker } from './geometry.js';

// ------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function heartPath(ctx, w) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.72);
  ctx.bezierCurveTo(r * 1.15, -r * 0.05, r * 0.55, -r * 0.98, 0, -r * 0.3);
  ctx.bezierCurveTo(-r * 0.55, -r * 0.98, -r * 1.15, -r * 0.05, 0, r * 0.72);
  ctx.closePath();
}

function starPath(ctx, w, points = 5, innerRatio = 0.45) {
  const R = w / 2;
  const r = R * innerRatio;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
}

// ------------------------------------------------------------- renderers
// Every renderer draws CENTERED at the origin; `s` is the sticker width in px.
// The caller has already translated/rotated/mirrored the context.
export const RENDERERS = {
  emoji(ctx, s, p) {
    ctx.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.glyph, 0, 0);
  },

  heart(ctx, s) {
    ctx.fillStyle = '#ff2d6f';
    heartPath(ctx, s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(ctx, -s * 0.14, -s * 0.12, s * 0.09);
    ctx.fill();
  },

  star(ctx, s) {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = s * 0.05;
    starPath(ctx, s);
    ctx.fill();
    ctx.stroke();
  },

  googly(ctx, s) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = s * 0.04;
    circle(ctx, 0, 0, s * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    circle(ctx, s * 0.12, s * 0.12, s * 0.22);
    ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, s * 0.06, s * 0.05, s * 0.06);
    ctx.fill();
  },

  sunglasses(ctx, s) {
    const lens = s * 0.32;
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = s * 0.05;
    // bridge + arms
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -lens * 0.1);
    ctx.lineTo(s * 0.12, -lens * 0.1);
    ctx.moveTo(-s * 0.5, -lens * 0.2);
    ctx.lineTo(-s * 0.62, -lens * 0.4);
    ctx.moveTo(s * 0.5, -lens * 0.2);
    ctx.lineTo(s * 0.62, -lens * 0.4);
    ctx.stroke();
    for (const cx of [-s * 0.28, s * 0.28]) {
      ellipse(ctx, cx, 0, lens, lens * 0.8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ellipse(ctx, cx - lens * 0.3, -lens * 0.3, lens * 0.3, lens * 0.2, -0.5);
      ctx.fill();
      ctx.fillStyle = '#111';
    }
  },

  nerd(ctx, s) {
    const lens = s * 0.3;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = s * 0.06;
    ctx.fillStyle = 'rgba(180,220,255,0.25)';
    for (const cx of [-s * 0.28, s * 0.28]) {
      circle(ctx, cx, 0, lens);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, 0);
    ctx.lineTo(s * 0.02, 0);
    ctx.moveTo(-s * 0.58, -lens * 0.2);
    ctx.lineTo(-s * 0.66, -lens * 0.4);
    ctx.moveTo(s * 0.58, -lens * 0.2);
    ctx.lineTo(s * 0.66, -lens * 0.4);
    ctx.stroke();
  },

  glasses3d(ctx, s) {
    const lens = s * 0.3;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = s * 0.05;
    ctx.fillStyle = 'rgba(255,40,40,0.55)';
    roundedRect(ctx, -s * 0.5, -lens, s * 0.44, lens * 2, lens * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,200,255,0.55)';
    roundedRect(ctx, s * 0.06, -lens, s * 0.44, lens * 2, lens * 0.4);
    ctx.fill();
    ctx.stroke();
  },

  heartglasses(ctx, s) {
    ctx.strokeStyle = '#ff2d6f';
    ctx.lineWidth = s * 0.04;
    for (const cx of [-s * 0.28, s * 0.28]) {
      ctx.save();
      ctx.translate(cx, 0);
      ctx.fillStyle = 'rgba(255,45,111,0.35)';
      heartPath(ctx, s * 0.55);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, -s * 0.05);
    ctx.lineTo(s * 0.02, -s * 0.05);
    ctx.stroke();
  },

  laser(ctx, s) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createLinearGradient(0, 0, 0, s * 1.6);
    grad.addColorStop(0, 'rgba(255,60,60,0.95)');
    grad.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = grad;
    triangle(ctx, -s * 0.18, 0, s * 0.18, 0, 0, s * 1.6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, 0, 0, s * 0.12);
    ctx.fill();
    ctx.restore();
  },

  sleepy(ctx, s) {
    ctx.strokeStyle = '#5a3d2b';
    ctx.lineWidth = s * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#7cc4ff';
    ctx.font = `${s * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('z', s * 0.45, -s * 0.3);
  },

  dizzy(ctx, s) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    let r = s * 0.05;
    let a = 0;
    ctx.moveTo(0, 0);
    for (let i = 0; i < 40; i++) {
      a += 0.5;
      r += s * 0.012;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
  },

  tears(ctx, s) {
    ctx.fillStyle = 'rgba(90,180,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.bezierCurveTo(s * 0.35, s * 0.3, s * 0.3, s * 0.9, 0, s * 0.9);
    ctx.bezierCurveTo(-s * 0.3, s * 0.9, -s * 0.35, s * 0.3, 0, -s * 0.2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    circle(ctx, -s * 0.08, s * 0.35, s * 0.08);
    ctx.fill();
  },

  catears(ctx, s) {
    ctx.fillStyle = '#3a3a3a';
    for (const dir of [-1, 1]) {
      triangle(ctx, dir * s * 0.2, s * 0.1, dir * s * 0.42, -s * 0.5, dir * s * 0.5, s * 0.05);
      ctx.fill();
      ctx.fillStyle = '#ffb6c1';
      triangle(ctx, dir * s * 0.28, s * 0.02, dir * s * 0.4, -s * 0.32, dir * s * 0.44, s * 0.0);
      ctx.fill();
      ctx.fillStyle = '#3a3a3a';
    }
  },

  bunnyears(ctx, s) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e9e9e9';
    ctx.lineWidth = s * 0.02;
    for (const dir of [-1, 1]) {
      ellipse(ctx, dir * s * 0.18, -s * 0.25, s * 0.11, s * 0.5, dir * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffc0cb';
      ellipse(ctx, dir * s * 0.18, -s * 0.25, s * 0.05, s * 0.36, dir * 0.15);
      ctx.fill();
      ctx.fillStyle = '#fff';
    }
  },

  bearears(ctx, s) {
    ctx.fillStyle = '#8b5a2b';
    for (const dir of [-1, 1]) {
      circle(ctx, dir * s * 0.34, -s * 0.15, s * 0.2);
      ctx.fill();
      ctx.fillStyle = '#c98b4a';
      circle(ctx, dir * s * 0.34, -s * 0.15, s * 0.1);
      ctx.fill();
      ctx.fillStyle = '#8b5a2b';
    }
  },

  catnose(ctx, s) {
    ctx.fillStyle = '#ff9bb0';
    triangle(ctx, -s * 0.18, -s * 0.1, s * 0.18, -s * 0.1, 0, s * 0.12);
    ctx.fill();
    ctx.strokeStyle = '#5a3d2b';
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.12);
    ctx.lineTo(0, s * 0.28);
    ctx.moveTo(0, s * 0.28);
    ctx.quadraticCurveTo(s * 0.18, s * 0.34, s * 0.28, s * 0.2);
    ctx.moveTo(0, s * 0.28);
    ctx.quadraticCurveTo(-s * 0.18, s * 0.34, -s * 0.28, s * 0.2);
    ctx.stroke();
  },

  dognose(ctx, s) {
    ctx.fillStyle = '#2b2b2b';
    ellipse(ctx, 0, 0, s * 0.4, s * 0.3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    circle(ctx, -s * 0.12, -s * 0.08, s * 0.08);
    ctx.fill();
  },

  pignose(ctx, s) {
    ctx.fillStyle = '#ff9bb0';
    ctx.strokeStyle = '#e57a92';
    ctx.lineWidth = s * 0.03;
    ellipse(ctx, 0, 0, s * 0.45, s * 0.33);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c65f7a';
    ellipse(ctx, -s * 0.16, 0, s * 0.08, s * 0.14);
    ctx.fill();
    ellipse(ctx, s * 0.16, 0, s * 0.08, s * 0.14);
    ctx.fill();
  },

  whiskers(ctx, s) {
    ctx.fillStyle = '#222';
    circle(ctx, 0, -s * 0.05, s * 0.08);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      for (const dy of [-0.06, 0.02, 0.1]) {
        ctx.beginPath();
        ctx.moveTo(dir * s * 0.12, s * (dy + 0.02));
        ctx.lineTo(dir * s * 0.5, s * dy);
        ctx.stroke();
      }
    }
  },

  antlers(ctx, s) {
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = s * 0.04;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * s * 0.12, s * 0.1);
      ctx.lineTo(dir * s * 0.28, -s * 0.5);
      ctx.moveTo(dir * s * 0.2, -s * 0.15);
      ctx.lineTo(dir * s * 0.42, -s * 0.25);
      ctx.moveTo(dir * s * 0.24, -s * 0.32);
      ctx.lineTo(dir * s * 0.44, -s * 0.5);
      ctx.stroke();
    }
  },

  frogeyes(ctx, s) {
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#8bc34a';
      circle(ctx, dir * s * 0.22, 0, s * 0.24);
      ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, dir * s * 0.22, -s * 0.03, s * 0.16);
      ctx.fill();
      ctx.fillStyle = '#111';
      circle(ctx, dir * s * 0.22, 0, s * 0.07);
      ctx.fill();
    }
  },

  beak(ctx, s) {
    ctx.fillStyle = '#ffa726';
    triangle(ctx, -s * 0.4, -s * 0.1, s * 0.4, -s * 0.1, 0, s * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#e0851a';
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
  },

  clownnose(ctx, s) {
    ctx.fillStyle = '#ff2b2b';
    circle(ctx, 0, 0, s * 0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(ctx, -s * 0.16, -s * 0.16, s * 0.14);
    ctx.fill();
  },

  mustache(ctx, s) {
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.05);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.2, -s * 0.4, -s * 0.2, -s * 0.5, 0);
    ctx.bezierCurveTo(-s * 0.45, s * 0.12, -s * 0.2, s * 0.1, 0, s * 0.05);
    ctx.bezierCurveTo(s * 0.2, s * 0.1, s * 0.45, s * 0.12, s * 0.5, 0);
    ctx.bezierCurveTo(s * 0.4, -s * 0.2, s * 0.15, -s * 0.2, 0, -s * 0.05);
    ctx.fill();
  },

  beard(ctx, s) {
    ctx.fillStyle = '#5a3d2b';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.35);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.5, 0, s * 0.6);
    ctx.quadraticCurveTo(s * 0.5, s * 0.5, s * 0.5, -s * 0.35);
    ctx.quadraticCurveTo(s * 0.25, -s * 0.1, 0, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.25, -s * 0.1, -s * 0.5, -s * 0.35);
    ctx.fill();
  },

  bubblebeard(ctx, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = 'rgba(200,225,255,0.9)';
    ctx.lineWidth = s * 0.01;
    const spots = [
      [-0.35, 0, 0.16], [-0.15, 0.1, 0.2], [0.1, 0.1, 0.2], [0.34, 0, 0.16],
      [-0.25, 0.28, 0.16], [0, 0.32, 0.18], [0.24, 0.28, 0.16], [0, 0.05, 0.15],
    ];
    for (const [dx, dy, r] of spots) {
      circle(ctx, dx * s, dy * s, r * s);
      ctx.fill();
      ctx.stroke();
    }
  },

  eyebrows(ctx, s) {
    ctx.fillStyle = '#3a2a1a';
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * s * 0.28, 0);
      ctx.rotate(dir * -0.2);
      roundedRect(ctx, -s * 0.16, -s * 0.06, s * 0.32, s * 0.1, s * 0.05);
      ctx.fill();
      ctx.restore();
    }
  },

  monocle(ctx, s) {
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = s * 0.08;
    circle(ctx, 0, 0, s * 0.4);
    ctx.stroke();
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.quadraticCurveTo(s * 0.2, s * 0.7, s * 0.05, s * 0.9);
    ctx.stroke();
  },

  heromask(ctx, s) {
    ctx.fillStyle = '#7b2ff7';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.18);
    ctx.quadraticCurveTo(0, -s * 0.3, s * 0.5, -s * 0.18);
    ctx.quadraticCurveTo(s * 0.55, s * 0.1, s * 0.3, s * 0.18);
    ctx.quadraticCurveTo(0, s * 0.05, -s * 0.3, s * 0.18);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.1, -s * 0.5, -s * 0.18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const cx of [-s * 0.26, s * 0.26]) {
      ellipse(ctx, cx, -s * 0.02, s * 0.12, s * 0.08);
      ctx.fill();
    }
  },

  freckles(ctx, s) {
    ctx.fillStyle = 'rgba(150,90,50,0.7)';
    const spots = [
      [-0.4, 0.05], [-0.28, 0.14], [-0.18, 0.03], [0.18, 0.03],
      [0.28, 0.14], [0.4, 0.05], [-0.32, -0.05], [0.32, -0.05],
    ];
    for (const [dx, dy] of spots) {
      circle(ctx, dx * s, dy * s, s * 0.025);
      ctx.fill();
    }
  },

  fangs(ctx, s) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = s * 0.01;
    for (const dir of [-1, 1]) {
      triangle(ctx, dir * s * 0.18, -s * 0.1, dir * s * 0.3, -s * 0.1, dir * s * 0.24, s * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  },

  buckteeth(ctx, s) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = s * 0.02;
    roundedRect(ctx, -s * 0.22, -s * 0.15, s * 0.2, s * 0.4, s * 0.04);
    ctx.fill();
    ctx.stroke();
    roundedRect(ctx, s * 0.02, -s * 0.15, s * 0.2, s * 0.4, s * 0.04);
    ctx.fill();
    ctx.stroke();
  },

  tongue(ctx, s) {
    ctx.fillStyle = '#ff5c8a';
    roundedRect(ctx, -s * 0.28, -s * 0.1, s * 0.56, s * 0.6, s * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#e03e6e';
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.02);
    ctx.lineTo(0, s * 0.35);
    ctx.stroke();
  },

  goldsmile(ctx, s) {
    ctx.fillStyle = '#fff';
    roundedRect(ctx, -s * 0.4, -s * 0.15, s * 0.8, s * 0.35, s * 0.08);
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = s * 0.015;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.15, -s * 0.15);
      ctx.lineTo(i * s * 0.15, s * 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd23f';
    roundedRect(ctx, s * 0.05, -s * 0.15, s * 0.14, s * 0.35, s * 0.03);
    ctx.fill();
  },

  rainbowbarf(ctx, s) {
    const cols = ['#ff2d6f', '#ff9f1c', '#ffd23f', '#4cd964', '#3fa9ff', '#a05cff'];
    ctx.lineWidth = s * 0.12;
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.1, s * (0.4 + i * 0.12), s * 0.05, s * (0.9 + i * 0.1));
      ctx.stroke();
    });
  },

  bigsmile(ctx, s) {
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.55, s * 0.5, -s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.05, -s * 0.5, -s * 0.1);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, -s * 0.08);
    ctx.quadraticCurveTo(0, s * 0.05, s * 0.42, -s * 0.08);
    ctx.quadraticCurveTo(0, s * 0.12, -s * 0.42, -s * 0.08);
    ctx.fill();
  },

  blush(ctx, s) {
    ctx.fillStyle = 'rgba(255,120,150,0.5)';
    ellipse(ctx, 0, 0, s * 0.5, s * 0.32);
    ctx.fill();
  },

  rainbowcheeks(ctx, s) {
    const cols = ['#ff2d6f', '#ff9f1c', '#ffd23f', '#4cd964', '#3fa9ff', '#a05cff'];
    ctx.lineWidth = s * 0.12;
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(0, s * 0.3, s * (0.15 + i * 0.06), Math.PI, TAU);
      ctx.stroke();
    });
  },

  starcheeks(ctx, s) {
    RENDERERS.star(ctx, s);
  },

  heartcheeks(ctx, s) {
    ctx.fillStyle = '#ff5c8a';
    heartPath(ctx, s);
    ctx.fill();
  },

  sparklecheeks(ctx, s) {
    ctx.fillStyle = '#ffe27a';
    for (const [dx, dy, sc] of [[0, 0, 1], [-0.35, -0.2, 0.5], [0.35, 0.2, 0.5]]) {
      ctx.save();
      ctx.translate(dx * s, dy * s);
      starPath(ctx, s * sc, 4, 0.35);
      ctx.fill();
      ctx.restore();
    }
  },

  partyhat(ctx, s) {
    ctx.fillStyle = '#ff5c8a';
    triangle(ctx, 0, -s * 0.7, -s * 0.35, s * 0.3, s * 0.35, s * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 3; i++) {
      const y = -s * 0.5 + i * s * 0.32;
      const w = s * 0.12 + i * s * 0.09;
      roundedRect(ctx, -w / 2, y, w, s * 0.08, s * 0.03);
      ctx.fill();
    }
    ctx.fillStyle = '#4cd964';
    circle(ctx, 0, -s * 0.72, s * 0.1);
    ctx.fill();
  },

  tiara(ctx, s) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.1);
    ctx.lineTo(-s * 0.5, -s * 0.05);
    ctx.lineTo(-s * 0.25, -s * 0.15);
    ctx.lineTo(0, -s * 0.35);
    ctx.lineTo(s * 0.25, -s * 0.15);
    ctx.lineTo(s * 0.5, -s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff2d6f';
    circle(ctx, 0, -s * 0.05, s * 0.07);
    ctx.fill();
    ctx.fillStyle = '#3fa9ff';
    circle(ctx, -s * 0.28, s * 0.0, s * 0.04);
    ctx.fill();
    circle(ctx, s * 0.28, s * 0.0, s * 0.04);
    ctx.fill();
  },

  halo(ctx, s) {
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = s * 0.09;
    ctx.shadowColor = 'rgba(255,224,102,0.9)';
    ctx.shadowBlur = s * 0.2;
    ellipse(ctx, 0, 0, s * 0.45, s * 0.16);
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  devilhorns(ctx, s) {
    ctx.fillStyle = '#c0392b';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * s * 0.2, s * 0.1);
      ctx.quadraticCurveTo(dir * s * 0.5, s * 0.0, dir * s * 0.42, -s * 0.4);
      ctx.quadraticCurveTo(dir * s * 0.3, -s * 0.15, dir * s * 0.16, s * 0.08);
      ctx.fill();
    }
  },

  unicornhorn(ctx, s) {
    ctx.fillStyle = '#ffd700';
    triangle(ctx, 0, -s * 0.9, -s * 0.18, s * 0.2, s * 0.18, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = s * 0.03;
    for (let i = 0; i < 4; i++) {
      const y = s * 0.1 - i * s * 0.25;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15 + i * s * 0.03, y);
      ctx.lineTo(s * 0.15 - i * s * 0.03, y - s * 0.08);
      ctx.stroke();
    }
  },

  propeller(ctx, s) {
    ctx.fillStyle = '#e74c3c';
    roundedRect(ctx, -s * 0.35, -s * 0.06, s * 0.3, s * 0.12, s * 0.05);
    ctx.fill();
    ctx.fillStyle = '#3fa9ff';
    roundedRect(ctx, s * 0.05, -s * 0.06, s * 0.3, s * 0.12, s * 0.05);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    circle(ctx, 0, 0, s * 0.09);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.25);
    ctx.stroke();
  },

  flowercrown(ctx, s) {
    const cols = ['#ff5c8a', '#ffd23f', '#a05cff', '#4cd964', '#3fa9ff'];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = -s * 0.4 + (i / (n - 1)) * s * 0.8;
      const y = Math.sin((i / (n - 1)) * Math.PI) * -s * 0.12;
      ctx.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        circle(ctx, x + Math.cos(a) * s * 0.06, y + Math.sin(a) * s * 0.06, s * 0.05);
        ctx.fill();
      }
      ctx.fillStyle = '#fff59d';
      circle(ctx, x, y, s * 0.04);
      ctx.fill();
    }
  },

  wizardhat(ctx, s) {
    ctx.fillStyle = '#4b3f9e';
    triangle(ctx, 0, -s * 0.9, -s * 0.32, s * 0.25, s * 0.32, s * 0.25);
    ctx.fill();
    ctx.fillStyle = '#3a3080';
    roundedRect(ctx, -s * 0.5, s * 0.2, s, s * 0.14, s * 0.06);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (const [dx, dy, sc] of [[0, -s * 0.35, 0.14], [-0.1 * s, 0, 0.1], [0.12 * s, -0.15 * s, 0.1]]) {
      ctx.save();
      ctx.translate(dx, dy);
      starPath(ctx, sc * 2, 5, 0.45);
      ctx.fill();
      ctx.restore();
    }
  },
};

// Draw one placed sticker onto ctx.
export function drawPlaced(ctx, placed) {
  const renderer = RENDERERS[placed.draw] || RENDERERS.emoji;
  ctx.save();
  ctx.translate(placed.x, placed.y);
  ctx.rotate(placed.rotation || 0);
  if (placed.mirror) ctx.scale(-1, 1);
  renderer(ctx, placed.size, placed);
  ctx.restore();
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

// --------------------------------------------------------------------- Editor
const MAX_DIM = 1600; // cap working resolution for smooth touch + memory

export class Editor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.base = document.createElement('canvas'); // filtered/original photo
    this.baseCtx = this.base.getContext('2d');
    this.paint = document.createElement('canvas'); // drawing layer
    this.paintCtx = this.paint.getContext('2d');

    this.faces = [];
    this.placed = [];
    this.filter = 'none';
    this.selected = null;

    this.tool = 'sticker'; // 'sticker' | 'draw'
    this.brush = 'crayon';
    this.color = '#ff2d6f';
    this.brushSize = 14;

    this.history = [];
    this.future = [];
    this._rainbowHue = 0;
    this._stroke = null;

    this.onSelectionChange = null;
    this._bindPointer();
  }

  // Load a captured photo (canvas or image), optionally mirrored (front cam).
  setPhoto(source, mirror = false) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    let w = sw, h = sh;
    const scale = Math.min(1, MAX_DIM / Math.max(sw, sh));
    w = Math.round(sw * scale);
    h = Math.round(sh * scale);

    for (const c of [this.canvas, this.base, this.paint]) {
      c.width = w;
      c.height = h;
    }

    this.baseCtx.save();
    if (mirror) {
      this.baseCtx.translate(w, 0);
      this.baseCtx.scale(-1, 1);
    }
    this.baseCtx.drawImage(source, 0, 0, w, h);
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

  // Auto-place a face-tracked sticker onto every detected face.
  // Returns number of copies placed (0 if no faces).
  addFaceSticker(sticker) {
    if (!this.faces.length) return 0;
    this._pushHistory();
    let count = 0;
    for (const face of this.faces) {
      const targets = this._anchorTargets(sticker);
      for (const anchorName of targets) {
        const p = placeSticker(face, { ...sticker, anchor: anchorName });
        this.placed.push(this._makePlaced(sticker, p));
        count++;
      }
    }
    this.render();
    return count;
  }

  _anchorTargets(sticker) {
    if (sticker.anchor === 'eyes' && sticker.perEye) return ['leftEye', 'rightEye'];
    if (sticker.anchor === 'cheeks') return ['leftCheek', 'rightCheek'];
    return [sticker.anchor];
  }

  // Drop a sticker in the middle of the photo (free / draggable).
  addFreeSticker(sticker) {
    this._pushHistory();
    const size = Math.min(this.width, this.height) * (sticker.scale || 0.25);
    const placed = this._makePlaced(sticker, {
      x: this.width / 2,
      y: this.height / 2,
      size,
      rotation: 0,
    });
    this.placed.push(placed);
    this.selected = placed;
    this.tool = 'sticker';
    this._emitSelection();
    this.render();
    return placed;
  }

  _makePlaced(sticker, p) {
    return {
      uid: `p${this._uid = (this._uid || 0) + 1}`,
      draw: sticker.draw,
      glyph: sticker.glyph,
      x: p.x,
      y: p.y,
      size: p.size,
      rotation: p.rotation || 0,
      mirror: false,
    };
  }

  // -------------------------------------------------------------- filters
  setFilter(id) {
    this.filter = id;
    this.render();
  }

  // -------------------------------------------------------------- drawing
  setTool(tool) {
    this.tool = tool;
    if (tool === 'draw') {
      this.selected = null;
      this._emitSelection();
    }
    this.render();
  }

  setBrush(b) { this.brush = b; }
  setColor(c) { this.color = c; }
  setBrushSize(px) { this.brushSize = px; }

  // -------------------------------------------------------------- selection ops
  scaleSelected(factor) {
    if (!this.selected) return;
    this._pushHistory();
    this.selected.size = Math.max(12, this.selected.size * factor);
    this.render();
  }

  rotateSelected(rad) {
    if (!this.selected) return;
    this._pushHistory();
    this.selected.rotation += rad;
    this.render();
  }

  flipSelected() {
    if (!this.selected) return;
    this._pushHistory();
    this.selected.mirror = !this.selected.mirror;
    this.render();
  }

  deleteSelected() {
    if (!this.selected) return;
    this._pushHistory();
    this.placed = this.placed.filter((p) => p !== this.selected);
    this.selected = null;
    this._emitSelection();
    this.render();
  }

  bringSelectedToFront() {
    if (!this.selected) return;
    this.placed = this.placed.filter((p) => p !== this.selected);
    this.placed.push(this.selected);
    this.render();
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

  undo() {
    if (this.history.length <= 1) return;
    this.future.push(this.history.pop());
    this._restore(this.history[this.history.length - 1]);
  }

  redo() {
    if (!this.future.length) return;
    const snap = this.future.pop();
    this.history.push(snap);
    this._restore(snap);
  }

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

    // paint layer
    ctx.drawImage(this.paint, 0, 0);

    // stickers
    for (const p of this.placed) drawPlaced(ctx, p);

    // selection outline
    if (this.selected) this._drawSelection(this.selected);
  }

  _drawSelection(p) {
    const { ctx } = this;
    const r = p.size * 0.62;
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
    const tctx = tmp.getContext('2d');
    tctx.drawImage(this.base, 0, 0, tw, th);
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
    const onDown = (e) => this._pointerDown(e);
    const onMove = (e) => this._pointerMove(e);
    const onUp = (e) => this._pointerUp(e);
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onUp);
    c.addEventListener('pointerleave', onUp);
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
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      if (Math.hypot(dx, dy) <= p.size * 0.6) return p;
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

    // sticker tool
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

  _pointerUp(e) {
    if (this._stroke) {
      this._stroke = null;
    }
    if (this._drag && !this._drag.moved) {
      // A tap that didn't move: drop the redundant history entry.
      this.history.pop();
    }
    this._drag = null;
  }

  _paintDab(from, to) {
    const ctx = this.paintCtx;
    const size = this.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.brush === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.brush === 'glitter') {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const x = from.x + (to.x - from.x) * t + (this._pseudo(i) - 0.5) * size * 3;
        const y = from.y + (to.y - from.y) * t + (this._pseudo(i + 7) - 0.5) * size * 3;
        ctx.fillStyle = `hsl(${(this._rainbowHue + i * 40) % 360},95%,65%)`;
        circle(ctx, x, y, size * (0.25 + this._pseudo(i + 3) * 0.4));
        ctx.fill();
      }
      return;
    }

    ctx.save();
    if (this.brush === 'neon') {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = size * 1.5;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = size * 0.8;
    } else if (this.brush === 'rainbow') {
      this._rainbowHue = (this._rainbowHue + 6) % 360;
      ctx.strokeStyle = `hsl(${this._rainbowHue},90%,55%)`;
      ctx.lineWidth = size;
    } else if (this.brush === 'marker') {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = size * 1.6;
    } else {
      // crayon
      ctx.strokeStyle = this.color;
      ctx.lineWidth = size;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  // Deterministic pseudo-random in [0,1) so we avoid Math.random churn.
  _pseudo(n) {
    const x = Math.sin(n * 12.9898 + this._rainbowHue * 0.017) * 43758.5453;
    return x - Math.floor(x);
  }

  _emitSelection() {
    this.onSelectionChange?.(this.selected);
  }

  // -------------------------------------------------------------- export
  toBlob(type = 'image/png', quality = 0.92) {
    // Render a clean frame without the selection outline.
    const sel = this.selected;
    this.selected = null;
    this.render();
    this.selected = sel;
    return new Promise((resolve) => this.canvas.toBlob(resolve, type, quality));
  }

  toDataURL(type = 'image/png') {
    const sel = this.selected;
    this.selected = null;
    this.render();
    this.selected = sel;
    const url = this.canvas.toDataURL(type);
    this.render();
    return url;
  }
}
