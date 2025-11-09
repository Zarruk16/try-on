"use client";
import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  const missThreshold = 6; // frames before switching to crop mode
  const [detectMode, setDetectMode] = useState<'full' | 'crop'>('full');
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const shoeRef = useRef<THREE.Group | null>(null);
  const shadowRef = useRef<THREE.Mesh | null>(null);
  const [shoeLoadError, setShoeLoadError] = useState<string | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    const containerEl = containerRef.current!;
    const ctx = canvasEl.getContext('2d')!;

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

          // Load shoe model
          const loader = new GLTFLoader();
          const url = targetFoot === 'left'
            ? '/model/left-foot-sneaker.glb'
            : targetFoot === 'right'
              ? '/model/right-foot-sneaker.glb'
              : '/model/sneaker.glb';
          loader.load(url, (gltf) => {
            const wrapper = new THREE.Group();
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            wrapper.add(model);
            // Initial orientation: lay flat on screen plane
            wrapper.rotation.set(Math.PI / 2, 0, 0);
            // Base scale tuned for typical phone view
            const baseScale = Math.min(canvasW, canvasH) * 0.12;
            wrapper.scale.setScalar(baseScale / 1000);
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
          }, undefined, (err) => {
            console.error('GLB load error', err);
            setShoeLoadError('Failed to load shoe model');
          });
        } else {
          threeRendererRef.current.setSize(canvasW, canvasH);
          if (threeCameraRef.current) {
            threeCameraRef.current.left = 0;
            threeCameraRef.current.right = canvasW;
            threeCameraRef.current.top = 0;
            threeCameraRef.current.bottom = canvasH;
            threeCameraRef.current.updateProjectionMatrix();
            threeCameraRef.current.position.set(canvasW / 2, canvasH / 2, 10);
          }
        }
      }

      ctx.clearRect(0, 0, canvasW, canvasH);

      const coverScale = Math.max(canvasW / videoW, canvasH / videoH);
      const scale = coverScale * zoomFactor;
      const dispW = videoW * scale;
      const dispH = videoH * scale;
      const dx = (canvasW - dispW) / 2;
      const dy = (canvasH - dispH) / 2;

      const toCanvas = (vx: number, vy: number) => {
        let x = dx + vx * scale;
        const y = dy + vy * scale;
        if (isMirrored) x = canvasW - x;
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

        leftVideoPx = smooth(prevLeftVideo, leftVideoPx);
        rightVideoPx = smooth(prevRightVideo, rightVideoPx);
        prevLeftVideo = leftVideoPx;
        prevRightVideo = rightVideoPx;
        if (leftVideoPx) leftPx = toCanvas(leftVideoPx.x, leftVideoPx.y);
        if (rightVideoPx) rightPx = toCanvas(rightVideoPx.x, rightVideoPx.y);
        if (leftToeVideoPx) leftToePx = toCanvas(leftToeVideoPx.x, leftToeVideoPx.y);
        if (rightToeVideoPx) rightToePx = toCanvas(rightToeVideoPx.x, rightToeVideoPx.y);
        if (leftKneeVideoPx) leftKneePx = toCanvas(leftKneeVideoPx.x, leftKneeVideoPx.y);
        if (rightKneeVideoPx) rightKneePx = toCanvas(rightKneeVideoPx.x, rightKneeVideoPx.y);
      }

      if (targetFoot === 'left') {
        rightPx = null;
      } else if (targetFoot === 'right') {
        leftPx = null;
      }

      // Draw guidance sign if not detected
      const detected = !!leftPx || !!rightPx;
      setFootDetected(detected);
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

      // Update 3D shoe overlay position
      if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current && shoeRef.current) {
        const anchor = targetFoot === 'left' ? leftPx : targetFoot === 'right' ? rightPx : (leftPx || rightPx);
        const toe = targetFoot === 'left' ? leftToePx : targetFoot === 'right' ? rightToePx : (leftToePx || rightToePx);
        const knee = targetFoot === 'left' ? leftKneePx : targetFoot === 'right' ? rightKneePx : (leftKneePx || rightKneePx);
        if (anchor) {
          const model = shoeRef.current;
          // Convert canvas Y to three ortho Y (same orientation since camera top=0, bottom=H)
          model.position.set(anchor.x, anchor.y, 0);
          model.visible = true;
          // Dynamic scale based on ankle-knee distance (fallback to base if missing)
          let scalePx = Math.min(canvasW, canvasH) * 0.12;
          if (knee) {
            const dx = knee.x - anchor.x;
            const dy = knee.y - anchor.y;
            const d = Math.hypot(dx, dy);
            const base = Math.min(canvasW, canvasH) * 0.12; // original base in pixels
            scalePx = Math.max(base * 0.7, Math.min(base * 1.6, d * 0.9));
          }
          model.scale.setScalar(scalePx / 1000);

          // Toe-based rotation for better realism
          if (toe) {
            const ang = Math.atan2(toe.y - anchor.y, toe.x - anchor.x);
            const zRot = isMirrored ? -ang : ang;
            // Keep the initial X-rotation to lay model flat
            model.rotation.set(Math.PI / 2, 0, zRot);
          }

          // Shadow follows the shoe
          if (shadowRef.current) {
            shadowRef.current.position.set(anchor.x, anchor.y, -0.01);
            shadowRef.current.visible = true;
            const s = (scalePx / 1000) * 120;
            shadowRef.current.scale.set(s, s, s);
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
      for (const c of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          console.warn('getUserMedia failed for constraints', c, e);
        }
      }
      if (!stream) throw new Error('Unable to access camera');

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
      setIsMirrored(facing !== 'environment');
      // Style video and canvas; apply consistent zoom via container
      containerEl.style.transform = `scale(${zoomFactor})`;
      containerEl.style.transformOrigin = 'center center';
      videoEl.style.position = 'absolute';
      videoEl.style.top = '0';
      videoEl.style.left = '0';
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      (videoEl.style as any).objectFit = 'cover';
      videoEl.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
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
      // Prefer Thunder for accuracy; allow MultiPose Lightning fallback when needed
      const mt = accuracy === 'lite'
        ? (poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING)
        : (poseDetection.movenet.modelType.SINGLEPOSE_THUNDER);
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: mt,
        enableSmoothing: true,
      });

      running = true;
      let missCount = 0;
      const loop = async () => {
        if (!running || !detector) return;
        if (!videoEl.videoWidth || !videoEl.videoHeight) {
          requestAnimationFrame(loop);
          return;
        }
        try {
          let poses: poseDetection.Pose[] | null = null;
          if (detectMode === 'full') {
            poses = await detector.estimatePoses(videoEl, { flipHorizontal: isMirrored });
          } else {
            // Bottom-crop fallback when ankles are missed
            const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
            const cropH = Math.floor(vh * 0.7);
            const cropY = vh - cropH;
            const cropX = 0;
            const cropW = vw;
            if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
            const dCanvas = offscreenRef.current;
            dCanvas.width = 256;
            dCanvas.height = 256;
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
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
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
        className={fullScreen ? "absolute top-0 left-0 w-screen h-screen pointer-events-none" : "hidden"}
        style={fullScreen ? { display: 'block' } : undefined}
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