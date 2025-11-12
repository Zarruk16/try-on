'use client';

import { useState, useEffect } from 'react';
import ArScene from '@/components/ArScene';
import FootTracker, { type AnkleCoords } from '@/components/FootTracker';

export default function ARFootDetectionPage() {
  const [ankles, setAnkles] = useState<AnkleCoords>({ left: null, right: null });
  const [arAnchor, setArAnchor] = useState<{ x: number; y: number } | null>(null);
  const [footDetected, setFootDetected] = useState(false);
  const [accuracy] = useState<'lite' | 'full' | 'heavy'>('full');
  const [fullScreen] = useState(true);

  useEffect(() => {}, []);

  useEffect(() => {
    const detected = !!ankles.left || !!ankles.right;
    setFootDetected(detected);
    
    if (detected) {
      const ankle = ankles.left || ankles.right;
      if (ankle) {
        const ndcX = ankle.x * 2 - 1;
        const ndcY = 1 - ankle.y * 2;
        setArAnchor({ x: ndcX, y: ndcY });
      }
    } else {
      setArAnchor(null);
    }
  }, [ankles]);

  

  return (
    <div className="relative w-screen h-screen">
      {/* AR Scene with foot-based placement */}
      <FootTracker onDetect={setAnkles} fullScreen={fullScreen} accuracy={accuracy} showHud={false} engineType={'webarrocks'} targetFPS={24} />

      <ArScene 
        isCameraFlipped={false}
        modelUrl="/3D%20Models/ballerinaShoe.glb"
        placeOnDetection={true}
        anchorHintNDC={arAnchor}
        onSessionChange={(active) => {
          console.log('AR session:', active ? 'started' : 'ended');
        }}
      />

      

      
    </div>
  );
}
