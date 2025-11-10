"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrthographicCamera } from '@react-three/drei';

type Vec2 = { x: number; y: number };
type ShoeKind = 'left' | 'right' | 'single';

function Shoe({
  canvasW,
  canvasH,
  shoeKind,
  anchor,
  toe,
  knee,
  mirrored,
}: {
  canvasW: number;
  canvasH: number;
  shoeKind: ShoeKind;
  anchor: Vec2 | null;
  toe: Vec2 | null;
  knee: Vec2 | null;
  mirrored: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const previousRootRef = useRef<THREE.Object3D | null>(null);
  const longestRef = useRef<number>(1);
  const scaleRef = useRef<number>(1);
  const rotZRef = useRef<number>(0);
  const yawDeg = typeof process !== 'undefined' ? Number(process.env.NEXT_PUBLIC_SHOE_YAW_DEG || 0) : 0;
  const yawRad = (yawDeg * Math.PI) / 180;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { preload, getModel } = await import('./models/registry');
      await preload(shoeKind);
      const model = await getModel(shoeKind);
      // Center model so the group's origin represents its pivot
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z) || 1;
      longestRef.current = longest;
      // Base pixel-relative scale
      const basePx = Math.min(canvasW, canvasH) * 0.12;
      const unitScale = basePx / longest;
      scaleRef.current = unitScale;
      if (!mounted) return;
      // Dispose previous cloned model if any
      if (previousRootRef.current) {
        previousRootRef.current.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => m?.dispose?.());
            } else {
              obj.material?.dispose?.();
            }
          }
        });
      }
      setRoot(model);
      previousRootRef.current = model;
      if (groupRef.current) {
        groupRef.current.scale.setScalar(unitScale);
        // Base tilt so shoe lies on screen plane and faces camera
        groupRef.current.rotation.set(Math.PI / 2, 0, 0);
      }
    })();
    return () => {
      mounted = false;
      // Cleanup cloned model resources
      const current = previousRootRef.current;
      if (current) {
        current.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => m?.dispose?.());
            } else {
              obj.material?.dispose?.();
            }
          }
        });
      }
    };
  }, [shoeKind, canvasW, canvasH]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (!anchor) {
      g.visible = false;
      return;
    }
    // Foot size calibration: infer foot length and smooth scale
    let footLengthPx = 0;
    if (toe) {
      footLengthPx = Math.hypot(toe.x - anchor.x, toe.y - anchor.y);
    } else if (knee) {
      const lowerLeg = Math.hypot(knee.x - anchor.x, knee.y - anchor.y);
      footLengthPx = lowerLeg * 0.42;
    } else {
      footLengthPx = Math.min(canvasW, canvasH) * 0.12;
    }
    footLengthPx = Math.max(40, Math.min(footLengthPx, Math.min(canvasW, canvasH) * 0.35));
    const desiredScale = footLengthPx / (longestRef.current || 1);
    const prev = scaleRef.current || desiredScale;
    const smoothScale = prev * 0.85 + desiredScale * 0.15;
    scaleRef.current = smoothScale;
    g.scale.setScalar(smoothScale);

    const placeX = anchor.x;
    const placeY = anchor.y;
    const worldY = canvasH - placeY;
    g.position.set(placeX, worldY, 0);
    g.visible = true;

    const footDir = toe ?? knee ?? anchor;
    if (footDir && footDir !== anchor) {
      const ang = Math.atan2(footDir.y - anchor.y, footDir.x - anchor.x);
      const corrected = mirrored ? -ang : ang;
      const blended = rotZRef.current * 0.7 + corrected * 0.3;
      rotZRef.current = blended;
      g.rotation.z = blended + yawRad;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {root && <primitive object={root} />}
      {/* Simple shadow blob */}
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

export default function FootOverlayR3F({
  canvasW,
  canvasH,
  shoeKind,
  anchor,
  toe,
  knee,
  mirrored,
}: {
  canvasW: number;
  canvasH: number;
  shoeKind: ShoeKind;
  anchor: Vec2 | null;
  toe: Vec2 | null;
  knee: Vec2 | null;
  mirrored: boolean;
}) {
  // Keep a stable key when size changes to force camera update
  const key = useMemo(() => `${canvasW}x${canvasH}`, [canvasW, canvasH]);
  return (
    <Canvas
      key={key}
      orthographic
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // Ensure WebGL clear is fully transparent so underlying HTML video shows
        gl.setClearColor(0x000000, 0);
        // Handle WebGL context loss/restored to avoid hard crashes
        const canvas = gl.domElement as HTMLCanvasElement;
        const onLost = (e: Event) => {
          console.warn('[FootOverlayR3F] WebGL context lost');
          e.preventDefault();
        };
        const onRestored = () => {
          console.warn('[FootOverlayR3F] WebGL context restored');
        };
        canvas.addEventListener('webglcontextlost', onLost, false);
        canvas.addEventListener('webglcontextrestored', onRestored, false);
        // Return cleanup for R3F onCreated
        (gl as any).__foot_overlay_cleanup__ = () => {
          canvas.removeEventListener('webglcontextlost', onLost);
          canvas.removeEventListener('webglcontextrestored', onRestored);
        };
      }}
      dpr={1}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent' }}
    >
      {/** transparent background to let HTML video show underneath; no scene background */}
      {/* Lighting */}
      <ambientLight args={[0xffffff, 1.2]} />
      <directionalLight position={[0, 0, 10]} args={[0xffffff, 0.8]} />

      {/* Orthographic camera in pixel space */}
      <OrthographicCamera
        makeDefault
        left={0}
        right={canvasW}
        top={canvasH}
        bottom={0}
        near={-1000}
        far={1000}
        position={[canvasW / 2, canvasH / 2, 10]}
      />

      <Shoe
        canvasW={canvasW}
        canvasH={canvasH}
        shoeKind={shoeKind}
        anchor={anchor}
        toe={toe}
        knee={knee}
        mirrored={mirrored}
      />
    </Canvas>
  );
}