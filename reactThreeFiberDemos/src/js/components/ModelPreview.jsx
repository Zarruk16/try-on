import React, { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Html } from '@react-three/drei'

// Fallback loader
function Loader() {
  return (
    <Html center>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    </Html>
  )
}

// Error boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError = () => ({ hasError: true })
  componentDidCatch = (error, info) => console.error(error, info)
  render = () => this.state.hasError ? (
    <Html center>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Could not load model
      </div>
    </Html>
  ) : this.props.children
}

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
  useLoader.preload(GLTFLoader, url)
  const isMobile = (navigator.maxTouchPoints > 0 && window.innerWidth <= 768)

  return (
    <div
      className="previewRounded"
      style={{
        position: 'relative',
        width: '100%',
        height: hero ? 384 : 192,
        overflow: 'hidden',
        background: 'linear-gradient(-135deg, #FFFFFF 0%, #B3E1FF 50%,  #2b4acb 100%)',
        // opacity: 0.49,
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
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <FitGLTF url={url} mode={mode} autoRotate={autoRotate} />
          </Suspense>
        </ErrorBoundary>
      </Canvas>
    </div>
  )
}