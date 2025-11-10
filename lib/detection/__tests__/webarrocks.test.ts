import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWebARRocksEngine } from '../webarrocks';
import { createFootDetectionManager } from '../manager';

// Minimal stub of the WebAR.rocks Hand API
function makeStubAPI() {
  let cbReady: ((errCode: string | false) => void) | null = null;
  let cbTrack: ((detectState: any) => void) | null = null;
  let currentVideo: HTMLVideoElement | null = null;
  return {
    init: (spec: any) => {
      cbReady = spec.callbackReady || null;
      cbTrack = spec.callbackTrack || null;
      // Immediately signal ready
      cbReady && cbReady(false);
    },
    update: () => {
      // Emit a simple track state
      cbTrack && cbTrack({});
    },
    get_LM: () => {
      // One keypoint pair -> [x,y]
      return [0, 0];
    },
    update_videoElement: (vid: HTMLVideoElement, cb?: () => void) => {
      currentVideo = vid;
      cb && cb();
    },
    destroy: () => {},
  } as any;
}

describe('WebAR.rocks engine', () => {
  let prev: any;
  beforeEach(() => {
    prev = (globalThis as any).WEBARROCKSHAND;
    (globalThis as any).WEBARROCKSHAND = makeStubAPI();
  });
  afterEach(() => {
    (globalThis as any).WEBARROCKSHAND = prev;
  });

  it('creates engine when SDK is available', async () => {
    const engine = await createWebARRocksEngine();
    expect(engine).toBeTruthy();
    expect(engine?.name).toContain('WebAR.rocks');
    expect(engine?.type).toBe('webarrocks');
  });

  it('estimates and returns keypoints mapped to video space', async () => {
    const engine = await createWebARRocksEngine();
    expect(engine).toBeTruthy();
    const vid = document.createElement('video');
    // jsdom does not set videoWidth/Height; assign manually
    (vid as any).videoWidth = 640;
    (vid as any).videoHeight = 480;
    const res = await engine!.estimate(vid, {
      flipHorizontal: false,
      mapToOriginal: { srcW: 640, srcH: 480, origW: 640, origH: 480 },
    });
    expect(res).toBeTruthy();
    expect(res![0].keypoints.length).toBeGreaterThan(0);
    const kp = res![0].keypoints[0];
    expect(kp.x).toBeGreaterThanOrEqual(0);
    expect(kp.y).toBeGreaterThanOrEqual(0);
  });
});

describe('Detection manager', () => {
  let prev: any;
  beforeEach(() => {
    prev = (globalThis as any).WEBARROCKSHAND;
    (globalThis as any).WEBARROCKSHAND = makeStubAPI();
  });
  afterEach(() => {
    (globalThis as any).WEBARROCKSHAND = prev;
  });

  it('uses WebAR.rocks as the sole engine', async () => {
    const { engine, usingWebARRocks } = await createFootDetectionManager({ preset: 'full', preferWebARRocks: true });
    expect(usingWebARRocks).toBe(true);
    expect(engine.type).toBe('webarrocks');
  });
});