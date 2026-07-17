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
- **🙂 Automatic face detection** (Google MediaPipe Face Landmarker). Tap a
  sticker and it lands on the right spot on **every face** in the photo — hats
  above the head, glasses across the eyes, mustaches under the nose, and more.
  Stickers scale and rotate to match each head's size and tilt.
- **🎩 80+ stickers** across 7 categories:
  - **Hats** — crown, top hat, party hat, tiara, halo, wizard, unicorn horn…
  - **Eyes** — heart eyes, star eyes, sunglasses, 3D glasses, laser eyes…
  - **Animals** — cat/bunny/bear ears, puppy & piggy noses, whiskers, antlers…
  - **Face fun** — mustache, beard, clown nose, freckles, hero mask, monocle…
  - **Mouths** — kiss lips, vampire fangs, silly tongue, rainbow, big smile…
  - **Cheeks** — blush, stars, hearts, sparkles, rainbows…
  - **Free stickers** — rainbows, unicorns, dinos, food, hearts you can drag
    anywhere.
- **🖍️ Drawing tools** — crayon, marker, neon glow, rainbow, and glitter
  brushes, a 10-color palette, adjustable size, and an eraser.
- **🎨 18 photo filters** — Sunny, Vivid, Vintage, Dreamy, Cotton Candy,
  Moonlight, Comic Pop, Pixel, Poster, and more.
- **🪄 Surprise Me!** — instantly decorates every face with a random combo.
- **↩️ Undo / redo**, move / resize / rotate / flip / delete any sticker.
- **🖼️ My Photos gallery** — saves creations offline (IndexedDB), with download
  and delete.
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
| `js/geometry.js` | Pure face-anchor math (unit-tested) |
| `js/stickers.js` | The 80+ sticker catalog (pure data, unit-tested) |
| `js/camera.js` | getUserMedia + front/rear flip |
| `js/faces.js` | MediaPipe Face Landmarker wrapper |
| `js/editor.js` | Canvas pipeline: filters, brushes, ~45 vector sticker renderers, touch manipulation |
| `js/gallery.js` | IndexedDB photo storage |
| `js/app.js` | UI orchestration |
| `sw.js` | Offline service worker |
| `scripts/gen-icons.mjs` | Dependency-free PNG icon generator |

Made with 💖 for Mae.
