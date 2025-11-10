'use client';

import { useState } from 'react';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function FootPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  const footDetected = !!ankles.left || !!ankles.right;
  const [shoeKind, setShoeKind] = useState<'left' | 'right' | 'single'>('single');

  return (
    <main className="w-screen h-screen">
      <FootTracker onDetect={setAnkles} fullScreen accuracy="heavy" showHud shoeKind={shoeKind} />
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
        {!footDetected && (
          <div className="bg-yellow-500 text-black px-4 py-2 rounded shadow">
            Foot not detected. Adjust camera angle or distance.
          </div>
        )}
        {footDetected && (
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow">
            Foot detected.
          </div>
        )}
      </div>
      <div className="fixed bottom-4 right-4 z-10 bg-black/60 text-white rounded shadow p-2 flex gap-2">
        <button className={`px-2 py-1 rounded ${shoeKind==='left'?'bg-white text-black':'bg-white/20'}`} onClick={()=>setShoeKind('left')}>Left shoe</button>
        <button className={`px-2 py-1 rounded ${shoeKind==='right'?'bg-white text-black':'bg-white/20'}`} onClick={()=>setShoeKind('right')}>Right shoe</button>
        <button className={`px-2 py-1 rounded ${shoeKind==='single'?'bg-white text-black':'bg-white/20'}`} onClick={()=>setShoeKind('single')}>Single shoe</button>
      </div>
    </main>
  );
}