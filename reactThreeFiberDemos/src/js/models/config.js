import GLTFModelWrist from '../../assets/VTO/wristPlaceHolder2.glb'
import GLTFModelFoot from '../../assets/bareFootVTO/ballerinaShoe.glb'
import GLTFOccluderFoot from '../../assets/bareFootVTO/occluder.glb'

export const models = [
  {
    id: 'wristPlaceholder',
    name: 'Wrist Placeholder',
    type: 'wrist',
    gltf: GLTFModelWrist,
    occluder: { type: 'SOFTCYLINDER', radiusRange: [3.5, 4.5], height: 48, offset: [0,0,0], quaternion: [0.707,0,0,0.707] },
    pose: { scale: 1.35 * 1.462, translation: [0.076, -0.916, -0.504], quaternion: [0,0,0,1] }
  },
  {
    id: 'ballerinaShoe',
    name: 'Ballerina Shoe',
    type: 'foot',
    gltf: GLTFModelFoot,
    occluder: { type: 'MODEL', model: GLTFOccluderFoot, scale: 1 },
    pose: { scale: 1.2, translation: [0, 0.01, -0.02] }
  }
]

export const findModelById = (id) => models.find(m => m.id === id)