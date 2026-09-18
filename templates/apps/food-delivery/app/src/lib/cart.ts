/**
 * Localstorage-backed shopping cart for the order flow.
 *
 * The cart is persisted under a versioned localStorage key so it survives
 * page reload, navigation, and browser restarts. A subscription model lets
 * components react to mutations from anywhere in the app.
 */

const STORAGE_KEY = 'food-delivery.cart.v1'

export interface CartLine {
  itemId: string
  name: string
  price_cents: number
  qty: number
}

export interface CartState {
  restaurantId: string | null
  restaurantName: string | null
  lines: CartLine[]
}

const EMPTY: CartState = { restaurantId: null, restaurantName: null, lines: [] }

let cache: CartState | null = null
const listeners = new Set<(s: CartState) => void>()

function read(): CartState {
  if (cache) return cache
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cache = EMPTY
      return cache
    }
    const parsed = JSON.parse(raw) as Partial<CartState>
    cache = {
      restaurantId: parsed.restaurantId ?? null,
      restaurantName: parsed.restaurantName ?? null,
      lines: Array.isArray(parsed.lines) ? parsed.lines.filter(isValidLine) : [],
    }
    return cache
  } catch (_error) {
    // JSON.parse failed — localStorage value is corrupt; fall back to empty cart
    cache = EMPTY
    return cache
  }
}

function isValidLine(line: unknown): line is CartLine {
  if (!line || typeof line !== 'object') return false
  const l = line as CartLine
  return (
    typeof l.itemId === 'string' &&
    typeof l.name === 'string' &&
    typeof l.price_cents === 'number' &&
    typeof l.qty === 'number' &&
    l.qty > 0
  )
}

function write(next: CartState): void {
  cache = next
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (_error) {
      // ignore quota errors — cart still works in-memory for the session
    }
  }
  for (const listener of Array.from(listeners)) {
    try {
      listener(next)
    } catch (_error) {
      // ignore listener errors — one bad subscriber must not block others
    }
  }
}

export function getCart(): CartState {
  return read()
}

export function subscribe(fn: (s: CartState) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function addItem(
  restaurant: { id: string; name: string },
  item: { id: string; name: string; price_cents: number },
  qty = 1,
): CartState {
  const current = read()
  // If switching restaurant, clear the cart first (one-restaurant-at-a-time UX).
  let lines = current.lines
  let restaurantId = current.restaurantId
  if (restaurantId && restaurantId !== restaurant.id) {
    lines = []
  }
  restaurantId = restaurant.id
  const restaurantName = restaurant.name
  const idx = lines.findIndex((l) => l.itemId === item.id)
  if (idx >= 0) {
    lines = lines.map((l, i) => (i === idx ? { ...l, qty: l.qty + qty } : l))
  } else {
    lines = [...lines, { itemId: item.id, name: item.name, price_cents: item.price_cents, qty }]
  }
  const next = { restaurantId, restaurantName, lines }
  write(next)
  return next
}

export function setQty(itemId: string, qty: number): CartState {
  const current = read()
  const lines =
    qty <= 0
      ? current.lines.filter((l) => l.itemId !== itemId)
      : current.lines.map((l) => (l.itemId === itemId ? { ...l, qty } : l))
  const next: CartState = {
    restaurantId: lines.length > 0 ? current.restaurantId : null,
    restaurantName: lines.length > 0 ? current.restaurantName : null,
    lines,
  }
  write(next)
  return next
}

export function removeItem(itemId: string): CartState {
  return setQty(itemId, 0)
}

export function clear(): CartState {
  write(EMPTY)
  return EMPTY
}

export function totals(state: CartState): {
  itemCount: number
  subtotalCents: number
} {
  let itemCount = 0
  let subtotalCents = 0
  for (const l of state.lines) {
    itemCount += l.qty
    subtotalCents += l.qty * l.price_cents
  }
  return { itemCount, subtotalCents }
}
