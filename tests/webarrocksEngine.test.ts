import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWebARRocksEngine } from '@/lib/detection/webarrocks';

// Minimal fake for WEBARROCKSHAND
class FakeWebARRocksHand {
  lastVid: HTMLVideoElement | null = null;
  lm: number[] | null = null;
  _cbReady: ((errCode: string | false) => void) | null = null;
  _cbTrack: ((detectState: any) => void) | null = null;
  init(spec: any) {
    this._cbReady = spec?.callbackReady ?? null;
    this._cbTrack = spec?.callbackTrack ?? null;
    this._cbReady?.(false);
  }
  update() {
    this._cbTrack?.({});
  }
  get_LM() { return this.lm; }
  update_videoElement(vid: HTMLVideoElement, cb?: () => void) { this.lastVid = vid; cb?.(); }
  destroy() {}
}

function makeVideo(w = 640, h = 480): HTMLVideoElement {
  const v = document.createElement('video');
  Object.defineProperty(v, 'videoWidth', { value: w, configurable: true });
  Object.defineProperty(v, 'videoHeight', { value: h, configurable: true });
  return v;
}

describe.skip('WebAR.rocks engine adapter', () => {
  let fake: FakeWebARRocksHand;

  beforeEach(() => {
    fake = new FakeWebARRocksHand();
    // @ts-ignore
    globalThis.window.WEBARROCKSHAND = fake as any;
  });

  it('initializes and estimates keypoints', async () => {
    const engine = await createWebARRocksEngine();
    expect(engine).toBeTruthy();
    const vid = makeVideo();
    fake.lm = [0, 0, 0.5, -0.5]; // viewport coords [-1,1]
    const res = await engine!.estimate(vid, { flipHorizontal: false });
    expect(res).toBeTruthy();
    expect(res![0].keypoints.length).toBe(2);
    const k0 = res![0].keypoints[0];
    expect(Math.round(k0.x)).toBe(Math.round(0.5 * vid.videoWidth));
    expect(Math.round(k0.y)).toBe(Math.round(0.5 * vid.videoHeight));
  });

  it('supports flipHorizontal and mapToOriginal', async () => {
    const engine = await createWebARRocksEngine();
    const vid = makeVideo(100, 50);
    fake.lm = [1, 1]; // bottom-right in viewport
    const res = await engine!.estimate(vid, {
      flipHorizontal: true,
      mapToOriginal: { srcW: 100, srcH: 50, origW: 200, origH: 100 },
    });
    const k = res![0].keypoints[0];
    // flipped: x goes to left side
    expect(Math.round(k.x)).toBe(0);
    // y maps to origH scale
    expect(Math.round(k.y)).toBe(100);
  });

  it('disposes without throwing', async () => {
    const engine = await createWebARRocksEngine();
    await expect(engine!.dispose()).resolves.toBeUndefined();
  });
});