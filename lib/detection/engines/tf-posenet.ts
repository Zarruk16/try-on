import type { FootDetectorEngine, PoseResult, EstimateOptions } from '../types';

declare global {
  interface Window { tf?: any; posenet?: any }
}

async function ensureTfPosenet(): Promise<{ tf: any; posenet: any }> {
  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  if (!window.tf) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.16.0/dist/tf.min.js');
  }
  if (!window.posenet) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/posenet@2.2.1/dist/posenet.min.js');
  }
  return { tf: window.tf!, posenet: window.posenet! };
}

export function createTfPosenetEngine(): FootDetectorEngine {
  let net: any = null;
  let initialized = false;

  const initNet = async (video?: HTMLVideoElement) => {
    if (initialized && net) return;
    const { posenet } = await ensureTfPosenet();
    net = await posenet.load({ architecture: 'MobileNetV1', outputStride: 16, inputResolution: { width: 257, height: 200 }, multiplier: 0.75 });
    initialized = true;
  };

  const mapPose = (pose: any): PoseResult | null => {
    if (!pose || !pose.keypoints) return null;
    const kps: any[] = [];
    const add = (part: string, outName: string) => {
      const kp = pose.keypoints.find((k: any) => String(k.part || '').toLowerCase() === part);
      if (kp && kp.position) kps.push({ x: kp.position.x, y: kp.position.y, score: kp.score || 0.9, name: outName });
    };
    add('leftankle', 'left_ankle');
    add('rightankle', 'right_ankle');
    add('leftknee', 'left_knee');
    add('rightknee', 'right_knee');
    add('lefthip', 'left_hip');
    add('righthip', 'right_hip');
    return kps.length ? { keypoints: kps } : null;
  };

  return {
    name: 'TensorFlow.js PoseNet',
    type: 'tf',
    async initialize() { await initNet(); },
    async estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: EstimateOptions): Promise<PoseResult[] | null> {
      const vid = source as HTMLVideoElement;
      if (!vid || vid.tagName !== 'VIDEO' || !vid.videoWidth || !vid.videoHeight) return null;
      await initNet(vid);
      const pose = await net.estimateSinglePose(vid, { flipHorizontal: !!options?.flipHorizontal });
      const mapped = mapPose(pose);
      if (!mapped) return null;
      if (options?.flipHorizontal) {
        const w = vid.videoWidth;
        mapped.keypoints = mapped.keypoints.map((kp) => ({ ...kp, x: w - kp.x }));
      }
      return [mapped];
    },
    dispose() { try { net?.dispose?.(); } catch {} net = null; initialized = false; },
  };
}

