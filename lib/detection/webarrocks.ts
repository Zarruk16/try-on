import type { FootDetectorEngine, PoseResult, EstimateOptions } from './types';

// Debug status holder to help diagnose initialization/detection issues
const DEBUG_ENABLED = typeof process !== 'undefined'
  ? (String(process.env.NEXT_PUBLIC_WEBAR_DEBUG || '').toLowerCase() === 'true' || process.env.NEXT_PUBLIC_WEBAR_DEBUG === '1')
  : false;
const debugStatus: {
  scriptLoaded: boolean;
  sdkReady: boolean;
  initErrorCode?: string | false;
  lastUpdateError?: any;
  lastLandmarksCount: number;
  lastLabels: string[];
  lastDetectSummary?: { isDetected?: boolean; fps?: number; nHands?: number };
  scanSettings?: Record<string, any>;
} = {
  scriptLoaded: false,
  sdkReady: false,
  lastLandmarksCount: 0,
  lastLabels: [],
};

export function getWebARRocksDebugStatus() {
  return { ...debugStatus };
}

// WebAR.rocks Hand SDK minimal types used by our adapter
interface WebARRocksHandInitSpec {
  canvasId?: string;
  NNsPaths?: string[];
  callbackReady?: (errCode: string | false, spec?: any) => void;
  callbackTrack?: (detectState: any) => void;
  videoSettings?: { videoElement?: HTMLVideoElement };
  // Advanced configuration (SDK will ignore unknown fields)
  scanSettings?: Record<string, any>;
  stabilizationSettings?: Record<string, any>;
  landmarksStabilizerSpec?: Record<string, any>;
  maxHandsDetected?: number;
  landmarksLabels?: string[];
}

interface WebARRocksHandAPI {
  init(spec: WebARRocksHandInitSpec): void;
  update(): void;
  get_LM(): number[] | null; // flattened [x0,y0,x1,y1,...] viewport coords [-1,1]
  get_LMLabels?(): string[];
  update_videoElement(vid: HTMLVideoElement, callback?: () => void): void;
  set_scanSettings?(settings: Record<string, any>): void;
  set_stabilizationSettings?(settings: Record<string, any>): void;
  toggle_pause?(isPause: boolean): void;
  destroy(): Promise<void> | void;
}

declare global {
  interface Window {
    WEBARROCKSHAND?: WebARRocksHandAPI;
  }
}

async function ensureWebARRocksScript(scriptSrc = '/models/web-ar-rocks/WebARRocksHand.js'): Promise<WebARRocksHandAPI | null> {
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
    debugStatus.scriptLoaded = true;
    if (DEBUG_ENABLED) {
      console.info('[WebAR.rocks] SDK script loaded:', scriptSrc);
    }
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

  const defaultNNPath = '/models/neuralNets/NN_FOOT_23.json';
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
                const maxHands = Math.max(1, Number(process.env.NEXT_PUBLIC_WEBAR_MAX_HANDS || 2));
                const threshold = Number(process.env.NEXT_PUBLIC_WEBAR_THRESHOLD || 0.85);
                const thresholdSignal = Number(process.env.NEXT_PUBLIC_WEBAR_THRESHOLD_SIGNAL || 0.2);
                const nDetectsPerLoop = Number(process.env.NEXT_PUBLIC_WEBAR_DETECTS_PER_LOOP || 2);
                const labelsEnv = (process.env.NEXT_PUBLIC_WEBAR_LANDMARKS_LABELS || '').trim();
                const overrideLabels = labelsEnv ? labelsEnv.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                debugStatus.scanSettings = { threshold, thresholdSignal, nDetectsPerLoop, maxHandsDetected: maxHands };
                if (DEBUG_ENABLED) {
                  console.info('[WebAR.ocks] init params', debugStatus.scanSettings);
                }
                api!.init({
                  canvasId: canvas.id,
                  NNsPaths: [defaultNNPath],
                  videoSettings: { videoElement: vid },
                  maxHandsDetected: maxHands,
                  scanSettings: { threshold, thresholdSignal, nDetectsPerLoop },
                  stabilizationSettings: { translationSmoothing: 0.85, rotationSmoothing: 0.85 },
                  landmarksStabilizerSpec: { translationSmoothing: 0.85, rotationSmoothing: 0.85 },
                  landmarksLabels: overrideLabels,
                  callbackReady: (errCode) => {
                    if (errCode) {
                      console.warn('[WebAR.rocks] init error:', errCode);
                      debugStatus.initErrorCode = errCode;
                    } else {
                      initialized = true;
                      debugStatus.sdkReady = true;
                      // Apply advanced scan/stabilization settings for better accuracy
                      try {
                        const nDetects = Math.max(1, Number(process.env.NEXT_PUBLIC_WEBAR_DETECTS_PER_LOOP || nDetectsPerLoop || 2));
                        api!.set_scanSettings?.({ nDetectsPerLoop: nDetects, threshold, thresholdSignal });
                      } catch (e) {
                        console.warn('[WebAR.rocks] set_scanSettings failed', e);
                        debugStatus.lastUpdateError = e;
                      }
                      try {
                        // Basic stabilization smoothing; SDK will ignore unknown fields
                        api!.set_stabilizationSettings?.({ translationSmoothing: 0.85, rotationSmoothing: 0.85 });
                      } catch (e) {
                        console.warn('[WebAR.ocks] set_stabilizationSettings failed', e);
                        debugStatus.lastUpdateError = e;
                      }
                    }
                    resolve();
                  },
                  callbackTrack: (detectState) => {
                    lastDetectState = detectState;
                    lastLandmarks = api!.get_LM?.() || null;
                    // Try to summarize detect state if available (fields vary by SDK build)
                    try {
                      const summary = {
                        isDetected: Boolean((detectState && (detectState.detected || detectState.isDetected)) ?? undefined),
                        fps: Number((detectState && detectState.fps) ?? NaN),
                        nHands: Number((detectState && (detectState.nHands || detectState.hands?.length)) ?? NaN),
                      } as { isDetected?: boolean; fps?: number; nHands?: number };
                      debugStatus.lastDetectSummary = summary;
                    } catch {}
                  }
                });
              } catch (e) {
                console.warn('[WebAR.rocks] init failed', e);
                debugStatus.lastUpdateError = e;
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
        try {
          api!.update();
        } catch (e) {
          debugStatus.lastUpdateError = e;
          if (DEBUG_ENABLED) console.warn('[WebAR.rocks] update() threw', e);
        }

        const lm = lastLandmarks;
        if (!lm || lm.length < 2) return null;

        const srcW = vid.videoWidth || canvas.width;
        const srcH = vid.videoHeight || canvas.height;

        // Convert viewport coords [-1,1] to pixel coords and attach labels if available
        const labels = api!.get_LMLabels?.() || null;
        const keypoints = [] as { x: number; y: number; score?: number; name?: string }[];
        for (let i = 0; i < lm.length; i += 2) {
          const vx = lm[i];
          const vy = lm[i + 1];
          let xPx = (vx + 1) * 0.5 * srcW;
          let yPx = (1 - (vy + 1) * 0.5) * srcH; // invert Y to top-left origin
          if (options?.flipHorizontal) {
            xPx = srcW - xPx;
          }
          const kp: { x: number; y: number; score?: number; name?: string } = { x: xPx, y: yPx };
          if (labels && labels[Math.floor(i / 2)]) {
            kp.name = String(labels[Math.floor(i / 2)]).toLowerCase();
          }
          keypoints.push(kp);
        }
        debugStatus.lastLandmarksCount = lm.length / 2;
        if (labels && labels.length) debugStatus.lastLabels = labels.slice(0, 8);
        // Promote key logs to info so they appear in captured console output
        console.info('[WebAR.ocks] lmCount', debugStatus.lastLandmarksCount, 'labels', debugStatus.lastLabels);
        if (debugStatus.lastDetectSummary) {
          console.info('[WebAR.ocks] summary', debugStatus.lastDetectSummary);
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
        debugStatus.lastUpdateError = e;
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
