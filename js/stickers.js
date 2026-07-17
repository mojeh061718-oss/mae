// stickers.js
// The full sticker catalog. Pure data so it can be unit-tested in Node.
//
// Each sticker:
//   id        : unique string
//   name      : kid-friendly label shown in the tray
//   icon      : emoji shown on the tray button
//   category  : grouping key (see CATEGORIES)
//   faceTracked: if true, auto-snaps onto a detected face using `anchor`
//   anchor    : which face anchor to attach to (see geometry.js anchors)
//   scale     : size relative to face width (faceTracked) or canvas (free)
//   offsetY   : shift along the head down-axis, fraction of face height
//   rotates   : follow head tilt (default true for faceTracked)
//   perEye    : render one copy on each eye (heart eyes, glasses lenses...)
//   draw      : renderer key. 'emoji' draws `glyph`; anything else is a
//               custom vector renderer handled in editor.js
//   glyph     : the emoji/character drawn when draw === 'emoji'

export const CATEGORIES = [
  { id: 'hats', name: 'Hats', icon: '👑' },
  { id: 'eyes', name: 'Eyes', icon: '❤️' },
  { id: 'animal', name: 'Animals', icon: '🐱' },
  { id: 'face', name: 'Face Fun', icon: '👃' },
  { id: 'mouth', name: 'Mouths', icon: '💋' },
  { id: 'cheeks', name: 'Cheeks', icon: '😊' },
  { id: 'fun', name: 'Stickers', icon: '⭐' },
];

export const STICKERS = [
  // ---------------------------------------------------------------- HATS
  { id: 'crown', name: 'Crown', icon: '👑', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.9, offsetY: -0.55, draw: 'emoji', glyph: '👑' },
  { id: 'tophat', name: 'Top Hat', icon: '🎩', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.95, offsetY: -0.6, draw: 'emoji', glyph: '🎩' },
  { id: 'gradcap', name: 'Grad Cap', icon: '🎓', category: 'hats', faceTracked: true, anchor: 'crown', scale: 1.0, offsetY: -0.5, draw: 'emoji', glyph: '🎓' },
  { id: 'sunhat', name: 'Sun Hat', icon: '👒', category: 'hats', faceTracked: true, anchor: 'crown', scale: 1.05, offsetY: -0.5, draw: 'emoji', glyph: '👒' },
  { id: 'cap', name: 'Ball Cap', icon: '🧢', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.95, offsetY: -0.5, draw: 'emoji', glyph: '🧢' },
  { id: 'helmet', name: 'Helmet', icon: '⛑️', category: 'hats', faceTracked: true, anchor: 'crown', scale: 1.0, offsetY: -0.45, draw: 'emoji', glyph: '⛑️' },
  { id: 'partyhat', name: 'Party Hat', icon: '🥳', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.8, offsetY: -0.65, draw: 'partyhat' },
  { id: 'tiara', name: 'Tiara', icon: '👸', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.85, offsetY: -0.4, draw: 'tiara' },
  { id: 'halo', name: 'Halo', icon: '😇', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.9, offsetY: -0.7, draw: 'halo' },
  { id: 'devilhorns', name: 'Lil Devil', icon: '😈', category: 'hats', faceTracked: true, anchor: 'crown', scale: 1.1, offsetY: -0.5, draw: 'devilhorns' },
  { id: 'unicornhorn', name: 'Unicorn', icon: '🦄', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.5, offsetY: -0.6, draw: 'unicornhorn' },
  { id: 'propeller', name: 'Propeller', icon: '🚁', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.7, offsetY: -0.55, draw: 'propeller' },
  { id: 'flowercrown', name: 'Flower Crown', icon: '🌸', category: 'hats', faceTracked: true, anchor: 'crown', scale: 1.15, offsetY: -0.4, draw: 'flowercrown' },
  { id: 'wizardhat', name: 'Wizard', icon: '🧙', category: 'hats', faceTracked: true, anchor: 'crown', scale: 0.85, offsetY: -0.7, draw: 'wizardhat' },

  // ---------------------------------------------------------------- EYES
  { id: 'hearteyes', name: 'Heart Eyes', icon: '😍', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.32, draw: 'heart' },
  { id: 'stareyes', name: 'Star Eyes', icon: '🤩', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.32, draw: 'star' },
  { id: 'googly', name: 'Googly Eyes', icon: '👀', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.34, draw: 'googly' },
  { id: 'sunglasses', name: 'Sunglasses', icon: '😎', category: 'eyes', faceTracked: true, anchor: 'eyes', scale: 1.05, draw: 'sunglasses' },
  { id: 'nerd', name: 'Nerd Specs', icon: '🤓', category: 'eyes', faceTracked: true, anchor: 'eyes', scale: 1.05, draw: 'nerd' },
  { id: '3dglasses', name: '3D Glasses', icon: '🕶️', category: 'eyes', faceTracked: true, anchor: 'eyes', scale: 1.05, draw: 'glasses3d' },
  { id: 'heartglasses', name: 'Heart Specs', icon: '💗', category: 'eyes', faceTracked: true, anchor: 'eyes', scale: 1.05, draw: 'heartglasses' },
  { id: 'lasereyes', name: 'Laser Eyes', icon: '⚡', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.3, draw: 'laser' },
  { id: 'sleepy', name: 'Sleepy', icon: '😴', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.3, draw: 'sleepy' },
  { id: 'dizzy', name: 'Dizzy', icon: '😵', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.32, draw: 'dizzy' },
  { id: 'dollareyes', name: 'Money Eyes', icon: '🤑', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.3, draw: 'emoji', glyph: '💲' },
  { id: 'cryeyes', name: 'Big Tears', icon: '😭', category: 'eyes', faceTracked: true, anchor: 'eyes', perEye: true, scale: 0.28, draw: 'tears' },

  // ---------------------------------------------------------------- ANIMALS
  { id: 'catears', name: 'Cat Ears', icon: '🐱', category: 'animal', faceTracked: true, anchor: 'crown', scale: 1.1, offsetY: -0.45, draw: 'catears' },
  { id: 'bunnyears', name: 'Bunny Ears', icon: '🐰', category: 'animal', faceTracked: true, anchor: 'crown', scale: 1.0, offsetY: -0.65, draw: 'bunnyears' },
  { id: 'bearears', name: 'Bear Ears', icon: '🐻', category: 'animal', faceTracked: true, anchor: 'crown', scale: 1.15, offsetY: -0.4, draw: 'bearears' },
  { id: 'catnose', name: 'Cat Nose', icon: '🐈', category: 'animal', faceTracked: true, anchor: 'nose', scale: 0.4, draw: 'catnose' },
  { id: 'dognose', name: 'Puppy Nose', icon: '🐶', category: 'animal', faceTracked: true, anchor: 'nose', scale: 0.45, draw: 'dognose' },
  { id: 'pignose', name: 'Piggy Nose', icon: '🐷', category: 'animal', faceTracked: true, anchor: 'nose', scale: 0.4, draw: 'pignose' },
  { id: 'whiskers', name: 'Whiskers', icon: '🐭', category: 'animal', faceTracked: true, anchor: 'nose', scale: 1.4, draw: 'whiskers' },
  { id: 'deerantlers', name: 'Antlers', icon: '🦌', category: 'animal', faceTracked: true, anchor: 'crown', scale: 1.4, offsetY: -0.55, draw: 'antlers' },
  { id: 'frog', name: 'Frog Eyes', icon: '🐸', category: 'animal', faceTracked: true, anchor: 'crown', scale: 1.1, offsetY: -0.2, draw: 'frogeyes' },
  { id: 'birdbeak', name: 'Bird Beak', icon: '🐦', category: 'animal', faceTracked: true, anchor: 'nose', scale: 0.5, offsetY: 0.05, draw: 'beak' },

  // ---------------------------------------------------------------- FACE FUN
  { id: 'clownnose', name: 'Clown Nose', icon: '🤡', category: 'face', faceTracked: true, anchor: 'nose', scale: 0.28, draw: 'clownnose' },
  { id: 'mustache', name: 'Mustache', icon: '👨', category: 'face', faceTracked: true, anchor: 'mouth', scale: 0.7, offsetY: -0.06, draw: 'mustache' },
  { id: 'beard', name: 'Beard', icon: '🧔', category: 'face', faceTracked: true, anchor: 'chin', scale: 0.9, offsetY: -0.05, draw: 'beard' },
  { id: 'bubblebeard', name: 'Bubble Beard', icon: '🫧', category: 'face', faceTracked: true, anchor: 'chin', scale: 1.0, offsetY: -0.02, draw: 'bubblebeard' },
  { id: 'eyebrows', name: 'Big Brows', icon: '🤨', category: 'face', faceTracked: true, anchor: 'eyes', scale: 1.0, offsetY: -0.12, draw: 'eyebrows' },
  { id: 'monocle', name: 'Monocle', icon: '🧐', category: 'face', faceTracked: true, anchor: 'rightEye', scale: 0.4, draw: 'monocle' },
  { id: 'facepaint', name: 'Hero Mask', icon: '🦸', category: 'face', faceTracked: true, anchor: 'eyes', scale: 1.15, draw: 'heromask' },
  { id: 'freckles', name: 'Freckles', icon: '🟤', category: 'face', faceTracked: true, anchor: 'nose', scale: 1.2, draw: 'freckles' },

  // ---------------------------------------------------------------- MOUTHS
  { id: 'kisslips', name: 'Kiss Lips', icon: '💋', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.5, draw: 'emoji', glyph: '💋' },
  { id: 'fangs', name: 'Vampire', icon: '🧛', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.5, offsetY: 0.04, draw: 'fangs' },
  { id: 'buckteeth', name: 'Buck Teeth', icon: '😬', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.4, offsetY: 0.05, draw: 'buckteeth' },
  { id: 'tongue', name: 'Silly Tongue', icon: '😛', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.45, offsetY: 0.08, draw: 'tongue' },
  { id: 'goldtooth', name: 'Gold Smile', icon: '😁', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.6, offsetY: 0.02, draw: 'goldsmile' },
  { id: 'rainbowmouth', name: 'Rainbow Barf', icon: '🌈', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.7, offsetY: 0.25, draw: 'rainbowbarf' },
  { id: 'bigsmile', name: 'Big Smile', icon: '😄', category: 'mouth', faceTracked: true, anchor: 'mouth', scale: 0.6, draw: 'bigsmile' },

  // ---------------------------------------------------------------- CHEEKS
  { id: 'blush', name: 'Blush', icon: '😊', category: 'cheeks', faceTracked: true, anchor: 'cheeks', scale: 0.3, draw: 'blush' },
  { id: 'rainbowcheeks', name: 'Rainbow Cheeks', icon: '🌈', category: 'cheeks', faceTracked: true, anchor: 'cheeks', scale: 0.32, draw: 'rainbowcheeks' },
  { id: 'starcheeks', name: 'Star Cheeks', icon: '⭐', category: 'cheeks', faceTracked: true, anchor: 'cheeks', scale: 0.28, draw: 'starcheeks' },
  { id: 'heartcheeks', name: 'Heart Cheeks', icon: '💕', category: 'cheeks', faceTracked: true, anchor: 'cheeks', scale: 0.28, draw: 'heartcheeks' },
  { id: 'sparklecheeks', name: 'Sparkle Cheeks', icon: '✨', category: 'cheeks', faceTracked: true, anchor: 'cheeks', scale: 0.3, draw: 'sparklecheeks' },

  // ---------------------------------------------------------------- FUN / FREE STICKERS (draggable)
  { id: 'f_rainbow', name: 'Rainbow', icon: '🌈', category: 'fun', faceTracked: false, scale: 0.28, draw: 'emoji', glyph: '🌈' },
  { id: 'f_heart', name: 'Heart', icon: '❤️', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '❤️' },
  { id: 'f_star', name: 'Star', icon: '⭐', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '⭐' },
  { id: 'f_sparkles', name: 'Sparkles', icon: '✨', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '✨' },
  { id: 'f_unicorn', name: 'Unicorn', icon: '🦄', category: 'fun', faceTracked: false, scale: 0.26, draw: 'emoji', glyph: '🦄' },
  { id: 'f_butterfly', name: 'Butterfly', icon: '🦋', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🦋' },
  { id: 'f_flower', name: 'Flower', icon: '🌸', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '🌸' },
  { id: 'f_sun', name: 'Sunshine', icon: '☀️', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '☀️' },
  { id: 'f_cloud', name: 'Cloud', icon: '☁️', category: 'fun', faceTracked: false, scale: 0.26, draw: 'emoji', glyph: '☁️' },
  { id: 'f_balloon', name: 'Balloon', icon: '🎈', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🎈' },
  { id: 'f_cupcake', name: 'Cupcake', icon: '🧁', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🧁' },
  { id: 'f_icecream', name: 'Ice Cream', icon: '🍦', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🍦' },
  { id: 'f_pizza', name: 'Pizza', icon: '🍕', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🍕' },
  { id: 'f_donut', name: 'Donut', icon: '🍩', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🍩' },
  { id: 'f_cat', name: 'Kitty', icon: '🐱', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🐱' },
  { id: 'f_dog', name: 'Puppy', icon: '🐶', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🐶' },
  { id: 'f_fire', name: 'Fire', icon: '🔥', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '🔥' },
  { id: 'f_lightning', name: 'Zap', icon: '⚡', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '⚡' },
  { id: 'f_moon', name: 'Moon', icon: '🌙', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🌙' },
  { id: 'f_dino', name: 'Dino', icon: '🦕', category: 'fun', faceTracked: false, scale: 0.26, draw: 'emoji', glyph: '🦕' },
  { id: 'f_rocket', name: 'Rocket', icon: '🚀', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🚀' },
  { id: 'f_crown', name: 'Gold Crown', icon: '👑', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '👑' },
  { id: 'f_kiss', name: 'Kiss', icon: '💋', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '💋' },
  { id: 'f_bow', name: 'Bow', icon: '🎀', category: 'fun', faceTracked: false, scale: 0.22, draw: 'emoji', glyph: '🎀' },
  { id: 'f_gift', name: 'Present', icon: '🎁', category: 'fun', faceTracked: false, scale: 0.24, draw: 'emoji', glyph: '🎁' },
  { id: 'f_music', name: 'Music', icon: '🎵', category: 'fun', faceTracked: false, scale: 0.2, draw: 'emoji', glyph: '🎵' },
];

// Convenience lookups
export function stickerById(id) {
  return STICKERS.find((s) => s.id === id) || null;
}

export function stickersByCategory(categoryId) {
  return STICKERS.filter((s) => s.category === categoryId);
}
