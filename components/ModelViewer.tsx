"use client";
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';

function Model({ modelPath }: { modelPath: string }) {
  const gltf = useGLTF(modelPath);
  return <primitive object={(gltf as any).scene} scale={1} />;
}

export default function ModelViewer({ modelPath }: { modelPath: string }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5}>
          <Model modelPath={modelPath} />
        </Stage>
        <OrbitControls enableZoom enablePan />
      </Suspense>
    </Canvas>
  );
}

// Preload convenience for snappy UX when the page loads
// (optional; not strictly required)
// @ts-ignore
useGLTF.preload?.('/model/ballerinaShoe.glb');