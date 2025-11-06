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
}

export default function FootTracker({ onDetect, fullScreen = false, targetFoot = 'any', accuracy = 'full' }: FootTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [footDetected, setFootDetected] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    let landmarker: PoseLandmarker | null = null;
    let running = false;

    const drawOverlay = (landmarks: NormalizedLandmark[] | undefined) => {
      const videoW = videoEl.videoWidth;
      const videoH = videoEl.videoHeight;

      // Choose canvas backing size: full screen or compact
      const canvasW = fullScreen ? window.innerWidth : 320;
      const canvasH = fullScreen ? window.innerHeight : 240;
      canvasEl.width = canvasW;
      canvasEl.height = canvasH;

      ctx.clearRect(0, 0, canvasW, canvasH);

      // Compute a center-crop (object-fit: cover) from source video
      const scale = Math.max(canvasW / videoW, canvasH / videoH);
      const srcW = Math.floor(canvasW / scale);
      const srcH = Math.floor(canvasH / scale);
      const sx = Math.max(0, Math.floor((videoW - srcW) / 2));
      const sy = Math.max(0, Math.floor((videoH - srcH) / 2));

      ctx.save();
      ctx.drawImage(videoEl, sx, sy, srcW, srcH, 0, 0, canvasW, canvasH);
      ctx.restore();

      // Helper to map video-space pixels into canvas-space after crop
      const toCanvas = (vx: number, vy: number) => ({
        x: ((vx - sx) * (canvasW / srcW)),
        y: ((vy - sy) * (canvasH / srcH)),
      });

      let leftVideoPx: { x: number; y: number } | null = null;
      let rightVideoPx: { x: number; y: number } | null = null;
      let leftPx: { x: number; y: number } | null = null;
      let rightPx: { x: number; y: number } | null = null;

      if (landmarks && landmarks.length >= 29) {
        const left = landmarks[27];
        const right = landmarks[28];
        if (left) leftVideoPx = { x: left.x * videoW, y: left.y * videoH };
        if (right) rightVideoPx = { x: right.x * videoW, y: right.y * videoH };
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

      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(10, 10, 360, 30);
      ctx.fillStyle = 'white';
      const message = detected
        ? (targetFoot === 'left' ? 'Left foot detected' : targetFoot === 'right' ? 'Right foot detected' : 'Foot detected')
        : (targetFoot === 'left' ? 'Left foot not detected: adjust view' : targetFoot === 'right' ? 'Right foot not detected: adjust view' : 'Foot not detected: adjust view');
      ctx.fillText(message, 16, 30);

      // Guide frame overlay (only for full-screen mode)
      if (fullScreen) {
        const centerX = targetFoot === 'left' ? canvasW * 0.33 : targetFoot === 'right' ? canvasW * 0.67 : canvasW * 0.5;
        const rectW = Math.min(canvasW * 0.5, 360);
        const rectH = Math.min(canvasH * 0.28, 220);
        const marginBottom = Math.min(80, canvasH * 0.1);
        const rectX = Math.max(12, centerX - rectW / 2);
        const rectY = canvasH - rectH - marginBottom;

        // Subtle background tint inside the guide
        ctx.fillStyle = 'rgba(0, 255, 136, 0.12)';
        ctx.fillRect(rectX, rectY, rectW, rectH);

        // Dashed border for the guide frame
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00ff88';
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        ctx.restore();

        // Label text above the guide
        const guideLabel = targetFoot === 'left' ? 'Place LEFT foot here' : targetFoot === 'right' ? 'Place RIGHT foot here' : 'Place foot here';
        ctx.font = '18px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const labelW = Math.min(rectW, 260);
        const labelX = Math.min(Math.max(rectX + (rectW - labelW) / 2, 12), canvasW - labelW - 12);
        const labelY = Math.max(rectY - 36, 48);
        ctx.fillRect(labelX, labelY - 24, labelW, 28);
        ctx.fillStyle = 'white';
        ctx.fillText(guideLabel, labelX + 10, labelY - 6);
      }
    };

    const startVideo = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
    };

    const init = async () => {
      await startVideo();
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            accuracy === 'lite'
              ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
              : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
        },
        runningMode: 'VIDEO',
      });
      running = true;

      const loop = () => {
        if (!running || !landmarker) return;
        const ts = performance.now();
        const res = landmarker.detectForVideo(videoEl, ts);
        const person = res.landmarks?.[0] as NormalizedLandmark[] | undefined;
        drawOverlay(person);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };

    init();

    return () => {
      running = false;
      landmarker?.close();
      const stream = videoEl.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div
      className={fullScreen ? undefined : "absolute top-4 right-4 z-10 bg-black/40 text-white rounded overflow-hidden"}
      style={fullScreen ? { position: 'fixed', inset: 0, zIndex: 1, background: 'black' } : undefined}
    >
      <video ref={videoRef} className="hidden" playsInline />
      <canvas
        ref={canvasRef}
        className={fullScreen ? "w-screen h-screen" : "w-[320px] h-[240px]"}
        style={fullScreen ? { display: 'block' } : undefined}
      />
    </div>
  );
}