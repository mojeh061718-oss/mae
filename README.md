# ✨ Mae's Camera Studio

A magical, feature-packed **camera studio PWA** built for a four-year-old — take
photos, and with one tap drop a hat on someone's head or give them heart eyes.
Faces are detected automatically, stickers snap into place, and everything works
on an iPad like a real installed app.

> Designed for little hands: giant buttons, chunky controls, playful colors, and
> nothing that can accidentally break.

## 🎉 What it does

- **📸 Real camera** with a big, friendly shutter and a one-tap **front ⇄ rear
  camera flip** (with selfie mirroring, tuned for iPad Safari quirks).
- **⏱️ 10-second self-timer** with a big animated **countdown ring** (and gentle
  beeps) so she can set up the shot and jump in.
- **🙂 Automatic face detection** (Google MediaPipe Face Landmarker). Tap a
  sticker and it lands on the right spot on **every face** in the photo — hats
  above the head, glasses across the eyes, mustaches under the nose, and more.
  Stickers scale and rotate to match each head's size and tilt. If there's no
  face (she's shooting a toy or the dog), it stays quiet and just drops the
  sticker so she can drag it — no nagging pop-ups.
- **💎 56 premium HD stickers**, all **original hand-crafted vector artwork**
  (glossy, die-cut, razor-sharp at any size — no clip-art, no plain emoji),
  across 7 categories:
  - **Hats** — gold crown, tiara, party hat, top hat, wizard, halo, cowboy…
  - **Eyes** — heart eyes, star eyes, aviators, heart glasses, 3D, laser eyes…
  - **Animals** — cat/bunny/bear/puppy ears, antlers, unicorn, puppy & pig nose…
  - **Face** — hero mask, clown nose, mustache, freckles, glowing red nose…
  - **Mouths** — kiss lips, vampire fangs, silly tongue, gold grill…
  - **Cheeks** — blush, rainbows, stars, sparkles…
  - **Stickers** — rainbow, hearts, gems, butterfly, cupcake, ice cream…
- **🎯 One sticker per face zone** — choosing a new hat *swaps* the old hat,
  new glasses swap the glasses… no accidental stacks of 20 hats. (Free
  stickers can still be added and dragged freely.)
- **🖍️ Drawing tools** — crayon, marker, neon glow, rainbow, and glitter
  brushes, a 10-color palette, adjustable size, and an eraser.
- **🎨 18 photo filters** — Sunny, Vivid, Vintage, Dreamy, Cotton Candy,
  Moonlight, Comic Pop, Pixel, Poster, and more.
- **🪄 Surprise Me!** — instantly decorates every face with a random combo.
- **↩️ Undo / redo**, move / resize / rotate / flip / delete any sticker.
- **💾 Auto-save** — every photo is saved to **My Photos** the moment it's taken,
  and keeps saving itself as she decorates. Nothing is ever lost.
- **🖼️ My Photos gallery** — stored offline (IndexedDB), with download and delete.
- **📲 Installable PWA** — add to the iPad home screen and it runs full-screen
  and **offline** (service worker caches the app and the face model).

## 🚀 Deployment (GitHub Pages)

This is a plain static site — **no build step**. It deploys automatically via
GitHub Actions (`.github/workflows/deploy.yml`):

1. In the repo, go to **Settings → Pages** and set **Source: GitHub Actions**
   (the workflow also tries to enable this automatically on first run).
2. Push to the deploy branch — the workflow runs the tests, then publishes.
3. Your app appears at `https://<user>.github.io/<repo>/`.

> 📷 Cameras require **HTTPS**. GitHub Pages is HTTPS, so it just works. On the
> iPad, open the page in Safari and tap **Share → Add to Home Screen** to play
> like a native app.

## 🧪 Running & testing locally

```bash
# start a local static server
npm run serve         # → http://localhost:8080

# run the unit + integration test suite (Node's built-in test runner, no deps)
npm test

# regenerate the app icons (pure-Node PNG encoder, no image libraries needed)
npm run icons
```

### End-to-end verification (optional, needs Chromium)

```bash
npm i --no-save playwright
node scripts/verify.mjs        # drives the whole app in a headless browser
node scripts/verify-face.mjs   # proves face detection + auto-placement (self-hosted model)
```

## 🔒 Privacy

Photos **never leave the device** — face detection runs entirely in the browser.
The only network request is a one-time download of the ~4 MB face model file
(from Google's CDN), which is then cached for offline use. No child's image or
data is ever uploaded anywhere.

Want zero third-party requests? Self-host the model by setting these globals
before the app loads (see `js/faces.js`):
`window.__MAE_VISION_BUNDLE`, `window.__MAE_VISION_WASM`, `window.__MAE_MODEL_URL`.

## 🧩 How it's built

Vanilla ES modules — no framework, no bundler — so it deploys anywhere as static
files and has nothing to break in a build.

| File | Role |
|------|------|
| `assets/stickers/*.svg` | 56 original hand-crafted HD vector stickers |
| `js/geometry.js` | Pure face-anchor math (unit-tested) |
| `js/stickers.js` | The sticker catalog (pure data, unit-tested) |
| `js/camera.js` | getUserMedia + front/rear flip |
| `js/faces.js` | MediaPipe Face Landmarker wrapper |
| `js/editor.js` | Canvas pipeline: HD sticker rendering, filters, brushes, face-zone swapping, touch manipulation, autosave |
| `js/gallery.js` | IndexedDB photo storage |
| `js/app.js` | UI orchestration, countdown timer, autosave |
| `sw.js` | Offline service worker |
| `scripts/gen-icons.mjs` | Dependency-free PNG icon generator |
| `scripts/verify*.mjs` | Headless-browser E2E + face-detection checks |

Made with 💖 for Mae.
