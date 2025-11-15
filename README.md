# Chrono Stride AR

## Features
- Real‑time camera preview with overlay anchors
- 3D shoe rendering with rotation alignment
- Left / Right foot modes (`/foot/left`, `/foot/right`)
- Mobile‑friendly video setup (autoplay, playsinline)
- Production server ready for tunneling to phones

## Quick Start
Prerequisites: Node.js 18+, npm

1. Navigate to the app:
   - `cd reactThreeFiberDemos`

2. Install dependencies:
   - `npm install`

3. Development:
   - `npm run dev -- --host` (LAN/mobile testing)

4. Build and preview:
   - `npm run build`
   - `npm run preview`

5. Lint:
   - `npm run lint`

## Routes
- `/` — home with product cards and 3D previews
- `/try/:modelId` — AR try‑on (launched from a card; passes `{ url, mode }` via navigation state)
- `/product/:id` — product details
- `/cart` — cart
- `/login`, `/signup` — auth pages

## 3D Models
- Wrist models: `reactThreeFiberDemos/src/assets/VTO/*.glb`
- Foot models: `reactThreeFiberDemos/src/assets/bareFootVTO/*.glb`
- Previews auto‑scale models; AR uses occluders and pose transforms.

## Permissions
- Camera requires HTTPS or `localhost`. If you see a black screen or permission dialog repeatedly, ensure you are using the tunnel URL or `localhost` and allow camera access in your browser.

## Deployment Notes
- Stack: React 18, Vite, React Three Fiber, Ant Design, Three.js, WebARRocksHand.
- Dev server host: `vite --host` for LAN/mobile testing.
- `reactThreeFiberDemos/vite.config.js` includes `assetsInclude` for `*.glb`/`*.hdr` and `allowedHosts` for tunnels.
- Camera requires HTTPS or `localhost`; ensure permissions on mobile.

## Troubleshooting
- 502 Bad Gateway from Cloudflared:
  - Verify your origin is listening: try `http://localhost:3001/foot` in a desktop browser.
  - Ensure the tunnel points to the correct port: `cloudflared tunnel --url http://127.0.0.1:3001`.

- Camera black screen:
  - Use the HTTPS tunnel on mobile; some browsers block camera on plain HTTP.
  - Close other apps using the camera and retry.

- Missing 3D model:
  - Confirm the file exists under `public/model/` and the path used in the app is correct.

## License
This project is provided as‑is for demonstration and evaluation. Replace or update this section according to your distribution needs.