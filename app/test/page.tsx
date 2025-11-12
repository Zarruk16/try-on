"use client";
import React, { useEffect, useRef, useState } from 'react';
import { computeQuality, type QualityMetrics } from '@/lib/detection/quality';

type Status = { ok: boolean; message?: string };

// Use ambient type from lib/detection/webarrocks.ts to avoid duplicate declaration conflicts

interface WebARRocksHandAPI {
  init: (config: any) => void;
  update: () => void;
  get_LM?: () => number[] | null;
  get_LMLabels?: () => string[] | null;
}

export default function TestPage() {
  const [scriptStatus, setScriptStatus] = useState<Status>({ ok: false });
  const [sdkPresent, setSdkPresent] = useState<boolean>(false);
  const [nnStatus, setNnStatus] = useState<Status>({ ok: false });
  const [cameraStatus, setCameraStatus] = useState<Status>({ ok: false });
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);
  const [detectInit, setDetectInit] = useState<Status>({ ok: false });
  const [detectResult, setDetectResult] = useState<{ lmCount: number; labels?: string[] } | null>(null);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [pr, setPr] = useState<{ tp: number; fp: number; fn: number; precision: number; recall: number } | null>(null);
  const [groundTruthPresent, setGroundTruthPresent] = useState<boolean>(false);
  const [envInfo, setEnvInfo] = useState<Record<string, any>>({});
  const [running, setRunning] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadScript = async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/models/web-ar-rocks/WebARRocksHand.js';
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load SDK script'));
        document.head.appendChild(s);
      });
      setScriptStatus({ ok: true, message: 'SDK script loaded' });
      setSdkPresent(!!window.WEBARROCKSHAND);
    } catch (e: any) {
      setScriptStatus({ ok: false, message: String(e?.message || e) });
      setSdkPresent(!!window.WEBARROCKSHAND);
    }
  };

  const testNNFetch = async () => {
    try {
      const res = await fetch('/models/neuralNets/NN_FOOT_23.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`NN fetch failed: ${res.status}`);
      const json = await res.json();
      const keys = Object.keys(json || {}).slice(0, 6);
      setNnStatus({ ok: true, message: `NN JSON ok; keys: ${keys.join(', ')}` });
    } catch (e: any) {
      setNnStatus({ ok: false, message: String(e?.message || e) });
    }
  };

  const testCamera = async () => {
    try {
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
          console.warn('[test] getUserMedia failed for constraints', c, e);
        }
      }
      if (lastError) throw lastError;
      if (!stream) throw new Error('Unable to access camera');
      const video = videoRef.current!;
      video.srcObject = stream;
      (video as any).playsInline = true;
      video.muted = true;
      await video.play().catch(() => {});
      await new Promise<void>((resolve) => {
        const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); resolve(); };
        video.addEventListener('loadedmetadata', onMeta, { once: true });
      });
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const onCanPlay = () => { video.removeEventListener('canplay', onCanPlay); resolve(); };
          video.addEventListener('canplay', onCanPlay, { once: true });
        });
      }
      const dims = { w: video.videoWidth || 0, h: video.videoHeight || 0 };
      setVideoDims(dims);
      setCameraStatus({ ok: true, message: `Camera ok: ${dims.w}x${dims.h}` });
    } catch (e: any) {
      setCameraStatus({ ok: false, message: String(e?.name || e) });
    }
  };

  const testDetection = async () => {
    try {
      const api = window.WEBARROCKSHAND;
      if (!api) throw new Error('WEBARROCKSHAND not present');
      const canvas = canvasRef.current!;
      canvas.width = 640; canvas.height = 480;
      if (!canvas.id) canvas.id = 'webarrocksTestCanvas';
      const vid = videoRef.current!;
      let initErr: string | false = false;
      await new Promise<void>((resolve) => {
        try {
          api.init({
            canvasId: canvas.id,
            NNsPaths: ['/models/neuralNets/NN_FOOT_23.json'],
            videoSettings: { videoElement: vid },
            maxHandsDetected: 2,
            scanSettings: { threshold: Number(process.env.NEXT_PUBLIC_WEBAR_THRESHOLD || 0.85), thresholdSignal: Number(process.env.NEXT_PUBLIC_WEBAR_THRESHOLD_SIGNAL || 0.2), nDetectsPerLoop: Number(process.env.NEXT_PUBLIC_WEBAR_DETECTS_PER_LOOP || 2) },
            stabilizationSettings: { translationSmoothing: 0.85, rotationSmoothing: 0.85 },
            callbackReady: (errCode: string | false) => { initErr = errCode || false; resolve(); },
            callbackTrack: () => {},
          });
        } catch (e) {
          initErr = String((e as any)?.message || e) as any;
          resolve();
        }
      });
      if (initErr) {
        setDetectInit({ ok: false, message: String(initErr) });
        return;
      }
      setDetectInit({ ok: true, message: 'SDK ready' });
      // Stabilize over a few frames
      let lastLM: number[] | null = null;
      let lastLabels: string[] | null = null;
      for (let i = 0; i < 8; i++) {
        api.update();
        lastLM = api.get_LM?.() || null;
        lastLabels = api.get_LMLabels?.() || null;
      }
      const lm: number[] | null = lastLM;
      const labels: string[] | null = lastLabels;
      const lmCount = lm ? lm.length / 2 : 0;
      setDetectResult({ lmCount, labels: labels || undefined });

      // Compute quality metrics
      const vidDims = { w: videoRef.current?.videoWidth || 640, h: videoRef.current?.videoHeight || 480 };
      if (lm && lm.length >= 2) {
        const keypoints: Array<{ x:number; y:number; name?: string }> = [];
        for (let i = 0; i < lm.length; i += 2) {
          const vx = lm[i];
          const vy = lm[i + 1];
          const xPx = (vx + 1) * 0.5 * vidDims.w;
          const yPx = (1 - (vy + 1) * 0.5) * vidDims.h;
          const kp: { x:number; y:number; name?: string } = { x: xPx, y: yPx };
          if (labels && labels[Math.floor(i/2)]) kp.name = String(labels[Math.floor(i/2)]).toLowerCase();
          keypoints.push(kp);
        }
        const qm = computeQuality(keypoints, vidDims.w, vidDims.h);
        setMetrics(qm);
        console.info('[test] quality', qm);
        setPr(prev => {
          const gt = groundTruthPresent;
          const detected = qm.passed && lmCount > 0;
          const tp = (prev?.tp || 0) + (gt && detected ? 1 : 0);
          const fp = (prev?.fp || 0) + (!gt && detected ? 1 : 0);
          const fn = (prev?.fn || 0) + (gt && !detected ? 1 : 0);
          const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
          const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
          return { tp, fp, fn, precision, recall };
        });
      } else {
        setMetrics(null);
      }
    } catch (e: any) {
      setDetectInit({ ok: false, message: String(e?.message || e) });
    }
  };

  const gatherEnv = () => {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = Boolean(/localhost|127\.0\.0\.1|\[::1\]/.test(window.location.hostname));
    const env = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      https: isHttps,
      localhost: isLocalhost,
      NEXT_PUBLIC_WEBAR_DEBUG: process.env.NEXT_PUBLIC_WEBAR_DEBUG,
      NEXT_PUBLIC_WEBAR_THRESHOLD: process.env.NEXT_PUBLIC_WEBAR_THRESHOLD,
      NEXT_PUBLIC_WEBAR_THRESHOLD_SIGNAL: process.env.NEXT_PUBLIC_WEBAR_THRESHOLD_SIGNAL,
      NEXT_PUBLIC_WEBAR_DETECTS_PER_LOOP: process.env.NEXT_PUBLIC_WEBAR_DETECTS_PER_LOOP,
      NEXT_PUBLIC_WEBAR_MAX_HANDS: process.env.NEXT_PUBLIC_WEBAR_MAX_HANDS,
    } as Record<string, any>;
    setEnvInfo(env);
  };

  const stopTest = () => {
    setRunning(false);
  };

  useEffect(() => {
    gatherEnv();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">WebAR.rocks Foot Detection Test</h1>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-xl font-semibold mb-3">Test Controls</h2>
          <div className="flex gap-3 mb-4">
            <button
              onClick={loadScript}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={running}
            >
              Load SDK Script
            </button>
            <button
              onClick={testNNFetch}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={running}
            >
              Test NN Fetch
            </button>
            <button
              onClick={testCamera}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={running}
            >
              Test Camera
            </button>
            <button
              onClick={testDetection}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={running || !cameraStatus.ok}
            >
              Test Detection
            </button>
            {running && (
              <button
                onClick={stopTest}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop Test
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">Script Status</h3>
            <div className={`flex items-center gap-2 ${scriptStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${scriptStatus.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{scriptStatus.message || (scriptStatus.ok ? 'Loaded' : 'Failed')}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">SDK Present</h3>
            <div className={`flex items-center gap-2 ${sdkPresent ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${sdkPresent ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{sdkPresent ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">NN Status</h3>
            <div className={`flex items-center gap-2 ${nnStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${nnStatus.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{nnStatus.message || (nnStatus.ok ? 'Ready' : 'Failed')}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">Camera Status</h3>
            <div className={`flex items-center gap-2 ${cameraStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${cameraStatus.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{cameraStatus.message || (cameraStatus.ok ? 'Ready' : 'Failed')}</span>
            </div>
          </div>
        </div>

        {/* Video and Canvas */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-xl font-semibold mb-3">Live Detection</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Camera Feed</h3>
              <video
                ref={videoRef}
                className="w-full max-w-md border rounded"
                playsInline
                muted
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Detection Canvas</h3>
              <canvas
                ref={canvasRef}
                className="w-full max-w-md border rounded"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {detectResult && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-xl font-semibold mb-3">Detection Results</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Landmarks:</strong> {detectResult.lmCount}</p>
                {detectResult.labels && <p><strong>Labels:</strong> {detectResult.labels.join(', ')}</p>}
              </div>
              {metrics && (
                <div>
                  <p><strong>Quality:</strong> {metrics.passed ? 'Passed' : 'Failed'}</p>
                  <p><strong>Area Ratio:</strong> {metrics.bboxAreaRatio.toFixed(4)}</p>
                  <p><strong>Toe Distance:</strong> {metrics.toeDistRatio.toFixed(3)}</p>
                </div>
              )}
            </div>
            {pr && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>True Positives:</strong> {pr.tp}</p>
                    <p><strong>False Positives:</strong> {pr.fp}</p>
                    <p><strong>False Negatives:</strong> {pr.fn}</p>
                  </div>
                  <div>
                    <p><strong>Precision:</strong> {pr.precision.toFixed(3)}</p>
                    <p><strong>Recall:</strong> {pr.recall.toFixed(3)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Environment Info</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(envInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
