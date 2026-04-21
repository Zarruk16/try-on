import { useParams, useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import ModelPreview from '../components/ModelPreview'
import { useCart } from '../store/cart'

export default function Product(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()

  const wristMods = import.meta.glob('../assets/VTO/*.glb', { eager: true })
  const footMods = import.meta.glob('../assets/bareFootVTO/*.glb', { eager: true })
  const all = { ...wristMods, ...footMods }
  const entry = Object.entries(all).find(([p]) => p.endsWith(id)) || Object.entries(all)[0]
  const url = entry?.[1]?.default
  const price = 7500

  const tryOn = (mode) => { navigate('/try/custom', { state: { url, mode } }) }
  const addToCart = () => { add({ id, name: id.replace(/\.glb$/i,''), price, qty: 1 }) }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 text-white">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <ModelPreview url={url} />
        </div>
        <div>
          <div className="text-2xl font-semibold mb-2">{id.replace(/\.glb$/i,'')}</div>
          <div className="text-xl mb-4">₦{price.toFixed(2)}</div>
          <div className="flex gap-3 mb-4">
            <Button type="primary" onClick={()=>tryOn('foot')}>Try on Foot</Button>
            <Button type="primary" onClick={()=>tryOn('wrist')}>Try on Wrist</Button>
          </div>
          <Button onClick={addToCart}>Add to Cart</Button>
        </div>
      </div>
    </div>
  )
}