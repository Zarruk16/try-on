import React, { Suspense, useRef, useState, useEffect } from 'react'
import { Skeleton } from 'antd'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

function Model({ url, autoRotate = true, mode, onReady }){
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const draco = new DRACOLoader()
    draco.setDecoderConfig({ type: 'js' })
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(draco)
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  const ref = useRef()
  useFrame(() => { if (ref.current && autoRotate) { ref.current.rotation.y += 0.01 } })
  useEffect(() => { if (onReady) onReady() }, [onReady])
  const obj = React.useMemo(() => {
    const o = gltf.scene.children?.[0] ? gltf.scene.children[0].clone() : gltf.scene.clone()
    const box = new THREE.Box3().setFromObject(o)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const s = 1.8 / maxDim
    o.scale.setScalar(s)
    o.position.sub(center)
    if (mode === 'wrist') { o.rotation.x = Math.PI / 2; o.rotation.y = 0 } else { o.rotation.x = 0; o.rotation.y = Math.PI / 2 }
    o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; if (n.material && typeof n.material.metalness === 'number') { n.material.metalness = 0; n.material.roughness = 0.8 } } })
    return o
  }, [gltf, mode])
  
  return (
    <object3D ref={ref}>
      <primitive object={obj} />
    </object3D>
  )
}

export default function ModelPreview({ url, autoRotate = true, hero = false, mode }){
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [loadAttempts, setLoadAttempts] = useState(0)
  
  const isWebGLSupported = (() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl') || c.getContext('webgl2'))
    } catch { return false }
  })()
  
  const isMobileDevice = (() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints > 0 && window.innerWidth <= 768)
  })()
  
  const handleModelError = (error) => {
    console.error('ModelPreview error:', error)
    setError(error)
    
    // Retry logic for mobile devices
    if (isMobileDevice && loadAttempts < 2) {
      setTimeout(() => {
        setLoadAttempts(prev => prev + 1)
        setError(null)
        setReady(false)
      }, 1000 * (loadAttempts + 1))
    }
  }
  
  const handleModelReady = () => {
    setReady(true)
    setError(null)
  }
  
  // Mobile-specific canvas optimizations
  const canvasSettings = isMobileDevice ? {
    dpr: [1, 1.5], // Lower max DPR for mobile
    gl: { 
      alpha: true, 
      antialias: false, // Disable antialiasing on mobile for better performance
      powerPreference: 'low-power' // Prefer power efficiency
    }
  } : {
    dpr: [1, 2],
    gl: { alpha: true, antialias: true }
  }
  
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
      {(!ready && !error) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, pointerEvents: 'none' }}>
          <Skeleton active paragraph={false} title style={{ width: '60%' }} />
        </div>
      )}
      
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ color: '#fff', opacity: 0.8, textAlign: 'center' }}>
            {isMobileDevice && loadAttempts < 2 ? (
              <div>
                <div>Retrying...</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Attempt {loadAttempts + 1}/3</div>
              </div>
            ) : (
              <div>Preview unavailable</div>
            )}
          </div>
        </div>
      )}
      
      {isWebGLSupported ? (
        <Canvas
          shadows={!isMobileDevice} // Disable shadows on mobile for performance
          dpr={canvasSettings.dpr}
          gl={canvasSettings.gl}
          camera={{ position: hero ? [0, 0, 4] : [0, 0, 2.6] }}
          onCreated={(state) => { 
            state.gl.setClearColor(0x000000, 0); 
            if ('outputColorSpace' in state.gl) { 
              state.gl.outputColorSpace = THREE.SRGBColorSpace 
            } else if ('outputEncoding' in state.gl) { 
              state.gl.outputColorSpace = 3001 
            }
            // Mobile-specific WebGL optimizations
            if (isMobileDevice) {
              state.gl.getExtension('OES_texture_half_float_linear')
              state.gl.getExtension('OES_texture_float_linear')
            }
          }}
          style={{ background: 'transparent' }}
        >
          <hemisphereLight intensity={hero ? 1.2 : 0.9} color={0xffffff} groundColor={0x444444} />
          <ambientLight intensity={hero ? 0.9 : 0.7} />
          <directionalLight castShadow={!isMobileDevice} intensity={hero ? 1.8 : 1.2} position={[2.5, 3, 2.5]} />
          <pointLight intensity={0.5} position={[-2, 2, 2]} color="#8b5cf6" />
          <pointLight intensity={0.3} position={[2, -1, -2]} color="#3b82f6" />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Model 
                key={`${url}-${loadAttempts}`} // Force re-render on retry
                url={url} 
                autoRotate={autoRotate} 
                mode={mode} 
                onReady={handleModelReady}
                onError={handleModelError}
              />
            </Suspense>
          </ErrorBoundary>
        </Canvas>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#fff', opacity: 0.8 }}>WebGL not available</div>
        </div>
      )}
    </div>
  )
}
class ErrorBoundary extends React.Component {
  constructor(props){ 
    super(props); 
    this.state = { hasError: false }; 
  }
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('ModelPreview ErrorBoundary caught:', error, errorInfo);
  }
  
  render() { 
    return this.state.hasError ? (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', opacity: 0.8 }}>Preview unavailable</div>
      </div>
    ) : this.props.children; 
  }
}
export { ErrorBoundary };
