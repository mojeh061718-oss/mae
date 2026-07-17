// camera.js
// Wraps getUserMedia with a kid-proof front/rear flip that behaves on iPad.
//
// iOS Safari quirks handled here:
//  - Fully stop every track of the old stream before requesting a new one,
//    otherwise switching facingMode can hang or throw.
//  - Use facingMode as a *preference* (not `exact`) so devices with only one
//    camera still work instead of failing.
//  - playsinline + muted are required for the <video> to play inline on iOS.

export class Camera {
  constructor(videoEl) {
    this.video = videoEl;
    this.stream = null;
    this.facing = 'user'; // 'user' (front) or 'environment' (rear)
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('muted', '');
    this.video.muted = true;
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start(facing = this.facing) {
    this.facing = facing;
    await this._stopTracks();

    const constraints = {
      audio: false,
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // Fallback: drop the resolution hints, some iPads are picky.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facing },
      });
    }

    this.video.srcObject = this.stream;
    await this._play();
    return this.stream;
  }

  async flip() {
    const next = this.facing === 'user' ? 'environment' : 'user';
    try {
      await this.start(next);
    } catch (err) {
      // Roll back to whatever worked before.
      await this.start(this.facing === next ? 'user' : this.facing);
      throw err;
    }
    return this.facing;
  }

  // True when the active camera is the selfie/front camera. Used to decide
  // whether to mirror the preview and captured photo.
  isFrontFacing() {
    return this.facing === 'user';
  }

  get videoWidth() {
    return this.video.videoWidth || 1280;
  }

  get videoHeight() {
    return this.video.videoHeight || 720;
  }

  async _play() {
    // Wait until the video actually has dimensions before returning.
    if (this.video.readyState >= 2) {
      try { await this.video.play(); } catch (_) {}
      return;
    }
    await new Promise((resolve) => {
      const onReady = () => {
        this.video.removeEventListener('loadedmetadata', onReady);
        resolve();
      };
      this.video.addEventListener('loadedmetadata', onReady);
    });
    try { await this.video.play(); } catch (_) {}
  }

  async _stopTracks() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
  }

  stop() {
    return this._stopTracks();
  }
}
