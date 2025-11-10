import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ShoeKind = 'left' | 'right' | 'single';

// Public paths to GLB models
const MODEL_PATHS: Record<ShoeKind, string> = {
  left: '/model/left-foot-sneaker.glb',
  right: '/model/right-foot-sneaker.glb',
  single: '/model/sneaker.glb',
};

const loader = new GLTFLoader();
// Allow cross-origin requests if your production domain serves models via CDN
// (same-origin models ignore this setting).
// Some proxies/CDNs require explicit anonymous CORS to avoid fetch rejection.
// This is safe for public GLB assets.
// @ts-ignore - underlying Loader exposes setCrossOrigin
loader.setCrossOrigin?.('anonymous');
const cache = new Map<ShoeKind, THREE.Object3D>();

function configureModel(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (obj.isMesh) {
      obj.frustumCulled = false;
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  root.matrixAutoUpdate = false;
}

export async function preload(kind: ShoeKind): Promise<void> {
  if (cache.has(kind)) return;
  const url = MODEL_PATHS[kind];
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(url, resolve, undefined, (err) => {
      console.error(`GLB load failed for ${url}`, err);
      reject(err);
    });
  });
  const root: THREE.Object3D = gltf.scene || gltf.scenes?.[0] || gltf;
  configureModel(root);
  cache.set(kind, root);
}

export async function getModel(kind: ShoeKind): Promise<THREE.Object3D> {
  if (!cache.has(kind)) {
    await preload(kind);
  }
  const root = cache.get(kind)!;
  // Return a lightweight clone to allow independent transforms
  const clone = root.clone(true);
  // Disable matrix auto updates to reduce per-frame cost; caller sets position/rotation/scale
  clone.matrixAutoUpdate = false;
  clone.traverse((obj: any) => {
    if (obj.isMesh) obj.frustumCulled = false;
  });
  return clone;
}

export async function preloadAll(): Promise<void> {
  await Promise.all([
    preload('left'),
    preload('right'),
    preload('single'),
  ]);
}