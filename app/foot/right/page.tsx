'use client';

import { useState } from 'react';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function RightFootPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  return (
    <main className="relative w-screen h-screen">
      <FootTracker onDetect={setAnkles} fullScreen targetFoot="right" accuracy="heavy" showHud />
    </main>
  );
}