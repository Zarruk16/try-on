"use client";
import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as THREE from 'three';
// Model loading handled via local registry

export interface AnkleCoords {
  left: { x: number; y: number } | null;
  right: { x: number; y: number } | null;
}

type TargetFoot = 'left' | 'right' | 'any';
interface FootTrackerProps {
  onDetect: (ankles: AnkleCoords) => void;
  fullScreen?: boolean;
  targetFoot?: TargetFoot;
  accuracy?: 'lite' | 'full' | 'heavy';
  showHud?: boolean;
}

export default function FootTracker({ onDetect, fullScreen = false, targetFoot = 'any', accuracy = 'full', showHud = false }: FootTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [footDetected, setFootDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false);
  const zoomFactor = 1.10; // slight zoom-in to match AR view
  const debugDisableZoom = false; // set true to disable container zoom for debugging
  const PIVOT_BIAS_PX = 12; // small toe-ward bias to calibrate GLB origin
  const debugDrawAnchor = false; // draw cyan anchor->placement overlay when true
  const missThreshold = 3; // frames before switching to crop mode
  const [detectMode, setDetectMode] = useState<'full' | 'crop'>('full');
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const shoeRef = useRef<THREE.Group | null>(null);
  const shadowRef = useRef<THREE.Mesh | null>(null);
  const threeReadyWarnedRef = useRef(false);
  const lastRawLogRef = useRef(0);
  const [shoeLoadError, setShoeLoadError] = useState<string | null>(null);
  const unitScaleRef = useRef<number>(1); // converts model units to pixels
  const longestSizeRef = useRef<number | null>(null); // longest GLB dimension for unit->px scaling
  const lastShoePosRef = useRef<{ x: number; y: number } | null>(null);
  const lastShoeRotRef = useRef<number>(0);
  const [activeModelType, setActiveModelType] = useState<'THUNDER' | 'LIGHTNING'>('THUNDER');

  useEffect(() => {
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    const containerEl = containerRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    // Enable Three.js caching to speed up repeated loads
    THREE.Cache.enabled = true;

    let detector: poseDetection.PoseDetector | null = null;
    let running = false;
    let lastCanvasW = 0;
    let lastCanvasH = 0;
    let prevLeftVideo: { x: number; y: number } | null = null;
    let prevRightVideo: { x: number; y: number } | null = null;
    const smooth = (prev: { x: number; y: number } | null, curr: { x: number; y: number } | null, alpha = 0.5) => {
      if (!curr) return prev ? { x: prev.x, y: prev.y } : null;
      if (!prev) return curr;
      return { x: prev.x * (1 - alpha) + curr.x * alpha, y: prev.y * (1 - alpha) + curr.y * alpha };
    };
    let lastDetectTime = performance.now();

    const drawOverlay = (poses: poseDetection.Pose[] | null) => {
      const videoW = videoEl.videoWidth;
      const videoH = videoEl.videoHeight;
      const POS_ALPHA = activeModelType === 'LIGHTNING' ? 0.25 : 0.4; // ankle smoothing

      const canvasW = fullScreen ? window.innerWidth : 320;
      const canvasH = fullScreen ? window.innerHeight : 240;
      if (canvasW !== lastCanvasW || canvasH !== lastCanvasH) {
        canvasEl.width = canvasW;
        canvasEl.height = canvasH;
        lastCanvasW = canvasW;
        lastCanvasH = canvasH;

        // Init or resize three.js overlay to match canvas
        const webglEl = webglCanvasRef.current!;
        if (!threeRendererRef.current) {
          const renderer = new THREE.WebGLRenderer({ canvas: webglEl, alpha: true, antialias: true });
          renderer.setPixelRatio(window.devicePixelRatio);
          renderer.setSize(canvasW, canvasH);
          renderer.setClearColor(0x000000, 0);
          // Use sRGB for correct PBR rendering
          (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
          threeRendererRef.current = renderer;

          const scene = new THREE.Scene();
          const ambient = new THREE.AmbientLight(0xffffff, 1.2);
          scene.add(ambient);
          const dir = new THREE.DirectionalLight(0xffffff, 0.8);
          dir.position.set(0, 0, 10);
          scene.add(dir);
          threeSceneRef.current = scene;

          const cam = new THREE.OrthographicCamera(0, canvasW, canvasH, 0, -1000, 1000);
          cam.position.set(canvasW / 2, canvasH / 2, 10);
          cam.lookAt(new THREE.Vector3(canvasW / 2, canvasH / 2, 0));
          threeCameraRef.current = cam;

          // Load shoe model from local registry (no external storage)
          const shoeKind = targetFoot === 'left' ? 'left' : (targetFoot === 'right' ? 'right' : 'single');
          const wrapper = new THREE.Group();
          (async () => {
            try {
              const { getModel, preload } = await import('./models/registry');
              await preload(shoeKind);
              const model = await getModel(shoeKind);
              // Fix texture color space for older GLTFs
              model.traverse((o: any) => {
                const mat: any = o?.material;
                const tex: any = mat?.map;
                if ((o as any)?.isMesh && mat && tex) {
                  if ('colorSpace' in tex) tex.colorSpace = (THREE as any).SRGBColorSpace;
                  if ('encoding' in tex) tex.encoding = (THREE as any).sRGBEncoding;
                  mat.needsUpdate = true;
                }
              });
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              model.position.sub(center);
              wrapper.add(model);
              // Base tilt so shoe lies on screen plane and faces camera
              wrapper.rotation.set(Math.PI / 2, 0, 0);
              // Compute unit scale so longest model dimension fits base pixel size
              const size = box.getSize(new THREE.Vector3());
              console.info('[FootTracker] GLB size (x,y,z):', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
              const longest = Math.max(size.x, size.y, size.z) || 1;
              longestSizeRef.current = longest;
              const basePx = Math.min(canvasW, canvasH) * 0.12;
              const unitScale = basePx / longest; // world units -> pixels
              unitScaleRef.current = unitScale;
              wrapper.scale.setScalar(unitScale);
              wrapper.visible = false;
              threeSceneRef.current!.add(wrapper);
              shoeRef.current = wrapper;

              // Simple shadow blob under shoe for grounding
              const shadowGeom = new THREE.CircleGeometry(18, 32);
              const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
              const shadow = new THREE.Mesh(shadowGeom, shadowMat);
              shadow.rotation.x = Math.PI / 2;
              shadow.visible = false;
              threeSceneRef.current!.add(shadow);
              shadowRef.current = shadow;
              setShoeLoadError(null);
            } catch (e) {
              console.error('[FootTracker] Failed to load model from registry', e);
              setShoeLoadError('Failed to load shoe model');
            }
          })();
        } else {
          // Ensure sharpness on DPR changes (e.g., device rotate)
          threeRendererRef.current.setPixelRatio(window.devicePixelRatio);
          threeRendererRef.current.setSize(canvasW, canvasH);
          if (threeCameraRef.current) {
            threeCameraRef.current.left = 0;
            threeCameraRef.current.right = canvasW;
            // Switch to Y-up; we’ll convert pixel Y when placing
            threeCameraRef.current.top = canvasH;
            threeCameraRef.current.bottom = 0;
            threeCameraRef.current.updateProjectionMatrix();
            threeCameraRef.current.position.set(canvasW / 2, canvasH / 2, 10);
          }
          // If canvas size changed, keep model size consistent by recomputing unit scale
          if (shoeRef.current && longestSizeRef.current) {
            const basePx2 = Math.min(canvasW, canvasH) * 0.12;
            unitScaleRef.current = basePx2 / longestSizeRef.current;
            shoeRef.current.scale.setScalar(unitScaleRef.current);
          }
        }
      }

      ctx.clearRect(0, 0, canvasW, canvasH);

      const coverScale = Math.max(canvasW / videoW, canvasH / videoH);
      const scale = coverScale;
      const dispW = videoW * scale;
      const dispH = videoH * scale;
      const dx = (canvasW - dispW) / 2;
      const dy = (canvasH - dispH) / 2;

      const toCanvas = (vx: number, vy: number) => {
        const x = dx + vx * scale;
        const y = dy + vy * scale;
        return { x, y };
      };

      let leftVideoPx: { x: number; y: number } | null = null;
      let rightVideoPx: { x: number; y: number } | null = null;
      let leftToeVideoPx: { x: number; y: number } | null = null;
      let rightToeVideoPx: { x: number; y: number } | null = null;
      let leftKneeVideoPx: { x: number; y: number } | null = null;
      let rightKneeVideoPx: { x: number; y: number } | null = null;
      let leftPx: { x: number; y: number } | null = null;
      let rightPx: { x: number; y: number } | null = null;
      let leftToePx: { x: number; y: number } | null = null;
      let rightToePx: { x: number; y: number } | null = null;
      let leftKneePx: { x: number; y: number } | null = null;
      let rightKneePx: { x: number; y: number } | null = null;

      const first = poses?.[0];
      if (first?.keypoints) {
        const left = first.keypoints.find(k => (k.name || (k as any).part) === 'left_ankle');
        const right = first.keypoints.find(k => (k.name || (k as any).part) === 'right_ankle');
        const leftToe = first.keypoints.find(k => (k.name || (k as any).part) === 'left_foot_index');
        const rightToe = first.keypoints.find(k => (k.name || (k as any).part) === 'right_foot_index');
        const leftKnee = first.keypoints.find(k => (k.name || (k as any).part) === 'left_knee');
        const rightKnee = first.keypoints.find(k => (k.name || (k as any).part) === 'right_knee');
        if (left && (left.score ?? 0) > 0.2) leftVideoPx = { x: left.x, y: left.y };
        if (right && (right.score ?? 0) > 0.2) rightVideoPx = { x: right.x, y: right.y };
        if (leftToe && (leftToe.score ?? 0) > 0.2) leftToeVideoPx = { x: leftToe.x, y: leftToe.y };
        if (rightToe && (rightToe.score ?? 0) > 0.2) rightToeVideoPx = { x: rightToe.x, y: rightToe.y };
        if (leftKnee && (leftKnee.score ?? 0) > 0.2) leftKneeVideoPx = { x: leftKnee.x, y: leftKnee.y };
        if (rightKnee && (rightKnee.score ?? 0) > 0.2) rightKneeVideoPx = { x: rightKnee.x, y: rightKnee.y };

        leftVideoPx = smooth(prevLeftVideo, leftVideoPx, POS_ALPHA);
        rightVideoPx = smooth(prevRightVideo, rightVideoPx, POS_ALPHA);
        prevLeftVideo = leftVideoPx;
        prevRightVideo = rightVideoPx;
        if (leftVideoPx) leftPx = toCanvas(leftVideoPx.x, leftVideoPx.y);
        if (rightVideoPx) rightPx = toCanvas(rightVideoPx.x, rightVideoPx.y);
        if (leftToeVideoPx) leftToePx = toCanvas(leftToeVideoPx.x, leftToeVideoPx.y);
        if (rightToeVideoPx) rightToePx = toCanvas(rightToeVideoPx.x, rightToeVideoPx.y);
        if (leftKneeVideoPx) leftKneePx = toCanvas(leftKneeVideoPx.x, leftKneeVideoPx.y);
        if (rightKneeVideoPx) rightKneePx = toCanvas(rightKneeVideoPx.x, rightKneeVideoPx.y);
      }

      // --- START DEBUG DISPLAY ---
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(5, 5, 260, 120);
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      const debug_anchor = targetFoot === 'left' ? leftPx : targetFoot === 'right' ? rightPx : (leftPx || rightPx);
      const debug_detected = !!debug_anchor;
      ctx.fillText(`detected: ${debug_detected}`, 10, 20);
      if (debug_anchor) {
        ctx.fillText(`anchor: ${Math.round(debug_anchor.x)}, ${Math.round(debug_anchor.y)}`, 10, 35);
      } else {
        ctx.fillText(`anchor: null`, 10, 35);
      }
      // Raw video pixel coords (pre-canvas mapping)
      const lraw = leftVideoPx ? `${Math.round(leftVideoPx.x)}, ${Math.round(leftVideoPx.y)}` : 'null';
      const rraw = rightVideoPx ? `${Math.round(rightVideoPx.x)}, ${Math.round(rightVideoPx.y)}` : 'null';
      ctx.fillText(`L raw: ${lraw}`, 10, 50);
      ctx.fillText(`R raw: ${rraw}`, 135, 50);
      if (shoeRef.current) {
        ctx.fillText(`shoe visible: ${shoeRef.current.visible}`, 10, 80);
        ctx.fillText(`shoe pos: ${shoeRef.current.position.x.toFixed(0)}, ${shoeRef.current.position.y.toFixed(0)}`, 10, 95);
      } else {
        ctx.fillText(`shoeRef: null`, 10, 80);
      }
      ctx.fillText(`mode: ${detectMode} • model: ${activeModelType}`, 10, 110);
      ctx.restore();
      // --- END DEBUG DISPLAY ---

      if (targetFoot === 'left') {
        rightPx = null;
      } else if (targetFoot === 'right') {
        leftPx = null;
      }

      // Draw guidance sign if not detected
      const detected = !!leftPx || !!rightPx;
      setFootDetected(detected);
      if (detected) {
        // Reset HUD timer when a foot is detected
        lastDetectTime = performance.now();
      }
      if (!detected) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'white';
        ctx.font = '18px sans-serif';
        const msg = 'Place lower legs in view • step back • good lighting';
        const tw = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvasW - tw) / 2, canvasH * 0.5);
      }

      // Draw ankle markers
      ctx.fillStyle = detected ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)'; // green/red
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      if (leftPx) {
        ctx.beginPath();
        ctx.arc(leftPx.x, leftPx.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (rightPx) {
        ctx.beginPath();
        ctx.arc(rightPx.x, rightPx.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const videoNorm = (p: { x: number; y: number } | null) => p ? { x: p.x / videoW, y: p.y / videoH } : null;
      onDetect({ left: videoNorm(leftVideoPx), right: videoNorm(rightVideoPx) });
      // Rate-limited console log of raw ankle pixels to aid debugging
      {
        const now = performance.now();
        if (now - lastRawLogRef.current > 1000) {
          console.log('ankle raw px', {
            left: leftVideoPx ? { x: Math.round(leftVideoPx.x), y: Math.round(leftVideoPx.y) } : null,
            right: rightVideoPx ? { x: Math.round(rightVideoPx.x), y: Math.round(rightVideoPx.y) } : null,
            canvasSize: { w: canvasW, h: canvasH },
            videoSize: { w: videoW, h: videoH },
            detectMode,
            model: activeModelType,
          });
          lastRawLogRef.current = now;
        }
      }

      // Update 3D shoe overlay position
      if (!(threeRendererRef.current && threeSceneRef.current && threeCameraRef.current && shoeRef.current)) {
        if (!threeReadyWarnedRef.current) {
          console.warn('3D overlay not ready', {
            renderer: !!threeRendererRef.current,
            scene: !!threeSceneRef.current,
            camera: !!threeCameraRef.current,
            shoe: !!shoeRef.current,
          });
          threeReadyWarnedRef.current = true;
        }
      }
      if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current && shoeRef.current) {
        const anchor = targetFoot === 'left' ? leftPx : targetFoot === 'right' ? rightPx : (leftPx || rightPx);
        const toe = targetFoot === 'left' ? leftToePx : targetFoot === 'right' ? rightToePx : (leftToePx || rightToePx);
        const knee = targetFoot === 'left' ? leftKneePx : targetFoot === 'right' ? rightKneePx : (leftKneePx || rightKneePx);
        if (anchor) {
          const model = shoeRef.current;
          // Place EXACTLY at the ankle anchor (green dot), no offsets
          let placeX = anchor.x, placeY = anchor.y;
          const footDir = toe ?? knee ?? anchor;
          lastShoePosRef.current = { x: placeX, y: placeY };

          // Debug anchor/direction overlay (toggle with debugDrawAnchor)
          if (debugDrawAnchor) {
            ctx.save();
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.lineTo(placeX, placeY);
            ctx.stroke();
            ctx.fillStyle = '#00E5FF';
            ctx.fillRect(placeX - 3, placeY - 3, 6, 6);
            ctx.restore();
          }
          // Convert canvas pixel Y (downwards) to Three world Y (upwards)
          const worldY = canvasH - placeY;
          model.position.set(placeX, worldY, 0);
          model.visible = true;
          // Keep scale stable; we already set a unit scale at load/resize
          // Avoid per-frame rescaling which can push model off-screen on some devices

          // Rotation based on best available direction (toe -> knee -> anchor), with light decay
          if (footDir && (footDir !== anchor)) {
            const ang = Math.atan2(footDir.y - anchor.y, footDir.x - anchor.x);
            // Correct angle when video is mirrored so shoe doesn't flip the wrong way
            const corrected = isMirrored ? -ang : ang;
            const blended = lastShoeRotRef.current * 0.7 + corrected * 0.3;
            lastShoeRotRef.current = blended;
            // Only rotate around Z; preserve base X/Y tilt set at load
            model.rotation.z = blended;
          }

          // Shadow follows the shoe
          if (shadowRef.current) {
            shadowRef.current.position.set(placeX, worldY, -0.5);
            shadowRef.current.visible = true;
            const shadowScale = (scale / 1000) * 120;
            shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
          }
        } else {
          shoeRef.current.visible = false;
          if (shadowRef.current) shadowRef.current.visible = false;
        }
        threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current);
      }

      if (showHud) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(10, 10, 320, 24);
        ctx.fillStyle = 'white';
        const since = performance.now() - lastDetectTime;
        const message = detected
          ? (targetFoot === 'left' ? 'Left foot detected' : targetFoot === 'right' ? 'Right foot detected' : 'Foot detected')
          : (since > 2000 ? 'Tips: include lower legs, step back, improve lighting' : 'Foot not detected');
        ctx.fillText(message, 16, 28);
      }
    };

    const startVideo = async () => {
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
        { video: { facingMode: 'environment' }, audio: false },
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];
      let stream: MediaStream | null = null;
      let lastError: any = null;
      for (const c of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          lastError = null; // Clear error on success
          break;
        } catch (e) {
          lastError = e;
          console.warn('getUserMedia failed for constraints', c, e);
        }
      }
      if (lastError) throw lastError; // Throw the actual error from the last attempt
      if (!stream) throw new Error('Unable to access camera'); // Fallback

      videoEl.srcObject = stream;
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      await videoEl.play();
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        await new Promise<void>((resolve) => {
          const onMeta = () => { videoEl.removeEventListener('loadedmetadata', onMeta); resolve(); };
          videoEl.addEventListener('loadedmetadata', onMeta, { once: true });
        });
      }

      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings().facingMode;
      let mirror = facing !== 'environment';
      if (typeof facing === 'undefined') mirror = true; // selfie default if facingMode missing
      setIsMirrored(mirror);
      console.info('[FootTracker] facingMode:', facing, 'isMirrored:', mirror);
      // Style video and canvas; apply consistent zoom via container
      if (!debugDisableZoom) {
        containerEl.style.transform = `scale(${zoomFactor})`;
        containerEl.style.transformOrigin = 'center center';
      } else {
        containerEl.style.transform = '';
        containerEl.style.transformOrigin = '';
      }
      videoEl.style.position = 'absolute';
      videoEl.style.top = '0';
      videoEl.style.left = '0';
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      (videoEl.style as any).objectFit = 'cover';
      // Mirror is applied via JSX style; avoid duplicating transform here
    };

    const init = async () => {
      setCameraError(null);
      try {
        await startVideo();
      } catch (e: any) {
        console.error('getUserMedia error:', e?.name, e?.message, e);
        const canvasW = fullScreen ? window.innerWidth : 320;
        const canvasH = fullScreen ? window.innerHeight : 240;
        canvasEl.width = canvasW;
        canvasEl.height = canvasH;
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        const msg = 'Camera access denied or unavailable';
        ctx.fillText(msg, 16, 30);
        let devicesInfo = '';
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter(d => d.kind === 'videoinput');
          devicesInfo = `Cameras detected: ${cams.length}${cams.length ? '' : ' (none found)'}`;
        } catch {}
        const secureInfo = `Secure context: ${window.isSecureContext ? 'yes' : 'no'}`;
        const errName = e?.name ? `Error: ${e.name}` : '';
        const errMsg = e?.message ? `Message: ${e.message}` : '';
        const reason = (e?.name === 'NotAllowedError' || /denied/i.test(e?.message || ''))
          ? 'Camera permission denied. Check browser/site permissions and OS privacy settings.'
          : (e?.name === 'NotFoundError' ? 'No camera device found.' : 'Unable to access camera. Close other apps using the camera and retry.');
        setCameraError(`${reason}${window.isSecureContext ? '' : ' Note: use HTTPS or localhost for camera access.'}\n${devicesInfo}\n${secureInfo}\n${errName}${errMsg ? `\n${errMsg}` : ''}`);
        setFootDetected(false);
        return;
      }

      await tf.setBackend('webgl');
      await tf.ready();
      // Prefer Thunder for accuracy; allow Lightning fallback when needed
      const mt = accuracy === 'lite'
        ? (poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING)
        : (poseDetection.movenet.modelType.SINGLEPOSE_THUNDER);
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: mt,
        enableSmoothing: true,
      });
      setActiveModelType(mt === poseDetection.movenet.modelType.SINGLEPOSE_THUNDER ? 'THUNDER' : 'LIGHTNING');

      running = true;
      let missCount = 0;
      let avgTime = 0;
      const targetFrameMs = 33; // ~30fps
      const onFrame = async () => {
        if (!running || !detector) return;
        if (!videoEl.videoWidth || !videoEl.videoHeight) {
          scheduleNext();
          return;
        }
        const t0 = performance.now();
        try {
          let poses: poseDetection.Pose[] | null = null;
          if (detectMode === 'full') {
            // Downscale full frame for faster inference; map keypoints back to video space
            const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
            if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
            const dCanvas = offscreenRef.current;
            const maxDim = 256;
            const scale = Math.min(maxDim / vw, maxDim / vh);
            dCanvas.width = Math.max(1, Math.round(vw * scale));
            dCanvas.height = Math.max(1, Math.round(vh * scale));
            const dctx = dCanvas.getContext('2d')!;
            dctx.drawImage(videoEl, 0, 0, dCanvas.width, dCanvas.height);
            poses = await detector.estimatePoses(dCanvas, { flipHorizontal: isMirrored });
            if (poses && poses[0]?.keypoints) {
              poses[0].keypoints = poses[0].keypoints.map(k => ({
                ...k,
                x: (k.x / dCanvas.width) * vw,
                y: (k.y / dCanvas.height) * vh,
              }));
            }
          } else {
            // Bottom-crop fallback when ankles are missed
            const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
            const cropH = Math.floor(vh * 0.7);
            const cropY = vh - cropH;
            const cropX = 0;
            const cropW = vw;
            if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
            const dCanvas = offscreenRef.current;
            dCanvas.width = 224;
            dCanvas.height = 224;
            const dctx = dCanvas.getContext('2d')!;
            dctx.drawImage(videoEl, cropX, cropY, cropW, cropH, 0, 0, dCanvas.width, dCanvas.height);
            poses = await detector.estimatePoses(dCanvas, { flipHorizontal: isMirrored });
            // Convert keypoints from crop-space back to video-space for overlay
            if (poses && poses[0]?.keypoints) {
              poses[0].keypoints = poses[0].keypoints.map(k => ({
                ...k,
                x: cropX + (k.x / dCanvas.width) * cropW,
                y: cropY + (k.y / dCanvas.height) * cropH,
              }));
            }
          }
          drawOverlay(poses || null);
          const first = poses?.[0];
          const hasAnkles = !!first?.keypoints?.find(k => (k.name || (k as any).part) === 'left_ankle' && (k.score ?? 0) > 0.2)
                         || !!first?.keypoints?.find(k => (k.name || (k as any).part) === 'right_ankle' && (k.score ?? 0) > 0.2);
          if (hasAnkles) {
            missCount = 0;
            setDetectMode('full');
          } else {
            missCount++;
            if (missCount >= missThreshold) {
              setDetectMode('crop');
            }
          }
        } catch (err) {
          console.warn('estimatePoses error', err);
        }
        const dt = performance.now() - t0;
        avgTime = avgTime * 0.8 + dt * 0.2;
        // If heavy model is too slow, switch to Lightning once
        if (accuracy !== 'lite' && activeModelType === 'THUNDER' && avgTime > 40) {
          try {
            detector?.dispose();
            const lt = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
            detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
              modelType: lt,
              enableSmoothing: true,
            });
            setActiveModelType('LIGHTNING');
          } catch (e) {
            console.warn('Model switch failed', e);
          }
        }
        scheduleNext();
      };

      const scheduleNext = () => {
        if ('requestVideoFrameCallback' in (videoEl as any)) {
          (videoEl as any).requestVideoFrameCallback(onFrame);
        } else {
          setTimeout(onFrame, targetFrameMs);
        }
      };
      scheduleNext();
    };

    init();

    return () => {
      running = false;
      detector?.dispose();
      const stream = videoEl.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect, fullScreen, targetFoot, accuracy, retryToken]);

  return (
    <>
    <div
      ref={containerRef}
      className={fullScreen ? 'relative w-screen h-screen' : "absolute top-4 right-4 z-10 bg-black/40 text-white rounded overflow-hidden"}
      style={fullScreen ? { position: 'fixed', inset: 0, zIndex: 1 } : undefined}
    >
      <video ref={videoRef} playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: isMirrored ? 'scaleX(-1)' : 'none' }} />
      <canvas
        ref={canvasRef}
        className={fullScreen ? "absolute top-0 left-0 w-screen h-screen pointer-events-none" : "w-[320px] h-[240px]"}
        style={fullScreen ? { display: 'block' } : undefined}
      />
      <canvas
        ref={webglCanvasRef}
        className={fullScreen
          ? "absolute top-0 left-0 w-screen h-screen pointer-events-none"
          : "absolute top-0 left-0 w-[320px] h-[240px] pointer-events-none"}
        style={fullScreen
          ? { display: 'block', zIndex: 10 as any }
          : { display: 'block', zIndex: 10 as any }}
      />
      {cameraError && (
        <div className="fixed inset-x-0 bottom-6 mx-auto w-[92%] max-w-xl z-20 bg-white/95 text-black shadow rounded p-4 space-y-3">
          <div className="font-semibold">Camera access required</div>
          <div className="text-sm whitespace-pre-line">{cameraError}</div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 bg-black text-white rounded"
              onClick={() => setRetryToken((t) => t + 1)}
            >
              Retry camera
            </button>
            <a
              href="https://support.google.com/chrome/answer/114662?hl=en"
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
            >
              How to allow camera
            </a>
          </div>
        </div>
      )}
    </div>
    {/* Fixed viewport detection badge (bottom-center) */}
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 select-none pointer-events-none">
      <span className={`${footDetected ? 'bg-green-500' : 'bg-red-500'} w-3 h-3 rounded-full animate-pulse`} />
      <span className="px-2 py-1 rounded text-xs font-medium bg-black/60 text-white">
        {footDetected ? 'Foot detected' : 'No foot detected'}
      </span>
    </div>
    {shoeLoadError && (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-3 py-2 rounded shadow text-sm">
        {shoeLoadError}
      </div>
    )}
    </>
  );
}