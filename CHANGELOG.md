# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Fixed
- Lazy creation of `WebGLRenderer` moved to AR session start to avoid idle WebGL context crashes and camera permission issues.
- Added marker pulse animation with scale and opacity for clearer placement feedback.
- Integrated `NEXT_PUBLIC_SHOE_YAW_DEG` to control initial shoe yaw in `FootOverlayR3F`.
- Reduced R3F canvas DPR to `1` and set `powerPreference: high-performance` to lower GPU load on mobile.
- Replaced ad-hoc `console.log/error` with structured logging via `lib/monitor`.
- Corrected Tailwind v4 PostCSS configuration using `@tailwindcss/postcss` plugin.

### Added
- `lib/math.ts`: `degToRad`, `lerp`, `blendAngle` helpers with tests.
- `lib/monitor.ts`: logging, error reporting, timers, counters, and `measure` helper.
- `lib/xrLifecycle.ts`: helpers to create renderer, start/end XR session, handle WebGL teardown, and resize.
- Unit tests for math, monitor, and XR lifecycle behavior.

### Changed
- Instrumented `ArScene.tsx` with monitoring logs and error reporting.
- Updated `package.json` to add `vitest` and test scripts.

### Notes
- Dev server runs on `http://localhost:3001/` when port 3000 is busy.
- Tailwind CSS v4 requires `@import "tailwindcss";` in `app/globals.css` and a PostCSS plugin entry.