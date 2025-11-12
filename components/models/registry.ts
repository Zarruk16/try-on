import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type ShoeKind = 'left' | 'right' | 'single';

// Default lightweight demo models from vendor project (stream-loaded via URL)
const DEMO_MODEL_PATHS: Record<ShoeKind, string> = {
  left: '/3D%20Models/vansShoe.glb',
  right: '/3D%20Models/vansShoe.glb',
  single: '/3D%20Models/ballerinaShoe.glb',
};

const loader = new GLTFLoader();
loader.setCrossOrigin('anonymous');
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });
loader.setDRACOLoader(dracoLoader);
loader.setMeshoptDecoder(MeshoptDecoder);
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
    // Allow env override to load external models (e.g., your custom GLB URLs)
    const override = (
      kind === 'left' ? process.env.NEXT_PUBLIC_MODEL_URL_LEFT :
      kind === 'right' ? process.env.NEXT_PUBLIC_MODEL_URL_RIGHT :
      process.env.NEXT_PUBLIC_MODEL_URL_SINGLE
    );
    const ov = override ? override.trim() : '';
    const useOverride = ov.length > 0 && (ov.startsWith('http') || ov.includes('/3D Models/') || ov.includes('/3D%20Models/'));
    const url = useOverride ? ov : DEMO_MODEL_PATHS[kind];
    const gltf: any = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    const root: THREE.Object3D = gltf.scene || gltf.scenes?.[0] || gltf;
    configureModel(root);
    cache.set(kind, root);
  } catch (err) {
    console.error('[models/registry] Failed to load model', { kind, err });
    throw err;
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
