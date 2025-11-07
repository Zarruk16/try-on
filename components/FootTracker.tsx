"use client";
import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface AnkleCoords {
  left: { x: number; y: number } | null;
  right: { x: number; y: number } | null;
}

type TargetFoot = 'left' | 'right' | 'any';
interface FootTrackerProps {
  onDetect: (ankles: AnkleCoords) => void;
  fullScreen?: boolean;
  targetFoot?: TargetFoot; // focus detection on one ankle
  accuracy?: 'lite' | 'full'; // choose model size
  showHud?: boolean; // show minimal HUD text overlay
}

export default function FootTracker({ onDetect, fullScreen = false, targetFoot = 'any', accuracy = 'full', showHud = false }: FootTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [footDetected, setFootDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false);
  useEffect(() => {
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    let landmarker: PoseLandmarker | null = null;
    let running = false;
    let lastCanvasW = 0;
    let lastCanvasH = 0;
    let prevLeftVideo: { x: number; y: number } | null = null;
    let prevRightVideo: { x: number; y: number } | null = null;
    // use state `isMirrored` for transforms
    const smooth = (prev: { x: number; y: number } | null, curr: { x: number; y: number } | null, alpha = 0.35) => {
      if (!curr) return prev ? { x: prev.x, y: prev.y } : null;
      if (!prev) return curr;
      return { x: prev.x * (1 - alpha) + curr.x * alpha, y: prev.y * (1 - alpha) + curr.y * alpha };
    };

    const drawOverlay = (landmarks: NormalizedLandmark[] | undefined) => {
      const videoW = videoEl.videoWidth;
      const videoH = videoEl.videoHeight;

      // Use actual rendered size of canvas for precision
      const canvasW = fullScreen ? window.innerWidth : 320;
      const canvasH = fullScreen ? window.innerHeight : 240;
      if (canvasW !== lastCanvasW || canvasH !== lastCanvasH) {
        canvasEl.width = canvasW;
        canvasEl.height = canvasH;
        lastCanvasW = canvasW;
        lastCanvasH = canvasH;
      }

      ctx.clearRect(0, 0, canvasW, canvasH);

      // Map landmarks to CSS object-fit: cover geometry
      const scale = Math.max(canvasW / videoW, canvasH / videoH);
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
      let leftPx: { x: number; y: number } | null = null;
      let rightPx: { x: number; y: number } | null = null;

      if (landmarks && landmarks.length >= 29) {
        const left = landmarks[27];
        const right = landmarks[28];
        if (left) leftVideoPx = { x: left.x * videoW, y: left.y * videoH };
        if (right) rightVideoPx = { x: right.x * videoW, y: right.y * videoH };
        // Smooth video-space positions to reduce flicker
        leftVideoPx = smooth(prevLeftVideo, leftVideoPx);
        rightVideoPx = smooth(prevRightVideo, rightVideoPx);
        prevLeftVideo = leftVideoPx;
        prevRightVideo = rightVideoPx;
        if (leftVideoPx) leftPx = toCanvas(leftVideoPx.x, leftVideoPx.y);
        if (rightVideoPx) rightPx = toCanvas(rightVideoPx.x, rightVideoPx.y);
      }

      // Apply target foot filtering
      if (targetFoot === 'left') {
        rightPx = null;
      } else if (targetFoot === 'right') {
        leftPx = null;
      }

      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      if (leftPx) {
        ctx.beginPath();
        ctx.arc(leftPx.x, leftPx.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (rightPx) {
        ctx.beginPath();
        ctx.arc(rightPx.x, rightPx.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const detected = !!leftPx || !!rightPx;
      setFootDetected(detected);
      onDetect({
        left: leftVideoPx ? { x: leftVideoPx.x / videoW, y: leftVideoPx.y / videoH } : null,
        right: rightVideoPx ? { x: rightVideoPx.x / videoW, y: rightVideoPx.y / videoH } : null,
      });

      if (showHud) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(10, 10, 260, 24);
        ctx.fillStyle = 'white';
        const message = detected
          ? (targetFoot === 'left' ? 'Left foot detected' : targetFoot === 'right' ? 'Right foot detected' : 'Foot detected')
          : (targetFoot === 'left' ? 'Left foot not detected' : targetFoot === 'right' ? 'Right foot not detected' : 'Foot not detected');
        ctx.fillText(message, 16, 28);
      }
    };

    const startVideo = async () => {
      const constraintAttempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
        { video: { facingMode: 'environment' }, audio: false },
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];

      let stream: MediaStream | null = null;
      for (const c of constraintAttempts) {
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
      // playsInline attribute is already set in JSX; ensure property for Safari
      (videoEl as any).playsInline = true;
      await videoEl.play();

      // Wait for metadata so videoWidth/Height are available
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        await new Promise<void>((resolve) => {
          const onMeta = () => {
            videoEl.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          videoEl.addEventListener('loadedmetadata', onMeta, { once: true });
        });
      }

      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings().facingMode;
      setIsMirrored(facing !== 'environment');
      // Style the video to fill the screen like AR passthrough
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
        // Log exact error for debugging
        console.error('getUserMedia error:', e?.name, e?.message, e);
        // Gracefully render an error message on the canvas and stop
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
        // Gather diagnostics
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
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      // Try GPU, fall back to CPU if not available
      const baseOptions = {
        modelAssetPath:
          accuracy === 'lite'
            ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
            : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
      } as any;
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { ...baseOptions, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      } catch (err) {
        console.warn('GPU delegate failed, falling back to CPU', err);
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions,
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      }
      running = true;
      const rafLoop = () => {
        if (!running || !landmarker) return;
        const ts = performance.now();
        const res = landmarker.detectForVideo(videoEl, ts);
        const person = res.landmarks?.[0] as NormalizedLandmark[] | undefined;
        drawOverlay(person);
        requestAnimationFrame(rafLoop);
      };

      const rVFC = (videoEl as any).requestVideoFrameCallback as
        | ((cb: (now: number, metadata: { mediaTime: number }) => void) => void)
        | undefined;

      if (typeof rVFC === 'function') {
        const onFrame = (_now: number, metadata: { mediaTime: number }) => {
          if (!running || !landmarker) return;
          if (!videoEl.videoWidth || !videoEl.videoHeight) {
            // Wait until we have dimensions
            rVFC(onFrame);
            return;
          }
          const ts = metadata?.mediaTime ? metadata.mediaTime * 1000 : performance.now();
          const res = landmarker.detectForVideo(videoEl, ts);
          const person = res.landmarks?.[0] as NormalizedLandmark[] | undefined;
          drawOverlay(person);
          rVFC(onFrame);
        };
        rVFC(onFrame);
      } else {
        requestAnimationFrame(rafLoop);
      }
    };

    init();

    return () => {
      running = false;
      landmarker?.close();
      const stream = videoEl.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect, fullScreen, targetFoot, accuracy, retryToken]);

  return (
    <div
      className={fullScreen ? 'relative w-screen h-screen' : "absolute top-4 right-4 z-10 bg-black/40 text-white rounded overflow-hidden"}
      style={fullScreen ? { position: 'fixed', inset: 0, zIndex: 1 } : undefined}
    >
      <video ref={videoRef} playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: isMirrored ? 'scaleX(-1)' : 'none' }} />
      <canvas
        ref={canvasRef}
        className={fullScreen ? "absolute top-0 left-0 w-screen h-screen pointer-events-none" : "w-[320px] h-[240px]"}
        style={fullScreen ? { display: 'block' } : undefined}
      />
      {cameraError && (
        <div className="fixed inset-x-0 bottom-6 mx-auto w-[92%] max-w-xl z-20 bg-white/95 text-black shadow rounded p-4 space-y-3">
          <div className="font-semibold">Camera access required</div>
          <div className="text-sm">{cameraError}</div>
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
  );
}