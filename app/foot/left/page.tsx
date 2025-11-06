'use client';

import { useState } from 'react';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function LeftFootPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  const detected = !!ankles.left;
  return (
    <main className="w-screen h-screen">
      <FootTracker onDetect={setAnkles} fullScreen targetFoot="left" accuracy="full" />
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
        {!detected && (
          <div className="bg-yellow-500 text-black px-4 py-2 rounded shadow">Left foot not detected</div>
        )}
        {detected && (
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow">Left foot detected</div>
        )}
      </div>
    </main>
  );
}