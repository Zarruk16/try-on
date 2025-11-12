import type { FootDetectorEngine, PoseResult, EstimateOptions } from '../types';

declare global {
  interface Window { WebARRocksHand?: any }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function createWebARRocksEngine(): FootDetectorEngine {
  let initialized = false;
  let canvas: HTMLCanvasElement | null = null;
  let lastDetectState: any = null;
  let ready = false;

  const ensureLib = async () => {
    if (!window.WebARRocksHand) {
      let loaded = false;
      // Prefer same-origin proxy to avoid CDN/CORS/tunnel issues
      try { await loadScript('/api/webarrocks/sdk'); loaded = true; } catch {}
      if (!loaded) {
        const cdnUrls = [
          'https://cdn.jsdelivr.net/gh/WebAR-rocks/WebAR.rocks.hand@latest/dist/WebARRocksHand.js',
          'https://raw.githubusercontent.com/WebAR-rocks/WebAR.rocks.hand/master/dist/WebARRocksHand.js'
        ];
        for (const url of cdnUrls) {
          try { await loadScript(url); loaded = true; break; } catch {}
        }
      }
      if (!loaded) throw new Error('WebAR SDK failed to load');
    }
  };

  const mapDetectStateToPose = (ds: any): PoseResult | null => {
    if (!ds) return null;
    const kps: any[] = [];
    const lm = ds.lm || ds.landmarks || ds.keypoints || [];
    // Each landmark may be [x,y] or {x,y,name}
    for (const p of lm) {
      if (!p) continue;
      if (Array.isArray(p) && p.length >= 2) {
        kps.push({ x: p[0], y: p[1] });
      } else if (typeof p === 'object') {
        const x = 'x' in p ? (p as any).x : 0;
        const y = 'y' in p ? (p as any).y : 0;
        const name = (p as any).name || (p as any).id || undefined;
        kps.push({ x, y, name });
      }
    }
    return kps.length ? { keypoints: kps } : null;
  };

  return {
    name: 'WebAR.rocks Foot',
    type: 'webarrocks',
    async initialize() {
      await ensureLib();
      canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480; // will be resized to video
      canvas.style.display = 'none';
      canvas.id = 'webarrocks_canvas';
      document.body.appendChild(canvas);
      await new Promise<void>((resolve, reject) => {
        try {
          window.WebARRocksHand!.init({
            canvasId: 'webarrocks_canvas',
            NNsPaths: [
              '/api/webarrocks/nn',
              'https://cdn.jsdelivr.net/gh/WebAR-rocks/WebAR.rocks.hand@latest/neuralNets/NN_FOOT_23.json'
            ],
            callbackReady: function(errCode: any) {
              if (errCode) { reject(new Error('WebAR.rocks init error: '+errCode)); return; }
              ready = true; resolve();
            },
            callbackTrack: function(detectState: any) {
              lastDetectState = detectState || null;
            },
            animateDelay: 1,
          });
        } catch (e) { reject(e); }
      });
      initialized = true;
    },
    async estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: EstimateOptions): Promise<PoseResult[] | null> {
      if (!initialized || !ready || !window.WebARRocksHand) return null;
      const video = source as HTMLVideoElement;
      try {
        if (canvas && video && video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            window.WebARRocksHand.resize();
          }
        }
        window.WebARRocksHand.update_videoElement(video);
        const pose = mapDetectStateToPose(lastDetectState);
        if (!pose) return null;
        if (options?.flipHorizontal) {
          const w = video.videoWidth;
          pose.keypoints = pose.keypoints.map((kp) => ({ ...kp, x: w - kp.x }));
        }
        return [pose];
      } catch {
        return null;
      }
    },
    dispose() {
      try { window.WebARRocksHand?.destroy?.(); } catch {}
      if (canvas?.parentNode) { try { canvas.parentNode.removeChild(canvas); } catch {} }
      canvas = null; initialized = false; ready = false; lastDetectState = null;
    }
  };
}