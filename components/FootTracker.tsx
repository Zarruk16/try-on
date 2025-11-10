"use client";
import { useEffect, useRef, useState } from 'react';
import FootOverlayR3F from './FootOverlayR3F';
import { createFootDetectionManager } from '@/lib/detection/manager';
import type { AccuracyPreset, PoseResult } from '@/lib/detection/types';

export type Vec2 = { x: number; y: number };
export type AnkleCoords = { left: { x: number; y: number } | null; right: { x: number; y: number } | null };

interface FootTrackerProps {
  onDetect?: (ankles: AnkleCoords) => void;
  fullScreen?: boolean;
  targetFoot?: 'left' | 'right' | 'any';
  accuracy?: AccuracyPreset;
  showHud?: boolean;
  shoeKind?: 'left' | 'right' | 'single';
}

export default function FootTracker({ onDetect, fullScreen = false, targetFoot = 'any', accuracy = 'full', showHud = false, shoeKind }: FootTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canvasW, setCanvasW] = useState<number>(0);
  const [canvasH, setCanvasH] = useState<number>(0);
  const [anchor, setAnchor] = useState<Vec2 | null>(null);
  const [toe, setToe] = useState<Vec2 | null>(null);
  const [knee, setKnee] = useState<Vec2 | null>(null);
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Choose shoe model based on targetFoot if not provided
  const kind: 'left' | 'right' | 'single' = shoeKind || (targetFoot === 'left' ? 'left' : targetFoot === 'right' ? 'right' : 'single');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let running = true;
    let engine: any = null;

    async function setup() {
      try {
        const constraints: MediaStreamConstraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const vid = videoRef.current!;
        vid.srcObject = stream;
        await vid.play();
        // Mirror if using user-facing camera
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings ? track.getSettings() : {} as any;
        setMirrored(settings.facingMode === 'user');
        const w = (vid as any).videoWidth || vid.clientWidth || 640;
        const h = (vid as any).videoHeight || vid.clientHeight || 480;
        setCanvasW(w);
        setCanvasH(h);

        const mgr = await createFootDetectionManager({ preset: accuracy, preferWebARRocks: true });
        engine = mgr.engine;

        const smooth = (prev: Vec2 | null, next: Vec2): Vec2 => {
          if (!prev) return next;
          return { x: prev.x * 0.7 + next.x * 0.3, y: prev.y * 0.7 + next.y * 0.3 };
        };

        const loop = async () => {
          if (!running) return;
          const v = videoRef.current;
          if (!v) { requestAnimationFrame(loop); return; }
          const res: PoseResult[] | null = await engine.estimate(v, {
            flipHorizontal: mirrored,
            mapToOriginal: { srcW: (v as any).videoWidth || w, srcH: (v as any).videoHeight || h, origW: (v as any).videoWidth || w, origH: (v as any).videoHeight || h },
          });
          if (res && res[0] && res[0].keypoints && res[0].keypoints.length) {
            const kps = res[0].keypoints;
            // Anchor: centroid of keypoints
            const ax = kps.reduce((s, k) => s + (k.x || 0), 0) / kps.length;
            const ay = kps.reduce((s, k) => s + (k.y || 0), 0) / kps.length;
            const a: Vec2 = { x: ax, y: ay };
            // Toe: farthest keypoint from anchor
            let far = a; let dmax = -1;
            for (const k of kps) {
              const d = Math.hypot((k.x || 0) - a.x, (k.y || 0) - a.y);
              if (d > dmax) { dmax = d; far = { x: k.x || a.x, y: k.y || a.y }; }
            }
            const t = far;
            const k = null; // Knee not available from API; leave null
            const sA = smooth(anchor, a);
            const sT = toe ? smooth(toe, t) : t;
            setAnchor(sA);
            setToe(sT);
            setKnee(k);
            if (onDetect && canvasW && canvasH) {
              const norm = (p: Vec2 | null) => p ? ({ x: p.x / canvasW, y: p.y / canvasH }) : null;
              const val: AnkleCoords = targetFoot === 'left'
                ? { left: norm(sA), right: null }
                : targetFoot === 'right'
                  ? { left: null, right: norm(sA) }
                  : { left: norm(sA), right: norm(sA) };
              onDetect(val);
            }
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } catch (e: any) {
        console.error('[FootTracker] setup failed', e);
        setError(e?.message || 'Camera or detection failed');
      }
    }

    setup();

    return () => {
      running = false;
      try { engine && engine.dispose && engine.dispose(); } catch {}
      if (stream) {
        stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      }
    };
  }, [accuracy, targetFoot]);

  const containerStyle: React.CSSProperties = fullScreen
    ? { position: 'fixed', inset: 0 }
    : { position: 'relative', width: '100%', height: '100%' };

  return (
    <div style={containerStyle}>
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {canvasW > 0 && canvasH > 0 && (
        <FootOverlayR3F canvasW={canvasW} canvasH={canvasH} shoeKind={kind} anchor={anchor} toe={toe} knee={knee} mirrored={mirrored} />
      )}
      {showHud && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, fontSize: 12 }}>
          <div>Engine: WebAR.rocks</div>
          <div>Accuracy: {accuracy}</div>
          {error && <div style={{ color: '#f99' }}>Error: {error}</div>}
        </div>
      )}
    </div>
  );
}


