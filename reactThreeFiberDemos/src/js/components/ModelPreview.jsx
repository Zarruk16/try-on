import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function FitGLTF({ url, mode = 'foot', autoRotate = true }){
  const group = useRef()
  const gltf = useLoader(GLTFLoader, url)

  useFrame(() => {
    if (group.current && autoRotate) {
      group.current.rotation.y += 0.01
    }
  })

  const scene = gltf.scene.children?.[0] ? gltf.scene.children[0].clone() : gltf.scene.clone()
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3(); box.getSize(size)
  const center = new THREE.Vector3(); box.getCenter(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = 1.6 / maxDim
  scene.scale.setScalar(scale)
  scene.position.sub(center)
  if (mode === 'wrist') {
    scene.rotation.x = Math.PI / 2
  } else {
    scene.rotation.y = Math.PI / 2
  }
  scene.traverse(n => {
    if (n.isMesh && n.material && typeof n.material.metalness === 'number') {
      n.material.metalness = 0
      n.material.roughness = 0.8
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

export default function ModelPreview({ url, autoRotate = true, hero = false, mode }){
  const isMobile = (navigator.maxTouchPoints > 0 && window.innerWidth <= 768)

  return (
    <div
      className="previewRounded"
      style={{
        position: 'relative',
        width: '100%',
        height: hero ? 384 : 192,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: 12
      }}
    >
      <Canvas
        dpr={isMobile ? [1, 1.25] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: hero ? [0, 0, 4] : [0, 0, 2.4] }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.2} position={[2.5, 3, 2.5]} />
        <Suspense fallback={null}>
          <FitGLTF url={url} mode={mode} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>
    </div>
  )
}