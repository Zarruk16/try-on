'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchB2Models, type B2ModelItem } from '@/lib/b2';

// Dynamically import the AR scene component to avoid SSR issues
const ArScene = dynamic(() => import('@/components/ArScene'), {
  ssr: false,
});

export default function Home() {
  const [isCameraFlipped, setIsCameraFlipped] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | undefined>(undefined);
  const [b2Models, setB2Models] = useState<B2ModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadB2 = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchB2Models();
        setB2Models(items);
        if (!modelUrl && items.length > 0) {
          setModelUrl(items[0].url);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load Backblaze models');
      } finally {
        setLoading(false);
      }
    };
    loadB2();
  }, []);

  return (
    <main className="relative w-full h-screen">
      <ArScene isCameraFlipped={isCameraFlipped} modelUrl={modelUrl} />

      {/* Camera toggle */}
      <button
        onClick={() => setIsCameraFlipped(!isCameraFlipped)}
        className="absolute bottom-4 right-4 bg-white/80 hover:bg-white text-black px-4 py-2 rounded-full shadow-lg z-10"
      >
        {isCameraFlipped ? 'Front Camera' : 'Back Camera'}
      </button>

      {/* Backblaze B2 model list */}
      <div className="absolute top-4 left-4 bg-white/85 text-black p-4 rounded-md shadow z-10 w-[360px] space-y-3">
        <div className="font-semibold">Backblaze B2 Bucket Models</div>
        {loading && <div className="text-sm">Loading…</div>}
        {error && <div className="text-sm text-red-700">{error}</div>}
        <div className="max-h-56 overflow-auto border rounded">
          {b2Models.length === 0 ? (
            <div className="p-2 text-sm text-gray-600">No .glb assets found</div>
          ) : (
            b2Models.map((m) => (
              <button
                key={m.key}
                onClick={() => setModelUrl(m.url)}
                className={`w-full text-left p-2 border-b hover:bg-gray-100 ${modelUrl === m.url ? 'bg-gray-200' : ''}`}
                title={m.key}
              >
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-gray-600 truncate">{m.key}</div>
              </button>
            ))
          )}
        </div>
        <div className="text-xs text-gray-600">
          Models are presigned for temporary access. Refresh if expired.
        </div>
      </div>
    </main>
  );
}
