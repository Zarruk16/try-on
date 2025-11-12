'use client';

import { useState } from 'react';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function FootPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  const footDetected = !!ankles.left || !!ankles.right;

  return (
    <main className="w-screen h-screen">
      <FootTracker 
        onDetect={setAnkles} 
        fullScreen 
        accuracy="full" 
        showHud={false} 
        engineType="webarrocks"
      />
      
    </main>
  );
}
