import { useEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { ACESFilmicToneMapping, Mesh, MeshNormalMaterial, CylinderGeometry, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLocation, useParams } from 'react-router-dom'

import BackButton from '../components/BackButton'
import FlipCamButton from '../components/FlipCamButton'
import { Alert } from 'antd'
import { findModelById } from '../models/config'
import GLTFModelEmpty from '../../assets/VTO/empty.glb'
import GLTFOccluderFoot from '../../assets/bareFootVTO/occluder.glb'

import NNWrist from '../contrib/WebARRocksHand/neuralNets/NN_WRIST_27.json'
import NNFoot from '../contrib/WebARRocksHand/neuralNets/NN_BAREFOOT_3.json'
import VTOThreeHelper from '../contrib/WebARRocksHand/helpers/HandTrackerThreeHelper.js'
import PoseFlipFilter from '../contrib/WebARRocksHand/helpers/PoseFlipFilter.js'
import Stabilizer from '../contrib/WebARRocksHand/helpers/landmarksStabilizers/OneEuroLMStabilizer.js'

const ThreeGrabber = (props) => {
  const threeFiber = useThree()
  const threeRenderer = threeFiber.gl
  threeRenderer.toneMapping = ACESFilmicToneMapping
  useFrame(VTOThreeHelper.update_threeCamera.bind(null, props.sizing, threeFiber.camera))
  return null
}

const compute_sizing = () => {
  const height = window.innerHeight
  const wWidth = window.innerWidth
  const width = Math.min(wWidth, height)
  const top = 0
  const left = (wWidth - width ) / 2
  return {width, height, top, left}
}

const create_softOccluder = (occluder) => {
  const occluderRadius = occluder.radiusRange[1]
  const occluderMesh = new Mesh(
    new CylinderGeometry(occluderRadius, occluderRadius, occluder.height, 32, 1, true),
    new MeshNormalMaterial()
  )
  const dr = occluder.radiusRange[1] - occluder.radiusRange[0]
  occluderMesh.position.fromArray(occluder.offset)
  occluderMesh.quaternion.fromArray(occluder.quaternion)
  occluderMesh.userData = { isOccluder: true, isSoftOccluder: true, softOccluderRadius: occluderRadius, softOccluderDr: dr }
  return occluderMesh
}

const VTOModelContainer = (props) => {
  const objRef = useRef()
  useEffect(() => {
    const threeObject3DParent = objRef.current
    const threeObject3D = threeObject3DParent.children[0]
    VTOThreeHelper.set_handRightFollower(threeObject3DParent, threeObject3D)
  })

  const gltf = useLoader(GLTFLoader, props.GLTFModel)
  const occluderAsset = (props.occluder.type === 'MODEL') ? (props.occluder.model) : GLTFModelEmpty
  const gltfOccluder = useLoader(GLTFLoader, occluderAsset)
  const modelScene = gltf.scene.children?.[0] ? gltf.scene.children[0].clone() : gltf.scene.clone()
  if (modelScene.material){ modelScene.material.metalness = 0 }

  if (props.pose.scale){ const s = props.pose.scale; modelScene.scale.set(s, s, s) }
  if (props.pose.translation){ modelScene.position.add(new Vector3().fromArray(props.pose.translation)) }
  if (props.pose.quaternion){ modelScene.quaternion.fromArray(props.pose.quaternion) }

  let occluderModel = null
  let softOccluderModel = null
  if (props.occluder.type === 'SOFTCYLINDER'){
    softOccluderModel = create_softOccluder(props.occluder)
  } else if (props.occluder.type === 'MODEL'){
    occluderModel = gltfOccluder.scene.children?.[0] ? gltfOccluder.scene.children[0].clone() : gltfOccluder.scene.clone()
    occluderModel.scale.multiplyScalar(props.occluder.scale || 1)
    occluderModel.userData = { isOccluder: true }
  }

  return (
    <object3D ref={objRef}>
      <object3D>
        <object3D>
          <primitive object={modelScene} />
          { occluderModel && (<primitive object={occluderModel} />) }
          { softOccluderModel && (<primitive object={softOccluderModel} />) }
        </object3D>
      </object3D>
    </object3D>
  )
}

const toThreePose = (pose) => {
  const t = pose.translation || [0,0,0]
  const translation = [t[0], t[2], -t[1]]
  const q = pose.quaternion || [0,0,0,1]
  const quaternion = [q[0], q[2], -q[1], q[3]]
  return { translation, scale: pose.scale, quaternion }
}

export default function TryOn(){
  const { modelId } = useParams()
  const location = useLocation()

  const selectedModel = (modelId === 'custom' && location.state) ? {
    id: 'custom', name: 'Custom Model', type: location.state.mode,
    gltf: location.state.url, occluder: (location.state.mode === 'foot') ? { type: 'MODEL', model: GLTFOccluderFoot, scale: 1 } : { type: 'SOFTCYLINDER', radiusRange: [3.5,4.5], height: 48, offset: [0,0,0], quaternion: [0.707,0,0,0.707] },
    pose: (location.state.mode === 'foot') ? { scale: 1.2, translation: [0,0.01,-0.02] } : { scale: 1.35 * 1.462, translation: [0.076,-0.916,-0.504], quaternion: [0,0,0,1] }
  } : findModelById(modelId)

  const [sizing, setSizing] = useState(compute_sizing())
  const [isSelfieCam, setIsSelfieCam] = useState(false)
  const [isInitialized] = useState(true)
  const pose = toThreePose(selectedModel.pose)

  let _timerResize = null
  const handle_resize = () => {
    if (_timerResize){ clearTimeout(_timerResize) }
    _timerResize = setTimeout(() => { _timerResize = null; setSizing(compute_sizing()) }, 200)
  }

  useEffect(() => { VTOThreeHelper.resize() }, [sizing])

  const canvasVideoRef = useRef()
  useEffect(() => {
    const isFoot = selectedModel.type === 'foot'
    const poseFilter = PoseFlipFilter.instance({})
    const spec = isFoot ? {
      poseLandmarksLabels: [ 'ankleBack', 'ankleOut', 'ankleIn', 'ankleFront', 'heelBackOut', 'heelBackIn', 'pinkyToeBaseTop', 'middleToeBaseTop', 'bigToeBaseTop' ],
      poseFilter, enableFlipObject: true, cameraZoom: 1, freeZRot: false, threshold: 0.6,
      scanSettings: {
        multiDetectionSearchSlotsRate: 0.5, multiDetectionMaxOverlap: 0.3, multiDetectionOverlapScaleXY: [0.5,1], multiDetectionEqualizeSearchSlotScale: true, multiDetectionForceSearchOnOtherSide: true, multiDetectionForceChirality: 1, disableIsRightHandNNEval: true, overlapFactors: [1.0,1.0,1.0], translationScalingFactors: [0.3,0.3,1.0], nScaleLevels: 2, scale0Factor: 0.5
      },
      handTrackerCanvas: canvasVideoRef.current, debugDisplayLandmarks: false, NNs: [NNFoot], maxHandsDetected: 2,
      stabilizationSettings: { NNSwitchMask: { isRightHand: false, isFlipped: false } },
      landmarksStabilizerSpec: { minCutOff: 0.001, beta: 1 }
    } : {
      objectPointsPositionFactors: [1.0, 1.3, 1.0],
      poseLandmarksLabels: [ 'wristBack','wristLeft','wristRight','wristPalm','wristPalmTop','wristBackTop','wristRightBottom','wristLeftBottom' ],
      poseFilter, enableFlipObject: true, cameraZoom: 1, threshold: 0.92,
      handTrackerCanvas: canvasVideoRef.current, debugDisplayLandmarks: false, NNs: [NNWrist], maxHandsDetected: 1,
      stabilizationSettings: { switchNNErrorThreshold: 0.5 },
      landmarksStabilizerSpec: { minCutOff: 0.001, beta: 0.8 },
      scanSettings: { translationScalingFactors: [0.25,0.25,1] }
    }
    VTOThreeHelper.init(spec, Stabilizer).then(() => {
      window.addEventListener('resize', handle_resize)
      window.addEventListener('orientationchange', handle_resize)
    })
    return VTOThreeHelper.destroy
  }, [isInitialized, selectedModel.type])

  const flip_camera = () => {
    VTOThreeHelper.update_videoSettings({ facingMode: (isSelfieCam) ? 'environment' : 'user' }).then(() => { setIsSelfieCam(!isSelfieCam) }).catch(() => {})
  }

  const mirrorClass = (isSelfieCam) ? 'mirrorX' : ''
  return (
    <div>
      <Canvas className={mirrorClass} style={{ position: 'fixed', zIndex: 2, ...sizing }} gl={{ preserveDrawingBuffer: true }}>
        <ThreeGrabber sizing={sizing} />
        <Suspense fallback={null}>
          <VTOModelContainer GLTFModel={selectedModel.gltf} occluder={selectedModel.occluder} pose={pose} />
        </Suspense>
        <directionalLight color={0xffffff} intensity={0.5} position={[0,100,100]} />
        <ambientLight color={0xffffff} intensity={0.1} />
      </Canvas>

      <canvas className={mirrorClass} ref={canvasVideoRef} style={{ position: 'fixed', zIndex: 1, ...sizing }} width={sizing.width} height={sizing.height} />

      <BackButton />
      <FlipCamButton onClick={flip_camera} />

      <Alert
        message="Point towards your leg or wrist"
        type="info"
        showIcon
        style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
      />
    </div>
  )
}