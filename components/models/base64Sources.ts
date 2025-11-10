import type { ShoeKind } from './registry';

const PATHS: Record<ShoeKind, string> = {
  left: '/model/vansShoe.glb',
  right: '/model/vansShoe.glb',
  single: '/model/ballerinaShoe.glb',
};

const b64Cache = new Map<ShoeKind, string>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // atob/btoa operate on window; in Next.js client this is available
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

export async function getBase64(kind: ShoeKind): Promise<string> {
  if (b64Cache.has(kind)) return b64Cache.get(kind)!;
  const url = PATHS[kind];
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch GLB at ${url}: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  const dataUri = `data:application/octet-stream;base64,${b64}`;
  b64Cache.set(kind, dataUri);
  return dataUri;
}