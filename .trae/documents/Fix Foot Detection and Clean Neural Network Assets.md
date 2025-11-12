## Findings
- Multiple NN assets remain; only two JSON foot models are actually referenced: `public/models/neuralNets/NN_FOOT_23.json` and `public/models/neuralNets/NN_BAREFOOT_3.json`.
- Mediapipe `.tflite` files exist in `node_modules` but are unused.
- Test-only paths (`/webarrocks/foot/...`) are referenced by `app/test/page.tsx` but do not exist under `public`; the demo uses `/models/...`.
- Foot detection does not run because the detection manager is created but never initialized in `components/FootTracker.tsx` (engine stays `null`).

## Proposed Changes
### Asset Cleanup
1. Prune unused NN files and SDK remnants, keeping only the single canonical foot model JSON (prefer `NN_FOOT_23.json`).
2. Remove or archive `NN_BAREFOOT_3.json` and any unused vendor assets; document the chosen model and loading path.
3. Align all references to the canonical path (`/models/neuralNets/NN_FOOT_23.json`) and eliminate `/webarrocks/foot/...` test paths.
4. Enable lazy loading with cache headers to reduce initial payload.

### Detection Wiring
1. In `components/FootTracker.tsx`, call `await mgr.initialize()` immediately after `createFootDetectionManager(...)` and gate the loop on a non-null `mgr.engine`.
2. Use `mgr.estimate(videoEl, ...)` or the initialized engine for frame-by-frame inference and update ankle/toe landmarks.
3. Ensure camera constraints (`facingMode`, resolution) and video readiness before starting the detection loop.

### Demo AR Integration
1. In `app/ar/page.tsx`, continue passing `onDetect={setAnkles}`; ensure `anchorHintNDC` is derived from ankle detection.
2. Add an on-screen indicator (e.g., small overlay dot or text) when detection is active; show “No foot detected” when confidence falls below threshold.
3. Remove `app/ar-foot-detection/page.tsx` prototype wiring or convert it to use `FootTracker` properly.

### Test Page Alignment
1. Update `app/test/page.tsx` to load the same canonical model and script paths as production (`/models/...`).
2. Use the same initialization sequence as `FootTracker` to keep behavior consistent.

### Verification
1. Run the demo AR page and confirm the camera starts; watch for the detection indicator to switch to “Detected” when a foot is visible.
2. Log landmark counts and confidence once per second to verify stability; validate placement in `ArScene`.
3. Inspect network tab to confirm only one NN JSON is fetched; confirm size and caching.

### Optional Follow-ups
- Either remove Mediapipe deps from `package.json` or implement a real Mediapipe engine and allow switching via `engineType`.
- Add a lightweight mock/test harness for CI that validates the detection manager wiring without the camera.

If approved, I will implement the wiring fix, consolidate to a single NN model, align paths across demo/test, add a detection indicator, and remove unused assets. I will verify live on the demo page and provide a short report with file references and screenshots.