import type { FootDetectorEngine, PoseResult, EstimateOptions } from './types';

// WebAR.rocks Hand SDK minimal types used by our adapter
interface WebARRocksHandInitSpec {
  canvasId?: string;
  NNsPaths?: string[];
  callbackReady?: (errCode: string | false, spec?: any) => void;
  callbackTrack?: (detectState: any) => void;
  videoSettings?: { videoElement?: HTMLVideoElement };
}

interface WebARRocksHandAPI {
  init(spec: WebARRocksHandInitSpec): void;
  update(): void;
  get_LM(): number[] | null; // flattened [x0,y0,x1,y1,...] viewport coords [-1,1]
  get_LMLabels?(): string[];
  update_videoElement(vid: HTMLVideoElement, callback?: () => void): void;
  toggle_pause?(isPause: boolean): void;
  destroy(): Promise<void> | void;
}

declare global {
  interface Window {
    WEBARROCKSHAND?: WebARRocksHandAPI;
  }
}

async function ensureWebARRocksScript(scriptSrc = '/webarrocks/foot/webarrocks-foot.js'): Promise<WebARRocksHandAPI | null> {
  if (window.WEBARROCKSHAND) return window.WEBARROCKSHAND;
  try {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = scriptSrc;
      // Be permissive under COEP/COOP and tunnels
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load WebAR.rocks Hand SDK script'));
      document.head.appendChild(s);
    });
  } catch (e) {
    console.warn('[WebAR.rocks] script load failed', e);
    return null;
  }
  return window.WEBARROCKSHAND ?? null;
}

export async function createWebARRocksEngine(): Promise<FootDetectorEngine | null> {
  // Obtain the SDK instance either from global or by dynamic load
  let api: WebARRocksHandAPI | null = window.WEBARROCKSHAND ?? null;
  if (!api) {
    api = await ensureWebARRocksScript();
  }
  if (!api) {
    return null; // Not available; manager will fall back to TF
  }

  // Create an offscreen canvas for the SDK
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 480;
  canvas.id = 'webarrocksCanvas';
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  canvas.style.top = '0';
  document.body.appendChild(canvas);

  const defaultNNPath = '/webarrocks/foot/NN_FOOT_23.json';
  let lastDetectState: any = null;
  let lastLandmarks: number[] | null = null;
  let initialized = false;

  let currentVideo: HTMLVideoElement | null = null;

  const engine: FootDetectorEngine = {
    name: 'WebAR.rocks Foot',
    type: 'webarrocks',
    async estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: EstimateOptions): Promise<PoseResult[] | null> {
      try {
        const vid = (source as HTMLVideoElement);
        if (vid && vid.tagName === 'VIDEO') {
          // Lazy initialize SDK when the first real video element is available
          if (!initialized) {
            await new Promise<void>((resolve) => {
              try {
                api!.init({
                  canvasId: canvas.id,
                  NNsPaths: [defaultNNPath],
                  videoSettings: { videoElement: vid },
                  callbackReady: (errCode) => {
                    if (errCode) {
                      console.warn('[WebAR.rocks] init error:', errCode);
                    } else {
                      initialized = true;
                    }
                    resolve();
                  },
                  callbackTrack: (detectState) => {
                    lastDetectState = detectState;
                    lastLandmarks = api!.get_LM?.() || null;
                  }
                });
              } catch (e) {
                console.warn('[WebAR.rocks] init failed', e);
                resolve();
              }
            });
            if (!initialized) return null;
          }
          if (currentVideo !== vid) {
            await new Promise<void>((resolve) => {
              try { api!.update_videoElement(vid, () => resolve()); } catch { resolve(); }
            });
            currentVideo = vid;
          }
        } else {
          // Only HTMLVideoElement is supported in this adapter for WebAR.rocks
          return null;
        }

        // Trigger one detection pass
        api!.update();

        const lm = lastLandmarks;
        if (!lm || lm.length < 2) return null;

        const srcW = vid.videoWidth || canvas.width;
        const srcH = vid.videoHeight || canvas.height;

        // Convert viewport coords [-1,1] to pixel coords
        const keypoints = [] as { x: number; y: number; score?: number; name?: string }[];
        for (let i = 0; i < lm.length; i += 2) {
          const vx = lm[i];
          const vy = lm[i + 1];
          let xPx = (vx + 1) * 0.5 * srcW;
          let yPx = (1 - (vy + 1) * 0.5) * srcH; // invert Y to top-left origin
          if (options?.flipHorizontal) {
            xPx = srcW - xPx;
          }
          keypoints.push({ x: xPx, y: yPx });
        }

        // Optional remap to original if provided
        const map = options?.mapToOriginal;
        let mapped = keypoints;
        if (map) {
          mapped = keypoints.map((kp) => ({
            ...kp,
            x: (kp.x / map.srcW) * map.origW + (map.offsetX || 0),
            y: (kp.y / map.srcH) * map.origH + (map.offsetY || 0),
          }));
        }

        return [{ keypoints: mapped }];
      } catch (e) {
        console.warn('[WebAR.rocks] estimate failed', e);
        return null;
      }
    },
    async dispose() {
      try { await Promise.resolve(api!.destroy()); } catch {}
      try { canvas.remove(); } catch {}
    },
  };

  return engine;
}