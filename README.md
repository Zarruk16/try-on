# Chrono Stride AR

Chrono Stride AR is a mobile‑first web application that overlays a 3D shoe on your foot in real time. It is built with Next.js App Router and Three.js, optimized for running locally and via a secure tunnel on phones.

## Features
- Real‑time camera preview with overlay anchors
- 3D shoe rendering with rotation alignment
- Left / Right foot modes (`/foot/left`, `/foot/right`)
- Mobile‑friendly video setup (autoplay, playsinline)
- Production server ready for tunneling to phones

## Quick Start
Prerequisites: Node.js 18+, npm

1. Install dependencies:
   - `npm install`

2. Development (local):
   - `npm run dev` (desktop localhost)
   - `npm run dev:network` (binds to `0.0.0.0` for LAN/mobile testing)

3. Production build:
   - `npm run build`
   - `npx next start -H 0.0.0.0 -p 3001`

4. Run on your phone via Cloudflare Tunnel:
   - `cloudflared tunnel --url http://127.0.0.1:3001`
   - Open the provided HTTPS URL on your phone and navigate to `/foot`

## Routes
- `/foot` — main foot tracking
- `/foot/left` — left foot only
- `/foot/right` — right foot only

## 3D Models
- Place GLB models under `public/model/`.
- Default path used in the app: `/model/ballerinaShoe.glb` (you can replace with your own).

## Permissions
- Camera requires HTTPS or `localhost`. If you see a black screen or permission dialog repeatedly, ensure you are using the tunnel URL or `localhost` and allow camera access in your browser.

## Deployment Notes
- Next.js 15 with React 19 using the App Router.
- All camera and WebGL operations run client‑side.
- When deploying on Vercel:
  - Ensure your 3D models exist in `public/model/` and paths match case‑sensitive filenames.
  - Avoid server‑side usage of `window`/`document` in non‑client files.

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