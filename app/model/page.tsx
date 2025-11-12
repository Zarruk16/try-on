"use client";
import React from 'react';
import ModelViewer from '../../components/ModelViewer';

export default function ModelPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModelViewer modelPath="/3D%20Models/ballerinaShoe.glb" />
    </div>
  );
}
