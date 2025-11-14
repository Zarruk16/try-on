import { useCart } from '../store/cart'

export default function Cart(){
  const { items, remove, total } = useCart()
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 text-white">
      <div className="text-2xl font-semibold mb-4">Cart</div>
      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between border border-zinc-800 rounded-xl p-3">
            <div>
              <div className="font-semibold">{it.name}</div>
              <div className="text-white/80">${(it.price||0).toFixed(2)} × {it.qty||1}</div>
            </div>
            <button onClick={()=>remove(idx)} className="px-3 py-1 rounded bg-white text-black">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-6 text-xl">Subtotal: ${total.toFixed(2)}</div>
      <button className="mt-3 px-4 py-2 rounded-xl bg-white text-black">Checkout</button>
    </div>
  )
}