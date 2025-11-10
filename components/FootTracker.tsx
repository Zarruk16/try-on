"use client";
import { useEffect, useRef, useState } from 'react';
import FootOverlayR3F from './FootOverlayR3F';
import { createFootDetectionManager } from '../lib/detection/manager';
import type { FootDetectorEngine, PoseResult } from '../lib/detection/types';

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
  shoeKind?: 'left' | 'right' | 'single';
}

export default function FootTracker({ onDetect, fullScreen = false, targetFoot = 'any', accuracy = 'full', showHud = false, shoeKind }: FootTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [footDetected, setFootDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false);
  const zoomFactor = 1.10;
  const debugDisableZoom = false;
  const [overlaySize, setOverlaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [overlayAnchors, setOverlayAnchors] = useState<{
    anchor: { x: number; y: number } | null;
    toe: { x: number; y: number } | null;
    knee: { x: number; y: number } | null;
  }>({ anchor: null, toe: null, knee: null });
  const lastRawLogRef = useRef(0);
  const [shoeLoadError, setShoeLoadError] = useState<string | null>(null);
  const engineRef = useRef<FootDetectorEngine | null>(null);
  const usingWebARRocksRef = useRef<boolean>(false);

  useEffect(() => {
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    const containerEl = containerRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    let engine: FootDetectorEngine | null = null;
    let running = false;
    let lastCanvasW = 0;
    let lastCanvasH = 0;
    let prevLeftVideo: { x: number; y: number } | null = null;
    let prevRightVideo: { x: number; y: number } | null = null;
    const smooth = (prev: { x: number; y: number } | null, curr: { x: number; y: number } | null, alpha = 0.3) => {
      if (!curr) return prev ? { x: prev.x, y: prev.y } : null;
      if (!prev) return curr;
      return { x: prev.x * (1 - alpha) + curr.x * alpha, y: prev.y * (1 - alpha) + curr.y * alpha };
    };
    let lastDetectTime = performance.now();

    const drawOverlay = (poses: PoseResult[] | null) => {
      const videoW = videoEl.videoWidth;
      const videoH = videoEl.videoHeight;
      const canvasW = fullScreen ? window.innerWidth : 320;
      const canvasH = fullScreen ? window.innerHeight : 240;
      if (canvasW !== lastCanvasW || canvasH !== lastCanvasH) {
        canvasEl.width = canvasW;
        canvasEl.height = canvasH;
        lastCanvasW = canvasW;
        lastCanvasH = canvasH;
        setOverlaySize({ w: canvasW, h: canvasH });
      }

      ctx.clearRect(0, 0, canvasW, canvasH);
      const coverScale = Math.max(canvasW / videoW, canvasH / videoH);
      const scale = coverScale;
      const dispW = videoW * scale;
      const dispH = videoH * scale;
      const dx = (canvasW - dispW) / 2;
      const dy = (canvasH - dispH) / 2;
      const toCanvas = (vx: number, vy: number) => ({ x: dx + vx * scale, y: dy + vy * scale });

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
        const normName = (n: any) => String(n || '').toLowerCase();
        const findKP = (names: string[]) => first.keypoints.find(kp => names.includes(normName((kp as any).name ?? (kp as any).part)));
        const left = findKP(['left_ankle','ankle_left','l_ankle']);
        const right = findKP(['right_ankle','ankle_right','r_ankle']);
        const leftToe = findKP(['left_foot_index','left_toe','toe_left','l_toe']);
        const rightToe = findKP(['right_foot_index','right_toe','toe_right','r_toe']);
        const leftKnee = findKP(['left_knee','knee_left','l_knee']);
        const rightKnee = findKP(['right_knee','knee_right','r_knee']);
        if (left && (left.score ?? 0) > 0.2) leftVideoPx = { x: left.x, y: left.y };
        if (right && (right.score ?? 0) > 0.2) rightVideoPx = { x: right.x, y: right.y };
        if (leftToe && (leftToe.score ?? 0) > 0.2) leftToeVideoPx = { x: leftToe.x, y: leftToe.y };
        if (rightToe && (rightToe.score ?? 0) > 0.2) rightToeVideoPx = { x: rightToe.x, y: rightToe.y };
        if (leftKnee && (leftKnee.score ?? 0) > 0.2) leftKneeVideoPx = { x: leftKnee.x, y: leftKnee.y };
        if (rightKnee && (rightKnee.score ?? 0) > 0.2) rightKneeVideoPx = { x: rightKnee.x, y: rightKnee.y };

        leftVideoPx = smooth(prevLeftVideo, leftVideoPx, 0.3);
        rightVideoPx = smooth(prevRightVideo, rightVideoPx, 0.3);
        prevLeftVideo = leftVideoPx;
        prevRightVideo = rightVideoPx;
        if (leftVideoPx) leftPx = toCanvas(leftVideoPx.x, leftVideoPx.y);
        if (rightVideoPx) rightPx = toCanvas(rightVideoPx.x, rightVideoPx.y);
        if (leftToeVideoPx) leftToePx = toCanvas(leftToeVideoPx.x, leftToeVideoPx.y);
        if (rightToeVideoPx) rightToePx = toCanvas(rightToeVideoPx.x, rightToeVideoPx.y);
        if (leftKneeVideoPx) leftKneePx = toCanvas(leftKneeVideoPx.x, leftKneeVideoPx.y);
        if (rightKneeVideoPx) rightKneePx = toCanvas(rightKneeVideoPx.x, rightKneeVideoPx.y);
      }

      if (targetFoot === 'left') rightPx = null;
      else if (targetFoot === 'right') leftPx = null;

      const detected = !!leftPx || !!rightPx;
      setFootDetected(detected);
      if (detected) lastDetectTime = performance.now();
      if (!detected) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'white';
        ctx.font = '18px sans-serif';
        const msg = 'Place lower legs in view • step back • good lighting';
        const tw = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvasW - tw) / 2, canvasH * 0.5);
      }

      ctx.fillStyle = detected ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      if (leftPx) { ctx.beginPath(); ctx.arc(leftPx.x, leftPx.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      if (rightPx) { ctx.beginPath(); ctx.arc(rightPx.x, rightPx.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

      const videoNorm = (p: { x: number; y: number } | null) => p ? { x: p.x / videoW, y: p.y / videoH } : null;
      onDetect({ left: videoNorm(leftVideoPx), right: videoNorm(rightVideoPx) });

      const now = performance.now();
      if (now - lastRawLogRef.current > 1000) {
        console.log('ankle raw px', {
          left: leftVideoPx ? { x: Math.round(leftVideoPx.x), y: Math.round(leftVideoPx.y) } : null,
          right: rightVideoPx ? { x: Math.round(rightVideoPx.x), y: Math.round(rightVideoPx.y) } : null,
          canvasSize: { w: canvasW, h: canvasH },
          videoSize: { w: videoW, h: videoH },
        });
        lastRawLogRef.current = now;
      }

      const anchor = targetFoot === 'left' ? leftPx : targetFoot === 'right' ? rightPx : (leftPx || rightPx);
      const toe = targetFoot === 'left' ? leftToePx : targetFoot === 'right' ? rightToePx : (leftToePx || rightToePx);
      const knee = targetFoot === 'left' ? leftKneePx : targetFoot === 'right' ? rightKneePx : (leftKneePx || rightKneePx);
      setOverlayAnchors({ anchor: anchor || null, toe: toe || null, knee: knee || null });

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
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          console.warn('getUserMedia failed for constraints', c, e);
        }
      }
      if (lastError) throw lastError;
      if (!stream) throw new Error('Unable to access camera');

      videoEl.srcObject = stream;
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      videoEl.autoplay = true;
      try { await videoEl.play(); } catch { setTimeout(() => { videoEl.play().catch(() => {}); }, 100); }
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        await new Promise<void>((resolve) => {
          const onMeta = () => { videoEl.removeEventListener('loadedmetadata', onMeta); resolve(); };
          videoEl.addEventListener('loadedmetadata', onMeta, { once: true });
        });
      }
      if (videoEl.readyState < 2) {
        await new Promise<void>((resolve) => {
          const onCanPlay = () => { videoEl.removeEventListener('canplay', onCanPlay); resolve(); };
          videoEl.addEventListener('canplay', onCanPlay, { once: true });
        });
      }

      const track = stream.getVideoTracks()[0];
      const facing = track.getSettings().facingMode;
      let mirror = facing !== 'environment';
      if (typeof facing === 'undefined') mirror = true;
      setIsMirrored(mirror);
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

      const initW = fullScreen ? window.innerWidth : 320;
      const initH = fullScreen ? window.innerHeight : 240;
      setOverlaySize({ w: initW, h: initH });
    };

    const init = async () => {
      setCameraError(null);
      try {
        await startVideo();
      } catch (e: any) {
        const canvasW = fullScreen ? window.innerWidth : 320;
        const canvasH = fullScreen ? window.innerHeight : 240;
        canvasEl.width = canvasW;
        canvasEl.height = canvasH;
        setOverlaySize({ w: canvasW, h: canvasH });
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        const msg = 'Camera access denied or unavailable';
        ctx.fillText(msg, 16, 30);
        setCameraError('Unable to access camera. Ensure permissions and HTTPS/localhost.');
        setFootDetected(false);
        return;
      }

      try {
        const { engine: mgrEngine, usingWebARRocks } = await createFootDetectionManager({ preset: accuracy, preferWebARRocks: true });
        engine = mgrEngine;
        engineRef.current = mgrEngine;
        usingWebARRocksRef.current = usingWebARRocks;
      } catch (e: any) {
        console.error('Detection manager init failed:', e);
        setCameraError('WebAR.rocks engine unavailable. Ensure SDK files under /public/webarrocks/foot are accessible, and try reloading.');
        return;
      }

      running = true;
      const targetFrameMs = 33;
      const onFrame = async () => {
        if (!running || !engine) return;
        if (!videoEl.videoWidth || !videoEl.videoHeight) { scheduleNext(); return; }
        try {
          const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
          const poses: PoseResult[] | null = await engine.estimate(videoEl, {
            flipHorizontal: isMirrored,
            mapToOriginal: { srcW: vw, srcH: vh, origW: vw, origH: vh },
          });
          drawOverlay(poses || null);
        } catch (err) {
          console.warn('estimate error', err);
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
      try { engineRef.current?.dispose(); } catch {}
      const stream = videoEl.srcObject as MediaStream | null;
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, [onDetect, fullScreen, targetFoot, accuracy, retryToken]);

  return (
    <>
    <div
      ref={containerRef}
      className={fullScreen ? 'relative w-screen h-screen' : "absolute top-4 right-4 z-10 bg-black/40 text-white rounded overflow-hidden"}
      style={fullScreen ? { position: 'fixed', inset: 0, zIndex: 1 } : undefined}
    >
      <video ref={videoRef} playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: isMirrored ? 'scaleX(-1)' : 'none', backgroundColor: 'transparent', zIndex: 0 }} />
      <canvas
        ref={canvasRef}
        className={fullScreen ? "absolute top-0 left-0 w-screen h-screen pointer-events-none" : "w-[320px] h-[240px]"}
        style={fullScreen ? { display: 'block', zIndex: 1 } : undefined}
      />
      <FootOverlayR3F
        canvasW={overlaySize.w}
        canvasH={overlaySize.h}
        shoeKind={shoeKind ?? (targetFoot === 'left' ? 'left' : (targetFoot === 'right' ? 'right' : 'single'))}
        anchor={overlayAnchors.anchor}
        toe={overlayAnchors.toe}
        knee={overlayAnchors.knee}
        mirrored={isMirrored}
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
