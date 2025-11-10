import type { FootDetectorEngine, PoseResult, EstimateOptions } from './types';

// WebAR.rocks foot API types (approximate; align with actual SDK when available)
interface WebARRocksFootKeypoint { x: number; y: number; score?: number; name?: string }
interface WebARRocksFootEstimateResult { keypoints: WebARRocksFootKeypoint[] }
interface WebARRocksFootInitConfig {
  // Neural network config or URL to the NN JSON (commonly referred to as NNC)
  NNC?: string;
  // Whether to flip horizontally internally
  flipX?: boolean;
  // Optional canvas or video setup if the SDK drives capture internally
  canvas?: HTMLCanvasElement;
  video?: HTMLVideoElement;
  [key: string]: any;
}
interface WebARRocksFootAPI {
  init(config: WebARRocksFootInitConfig): Promise<void> | void;
  loadModel?(nncOrConfig: string | Record<string, unknown>): Promise<void> | void;
  estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: { flipHorizontal?: boolean }): Promise<WebARRocksFootEstimateResult | null> | WebARRocksFootEstimateResult | null;
  isReady?(): boolean;
  dispose(): Promise<void> | void;
}

declare global {
  interface Window {
    WEBARROCKS_FOOT?: WebARRocksFootAPI;
  }
}

async function ensureWebARRocksScript(scriptSrc = '/webarrocks/foot/webarrocks-foot.js'): Promise<WebARRocksFootAPI | null> {
  if (window.WEBARROCKS_FOOT) return window.WEBARROCKS_FOOT;
  // Attempt to dynamically load the SDK if a default path exists
  try {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = scriptSrc;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load WebAR.rocks foot SDK script'));
      document.head.appendChild(s);
    });
  } catch (e) {
    console.warn('[WebAR.rocks] script load failed', e);
    return null;
  }
  return window.WEBARROCKS_FOOT ?? null;
}

export async function createWebARRocksEngine(): Promise<FootDetectorEngine | null> {
  // Obtain the SDK instance either from global or by dynamic load
  let api: WebARRocksFootAPI | null = window.WEBARROCKS_FOOT ?? null;
  if (!api) {
    api = await ensureWebARRocksScript();
  }
  if (!api) {
    // Not available; let the manager fall back to TF
    return null;
  }

  // Try to initialize the SDK with a default model path (adjust as per actual assets)
  const defaultNNCPath = '/webarrocks/foot/footNN.json';
  try {
    // If the SDK requires explicit model loading, do it first
    if (api.loadModel) {
      try { await api.loadModel(defaultNNCPath); } catch {}
    }
    await Promise.resolve(api.init({ NNC: defaultNNCPath, flipX: false }));
  } catch (e) {
    console.warn('[WebAR.rocks] init failed', e);
    return null;
  }

  const engine: FootDetectorEngine = {
    name: 'WebAR.rocks Foot',
    type: 'webarrocks',
    async estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: EstimateOptions): Promise<PoseResult[] | null> {
      try {
        const res = await Promise.resolve(api!.estimate(source, { flipHorizontal: options?.flipHorizontal }));
        if (!res) return null;
        const keypoints = (res.keypoints || []).map((k: WebARRocksFootKeypoint) => ({ x: k.x, y: k.y, score: k.score, name: k.name }));
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
      try { await Promise.resolve(api!.dispose()); } catch {}
    },
  };

  return engine;
}
