Augmented Reality Project

## Backblaze B2 Integration

This project can load `.glb` 3D models directly from a Backblaze B2 bucket by listing the bucket and generating presigned URLs via the S3-compatible API.

### Environment variables

Create `.env.local` with the following:

```
B2_S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
B2_REGION=us-west-002
B2_BUCKET_NAME=your_bucket_name
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
```

If your bucket is public and has proper CORS for your domain, you can also build public URLs instead of presigning. This project presigns by default for private buckets.

### Permissions

- Generate an Application Key in Backblaze with S3 access to your bucket (list, read). Use the key ID and application key above.
- Ensure bucket CORS allows GET from your local dev origin (e.g. `http://localhost:3000`) if not presigning, or rely on presigned URLs as implemented.

### Usage

- Start the dev server: `npm run dev` and open `http://localhost:3000`.
- The left panel lists `.glb` assets from your B2 bucket. Click one to load it in the AR scene.
- Presigned URLs expire after 15 minutes; refresh the page to regenerate.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Foot Tracking (WebAR.rocks-only)

This project uses WebAR.rocks for foot landmark detection. The SDK script and NN are bundled under `public/webarrocks/foot/`.

- Script: `/webarrocks/foot/webarrocks-foot.js`
- NN JSON: `/webarrocks/foot/NN_FOOT_23.json`

Detection flow:
- `lib/detection/webarrocks.ts` dynamically loads the SDK and initializes it on an offscreen canvas.
- `components/FootTracker.tsx` feeds the HTML `<video>` to the SDK and renders overlays plus the 3D shoe with React Three Fiber.
- `components/models/registry.ts` loads the GLB shoe models (either embedded base64 or from `/public/model`).

There is no TensorFlow/MoveNet dependency anymore; all inference is performed by WebAR.rocks.

### Development URLs
- `http://localhost:3000/foot` — main foot tracking demo
- `http://localhost:3000/foot/left` and `/foot/right` — single-foot demos

## 3D Model Usage Audit
This repository uses Three.js and React Three Fiber to load, initialize, and render GLTF (`.glb`) models. Below are the key integration points:

- Model loading
  - `components/ArScene.tsx`: uses `GLTFLoader`, `DRACOLoader`, and `MeshoptDecoder` to fetch and parse models, defaulting to `/model/sneaker.glb` unless `modelUrl` is provided.
  - `components/ModelViewer.tsx`: uses `@react-three/drei` `useGLTF` to load models into a standard R3F scene.
  - Backblaze B2: `lib/b2.ts` and API routes generate presigned URLs for remote `.glb` assets.

- Model initialization
  - `ArScene.tsx`: creates a wrapper `THREE.Group` around the loaded scene to center and scale the shoe, adds ambient and directional lights, and sets renderer pixel ratio and output color space.
  - Draco/Meshopt integration: speeds up decoding for compressed assets.

- Model inference and prediction
  - In this project, “model inference” refers to foot pose detection, now exclusively via WebAR.rocks in `lib/detection/webarrocks.ts`.
  - The detection outputs landmark pixel coordinates forwarded to `FootTracker.tsx`, which maps to canvas space for overlay and placement.

- Input/output data processing
  - Input: HTML `<video>` frames supplied directly to WebAR.rocks via `update_videoElement`.
  - Output: normalized ankle positions (`0–1` in video width/height) emitted by `FootTracker.tsx` through its `onDetect` callback, and pixel-space anchors used for overlay placement.

- Integration points
  - `components/FootTracker.tsx`: orchestrates camera acquisition, detection, overlay rendering, and passes anchors to `FootOverlayR3F`.
  - `components/FootOverlayR3F.tsx`: renders the 3D shoe model in R3F aligned to the detected anchor/toe/knee points.
  - `components/ArScene.tsx`: separate AR session management using WebXR hit-test; can place a model when a marker is tracked.

## Architecture Notes (WebAR.rocks-only)
- TensorFlow/MoveNet has been fully removed from dependencies and code.
- `lib/detection/manager.ts` returns only the WebAR.rocks engine; no fallback.
- `lib/detection/types.ts` limits `FootDetectorEngine.type` to `'webarrocks'`.
- `components/FootTracker.tsx` no longer uses offscreen canvases for TF; it streams the `<video>` directly to WebAR.rocks and smooths ankle points.

## Testing
- Unit tests: Vitest covers monitoring utilities and XR lifecycle; WebAR.rocks engine tests are currently skipped in CI due to timing sensitivity in JSDOM.
- To run tests: `npm test`
- For end-to-end validation, run dev server and test `/foot` routes with a webcam.

## Run In Your Phone

```bash
cloudflared tunnel --url http://localhost:3000  
```
After that the local tunnel will provide a url. click that and get the password form the link.
Which is inside the url. Example[https://ear-quantities-seat.trycloudflare.com]
