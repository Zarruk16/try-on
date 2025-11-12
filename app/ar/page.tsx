'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchB2Models, type B2ModelItem } from '@/lib/b2';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

const ArScene = dynamic(() => import('@/components/ArScene'), { ssr: false });

export default function ARPage() {
  const [modelUrl, setModelUrl] = useState<string | undefined>(undefined);
  const [b2Models, setB2Models] = useState<B2ModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isARActive, setIsARActive] = useState(false);
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  // Convert normalized video coordinates to NDC for hinting (-1..1)
  const hintNDC = (() => {
    const p = ankles.left || ankles.right;
    if (!p) return null;
    const x = p.x * 2 - 1;
    const y = 1 - p.y * 2;
    return { x, y };
  })();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchB2Models();
        setB2Models(items);
        if (!modelUrl && items.length > 0) {
          setModelUrl(items[0].proxyUrl || items[0].url);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load models');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="relative w-screen h-screen">
      {/* Pre-AR detection camera to provide ankle hint for initial placement */}
      {!isARActive && (
        <div className="absolute top-0 left-0 w-full h-full">
          <FootTracker onDetect={setAnkles} fullScreen accuracy="full" showHud={false} engineType="webarrocks" />
        </div>
      )}
      <ArScene modelUrl={modelUrl} onSessionChange={setIsARActive} placeOnDetection anchorHintNDC={hintNDC} />

      {!isARActive && (
        <div className="absolute top-4 left-4 bg-white/85 text-black p-4 rounded-md shadow z-10 w-[360px] space-y-3">
          <div className="font-semibold">Select Model</div>
          {loading && <div className="text-sm">Loading…</div>}
          {error && <div className="text-sm text-red-700">{error}</div>}
          <div className="max-h-56 overflow-auto border rounded">
            {b2Models.length === 0 ? (
              <div className="p-2 text-sm text-gray-600">No .glb assets found</div>
            ) : (
              b2Models.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setModelUrl(m.proxyUrl || m.url)}
                  className={`w-full text-left p-2 border-b hover:bg-gray-100 ${modelUrl === (m.proxyUrl || m.url) ? 'bg-gray-200' : ''}`}
                  title={m.key}
                >
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-gray-600 truncate">{m.key}</div>
                </button>
              ))
            )}
          </div>
          <div className="text-xs text-gray-600">Models load via a secure proxy to avoid mobile CORS issues.</div>
        </div>
      )}
    </main>
  );
}
