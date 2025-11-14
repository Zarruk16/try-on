import { useEffect, useMemo, useState } from 'react'

export const useCart = () => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')||'[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)) }, [items])
  const add = (item) => { setItems(prev => [...prev, item]) }
  const remove = (idx) => { setItems(prev => prev.filter((_,i)=>i!==idx)) }
  const total = useMemo(() => items.reduce((s,i)=>s + (i.price||0)* (i.qty||1), 0), [items])
  return { items, add, remove, total, setItems }
}