import { useEffect, useState } from 'react'

import {
  addItem,
  type CartState,
  clear,
  getCart,
  removeItem,
  setQty,
  subscribe,
  totals,
} from './cart.js'

export function useCart(): CartState & {
  itemCount: number
  subtotalCents: number
  addItem: typeof addItem
  setQty: typeof setQty
  removeItem: typeof removeItem
  clear: typeof clear
} {
  const [state, setState] = useState<CartState>(() => getCart())
  useEffect(() => subscribe(setState), [])
  const t = totals(state)
  return {
    ...state,
    itemCount: t.itemCount,
    subtotalCents: t.subtotalCents,
    addItem,
    setQty,
    removeItem,
    clear,
  }
}
