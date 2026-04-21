import { useEffect, useMemo, useState } from 'react'

const validateCartItem = (item) => {
  return item && typeof item.id === 'string' && typeof item.name === 'string' && 
         typeof item.price === 'number' && item.price >= 0 && 
         typeof item.qty === 'number' && item.qty > 0
}

const sanitizeCartData = (data) => {
  if (!Array.isArray(data)) return []
  return data.filter(validateCartItem).map(item => ({
    ...item,
    price: Number(item.price) || 0,
    qty: Math.max(1, Number(item.qty) || 1)
  }))
}

export const useCart = () => {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('cart')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return sanitizeCartData(parsed)
    } catch (error) {
      console.warn('Cart data corrupted, resetting:', error.message)
      try {
        localStorage.removeItem('cart')
      } catch (clearError) {
        console.warn('Failed to clear corrupted cart data:', clearError.message)
      }
      return []
    }
  })

  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem('cart')
      } else {
        localStorage.setItem('cart', JSON.stringify(items))
      }
    } catch (error) {
      console.error('Failed to save cart data:', error.message)
    }
  }, [items])

  const add = (item) => {
    if (!validateCartItem(item)) {
      console.warn('Invalid cart item rejected:', item)
      return
    }
    
    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + (item.qty || 1)
        }
        return updated
      }
      return [...prev, { ...item, qty: item.qty || 1 }]
    })
  }

  const remove = (idx) => { 
    setItems(prev => prev.filter((_,i)=>i!==idx)) 
  }

  const updateQuantity = (idx, qty) => {
    const quantity = Math.max(1, Number(qty) || 1)
    setItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, qty: quantity } : item
    ))
  }

  const clear = () => { setItems([]) }

  const total = useMemo(() => 
    items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0), 
    [items]
  )

  return { items, add, remove, updateQuantity, clear, total, setItems }
}