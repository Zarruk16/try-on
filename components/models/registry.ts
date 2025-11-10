import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getBase64 } from './base64Sources';

export type ShoeKind = 'left' | 'right' | 'single';

// Paths kept for reference, but we primarily parse from base64 code now
const MODEL_PATHS: Record<ShoeKind, string> = {
  left: '/model/left-foot-sneaker.glb',
  right: '/model/right-foot-sneaker.glb',
  single: '/model/sneaker.glb',
};

const loader = new GLTFLoader();
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
  try {
    const dataUri = await getBase64(kind);
    const base64 = dataUri.split(',')[1];
    // eslint-disable-next-line no-undef
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const arrayBuffer = bytes.buffer;
    const gltf: any = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });
    const root: THREE.Object3D = gltf.scene || gltf.scenes?.[0] || gltf;
    configureModel(root);
    cache.set(kind, root);
  } catch (err) {
    // Fallback: try direct URL load from public if parse fails
    const url = MODEL_PATHS[kind];
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    const root: THREE.Object3D = gltf.scene || gltf.scenes?.[0] || gltf;
    configureModel(root);
    cache.set(kind, root);
  }
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