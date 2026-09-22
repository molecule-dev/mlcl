/**
 * Lightweight ephemeral cart. Stored in localStorage so it survives
 * reloads but is per-device. The polished cart UI is single-buyer
 * Gumroad-style — checkout creates one Stripe session per item, paid
 * one product at a time. (Real multi-line-item Stripe checkout is a
 * v2 feature; the user can buy each cart item with one click.)
 */

import { track } from '@molecule/app-analytics'

export interface CartItem {
  productId: string
  productSlug: string
  name: string
  coverImage?: string | null
  fileType?: string | null
  priceCents: number
  originalPriceCents?: number
  quantity: number
}

const STORAGE_KEY = 'trove.cart.v1'

/**
 * Repair one stored cart entry. Older versions of this app wrote a
 * different shape (`{ id, slug, qty }`), and hand-edited/partial rows
 * exist in the wild; rendering those raw gives `productId: undefined`,
 * which both breaks add/remove matching AND makes React warn about the
 * missing list key. Map legacy fields across and drop unusable rows.
 */
function normalizeItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const productId =
    typeof r.productId === 'string' && r.productId
      ? r.productId
      : typeof r.id === 'string' && r.id
        ? r.id
        : null
  if (!productId) return null
  const priceCents =
    typeof r.priceCents === 'number' && Number.isFinite(r.priceCents)
      ? r.priceCents
      : typeof r.price === 'number' && Number.isFinite(r.price)
        ? Math.round(r.price * 100)
        : 0
  const quantity =
    typeof r.quantity === 'number' && Number.isFinite(r.quantity) && r.quantity > 0
      ? Math.min(99, Math.floor(r.quantity))
      : typeof r.qty === 'number' && Number.isFinite(r.qty) && r.qty > 0
        ? Math.min(99, Math.floor(r.qty))
        : 1
  const productSlug = typeof r.productSlug === 'string' && r.productSlug ? r.productSlug : productId
  return {
    productId,
    productSlug,
    name: typeof r.name === 'string' && r.name ? r.name : productSlug,
    ...(typeof r.coverImage === 'string' ? { coverImage: r.coverImage } : {}),
    ...(typeof r.fileType === 'string' ? { fileType: r.fileType } : {}),
    priceCents,
    ...(typeof r.originalPriceCents === 'number'
      ? { originalPriceCents: r.originalPriceCents }
      : {}),
    quantity,
  }
}

function read(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeItem).filter((i): i is CartItem => i !== null)
  } catch (_error) {
    // corrupt or non-JSON localStorage value; fall back to empty cart
    return []
  }
}

function write(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('trove.cart.updated'))
}

export function getCart(): CartItem[] {
  return read()
}

export function addToCart(item: CartItem): CartItem[] {
  const items = read()
  const existing = items.findIndex((i) => i.productId === item.productId)
  if (existing >= 0) {
    // Digital goods are one license per buyer (checkout creates one Stripe
    // session per product, and the API rejects re-purchase), so adding an
    // item already in the cart is a no-op rather than a quantity bump.
    return items
  }
  items.push({ ...item, quantity: 1 })
  write(items)
  void track({
    name: 'cart.item_added',
    properties: { product_id: item.productId, product_slug: item.productSlug },
  })
  return items
}

export function removeFromCart(productId: string): CartItem[] {
  const removed = read().find((i) => i.productId === productId)
  const items = read().filter((i) => i.productId !== productId)
  write(items)
  if (removed) {
    void track({
      name: 'cart.item_removed',
      properties: { product_id: productId, product_slug: removed.productSlug },
    })
  }
  return items
}

export function setQuantity(productId: string, quantity: number): CartItem[] {
  const items = read()
  const idx = items.findIndex((i) => i.productId === productId)
  if (idx < 0) return items
  const next = Math.max(1, Math.min(99, Math.floor(quantity)))
  items[idx] = { ...items[idx]!, quantity: next }
  write(items)
  return items
}

export function clearCart(): void {
  write([])
}

export function setCart(items: CartItem[]): void {
  write(items)
}

/** Subscribe to cart changes; returns an unsubscribe function. */
export function onCartChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = (): void => callback()
  window.addEventListener('trove.cart.updated', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('trove.cart.updated', handler)
    window.removeEventListener('storage', handler)
  }
}
