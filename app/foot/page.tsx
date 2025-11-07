'use client';

import { useState } from 'react';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function FootPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  const footDetected = !!ankles.left || !!ankles.right;

  return (
    <main className="w-screen h-screen">
      <FootTracker onDetect={setAnkles} fullScreen accuracy="heavy" showHud />
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
    </main>
  );
}