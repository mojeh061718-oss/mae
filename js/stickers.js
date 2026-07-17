// stickers.js
// The sticker catalog. Each sticker points at an original hand-crafted HD SVG
// in assets/stickers/. Pure data so it can be unit-tested in Node.
//
//   id        : unique string (also the svg filename: assets/stickers/<id>.svg)
//   name      : kid-friendly label
//   category  : grouping key (see CATEGORIES)
//   asset     : path to the HD vector artwork
//   faceTracked: if true, auto-snaps onto detected faces using `anchor`
//   anchor    : face anchor to attach to (see geometry.js)
//   scale     : sticker WIDTH as a fraction of the face width (or, for free
//               stickers, of the smaller canvas dimension)
//   offsetY   : shift along the head down-axis, fraction of face height
//   perEye    : render one copy on each eye
//   rotates   : follow head tilt (default true for faceTracked)

const A = (id) => `assets/stickers/${id}.svg`;

export const CATEGORIES = [
  { id: 'hats', name: 'Hats', thumb: A('crown') },
  { id: 'eyes', name: 'Eyes', thumb: A('hearteyes') },
  { id: 'animal', name: 'Animals', thumb: A('catears') },
  { id: 'face', name: 'Face', thumb: A('clownnose') },
  { id: 'mouth', name: 'Mouths', thumb: A('kisslips') },
  { id: 'cheeks', name: 'Cheeks', thumb: A('blush') },
  { id: 'fun', name: 'Stickers', thumb: A('rainbow') },
];

function s(id, name, category, opts = {}) {
  return {
    id, name, category, asset: A(id),
    faceTracked: opts.faceTracked ?? false,
    anchor: opts.anchor,
    scale: opts.scale ?? 0.3,
    offsetY: opts.offsetY ?? 0,
    perEye: opts.perEye ?? false,
    rotates: opts.rotates ?? true,
    wide: opts.wide ?? false,
  };
}

export const STICKERS = [
  // ------------------------------------------------------------- HATS
  s('crown', 'Gold Crown', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.95, offsetY: -0.55 }),
  s('tiara', 'Princess Tiara', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.9, offsetY: -0.42 }),
  s('partyhat', 'Party Hat', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.8, offsetY: -0.62 }),
  s('tophat', 'Top Hat', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.95, offsetY: -0.6 }),
  s('wizardhat', 'Wizard Hat', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.9, offsetY: -0.68 }),
  s('flowercrown', 'Flower Crown', 'hats', { faceTracked: true, anchor: 'crown', scale: 1.15, offsetY: -0.42 }),
  s('halo', 'Angel Halo', 'hats', { faceTracked: true, anchor: 'crown', scale: 0.95, offsetY: -0.72 }),
  s('devilhorns', 'Little Devil', 'hats', { faceTracked: true, anchor: 'crown', scale: 1.15, offsetY: -0.5 }),
  s('cowboyhat', 'Cowboy Hat', 'hats', { faceTracked: true, anchor: 'crown', scale: 1.2, offsetY: -0.48 }),
  s('gradcap', 'Graduation', 'hats', { faceTracked: true, anchor: 'crown', scale: 1.05, offsetY: -0.5 }),

  // ------------------------------------------------------------- EYES
  s('hearteyes', 'Heart Eyes', 'eyes', { faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.34 }),
  s('stareyes', 'Star Eyes', 'eyes', { faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.34 }),
  s('sunglasses', 'Aviators', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('roundsunnies', 'Retro Shades', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('heartglasses', 'Heart Glasses', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('nerd', 'Nerd Specs', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('glasses3d', '3D Glasses', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('starglasses', 'Star Glasses', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.15, wide: true }),
  s('coolshades', 'Cool Shades', 'eyes', { faceTracked: true, anchor: 'eyes', scale: 1.1, wide: true }),
  s('lasereyes', 'Laser Eyes', 'eyes', { faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.3, rotates: false }),
  s('googly', 'Googly Eyes', 'eyes', { faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.36 }),
  s('sparkleeyes', 'Sparkle Eyes', 'eyes', { faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.34 }),

  // ------------------------------------------------------------- ANIMALS
  s('catears', 'Cat Ears', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.2, offsetY: -0.5 }),
  s('bunnyears', 'Bunny Ears', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.05, offsetY: -0.68 }),
  s('bearears', 'Bear Ears', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.25, offsetY: -0.45 }),
  s('puppyears', 'Puppy Ears', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.5, offsetY: -0.32 }),
  s('antlers', 'Reindeer', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.5, offsetY: -0.55 }),
  s('unicorn', 'Unicorn', 'animal', { faceTracked: true, anchor: 'crown', scale: 1.1, offsetY: -0.58 }),
  s('dognose', 'Puppy Nose', 'animal', { faceTracked: true, anchor: 'nose', scale: 0.5 }),
  s('catnose', 'Kitty Nose', 'animal', { faceTracked: true, anchor: 'nose', scale: 1.3 }),
  s('pignose', 'Piggy Nose', 'animal', { faceTracked: true, anchor: 'nose', scale: 0.45 }),

  // ------------------------------------------------------------- FACE
  s('heromask', 'Hero Mask', 'face', { faceTracked: true, anchor: 'eyes', scale: 1.2, wide: true }),
  s('clownnose', 'Clown Nose', 'face', { faceTracked: true, anchor: 'nose', scale: 0.32 }),
  s('mustache', 'Mustache', 'face', { faceTracked: true, anchor: 'mouth', scale: 0.75, offsetY: -0.06, wide: true }),
  s('freckles', 'Freckles', 'face', { faceTracked: true, anchor: 'nose', scale: 1.3, wide: true }),
  s('rudolph', 'Red Nose', 'face', { faceTracked: true, anchor: 'nose', scale: 0.34 }),

  // ------------------------------------------------------------- MOUTH
  s('kisslips', 'Kiss Lips', 'mouth', { faceTracked: true, anchor: 'mouth', scale: 0.5, wide: true }),
  s('fangs', 'Vampire Fangs', 'mouth', { faceTracked: true, anchor: 'mouth', scale: 0.45, offsetY: 0.05 }),
  s('tongue', 'Silly Tongue', 'mouth', { faceTracked: true, anchor: 'mouth', scale: 0.45, offsetY: 0.08 }),
  s('grillz', 'Gold Grill', 'mouth', { faceTracked: true, anchor: 'mouth', scale: 0.55, offsetY: 0.03, wide: true }),

  // ------------------------------------------------------------- CHEEKS
  s('blush', 'Blush', 'cheeks', { faceTracked: true, anchor: 'cheeks', scale: 0.34 }),
  s('rainbowcheeks', 'Rainbow Cheeks', 'cheeks', { faceTracked: true, anchor: 'cheeks', scale: 0.32 }),
  s('starcheeks', 'Star Cheeks', 'cheeks', { faceTracked: true, anchor: 'cheeks', scale: 0.3 }),
  s('sparklecheeks', 'Sparkle Cheeks', 'cheeks', { faceTracked: true, anchor: 'cheeks', scale: 0.32 }),

  // ------------------------------------------------------------- FUN (free drag)
  s('rainbow', 'Rainbow', 'fun', { scale: 0.34, wide: true }),
  s('heart', 'Heart', 'fun', { scale: 0.24 }),
  s('star', 'Gold Star', 'fun', { scale: 0.24 }),
  s('sparkles', 'Sparkles', 'fun', { scale: 0.26 }),
  s('fire', 'Fire', 'fun', { scale: 0.22 }),
  s('lightning', 'Lightning', 'fun', { scale: 0.22 }),
  s('butterfly', 'Butterfly', 'fun', { scale: 0.28, wide: true }),
  s('flower', 'Flower', 'fun', { scale: 0.24 }),
  s('balloon', 'Balloon', 'fun', { scale: 0.26 }),
  s('icecream', 'Ice Cream', 'fun', { scale: 0.24 }),
  s('cupcake', 'Cupcake', 'fun', { scale: 0.24 }),
  s('gem', 'Diamond', 'fun', { scale: 0.24 }),
];

export function stickerById(id) {
  return STICKERS.find((x) => x.id === id) || null;
}

export function stickersByCategory(categoryId) {
  return STICKERS.filter((x) => x.category === categoryId);
}
