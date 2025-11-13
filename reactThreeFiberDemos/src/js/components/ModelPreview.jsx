import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function Model({ url }){
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
  useFrame(() => { if (ref.current) { ref.current.rotation.y += 0.01 } })
  return (
    <object3D ref={ref}>
      <primitive object={obj} />
    </object3D>
  )
}

export default function ModelPreview({ url }){
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden ring-1 ring-zinc-200/60 bg-white previewRounded" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #e0e7ff 100%)' }}>
      <Canvas
        shadows
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 2] }}
        onCreated={(state) => { state.gl.setClearColor(0x000000, 0) }}
        style={{ background: 'transparent' }}
      >
        <hemisphereLight intensity={0.9} color={0xffffff} groundColor={0x444444} />
        <ambientLight intensity={0.7} />
        <directionalLight castShadow intensity={1.2} position={[2.5, 3, 2.5]} />
        <Suspense fallback={null}>
          <Model url={url} />
        </Suspense>
      </Canvas>
    </div>
  )
}