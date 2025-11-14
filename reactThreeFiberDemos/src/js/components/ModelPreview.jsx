import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function Model({ url, autoRotate = true }){
  const gltf = useLoader(GLTFLoader, url)
  const obj = gltf.scene.children?.[0] ? gltf.scene.children[0].clone() : gltf.scene.clone()
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3(); box.getSize(size)
  const center = new THREE.Vector3(); box.getCenter(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = 1.8 / maxDim
  obj.scale.setScalar(scale)
  obj.position.sub(center)
  obj.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true
      n.receiveShadow = true
      if (n.material && typeof n.material.metalness === 'number') {
        n.material.metalness = 0
        n.material.roughness = 0.8
      }
    }
  })
  const ref = useRef()
  useFrame(() => { if (ref.current && autoRotate) { ref.current.rotation.y += 0.01 } })
  return (
    <object3D ref={ref}>
      <primitive object={obj} />
    </object3D>
  )
}

export default function ModelPreview({ url, autoRotate = true, hero = false }){
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
        shadows
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: hero ? [0, 0, 4] : [0, 0, 2.6] }}
        onCreated={(state) => { state.gl.setClearColor(0x000000, 0) }}
        style={{ background: 'transparent' }}
      >
        <hemisphereLight intensity={hero ? 1.2 : 0.9} color={0xffffff} groundColor={0x444444} />
        <ambientLight intensity={hero ? 0.9 : 0.7} />
        <directionalLight castShadow intensity={hero ? 1.8 : 1.2} position={[2.5, 3, 2.5]} />
        <pointLight intensity={0.5} position={[-2, 2, 2]} color="#8b5cf6" />
        <pointLight intensity={0.3} position={[2, -1, -2]} color="#3b82f6" />
        <Suspense fallback={null}>
          <Model url={url} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>
    </div>
  )
}