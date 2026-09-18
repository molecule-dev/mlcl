export interface GuestCartLine {
  id: string
  name: string
  priceCents: number
  qty: number
  note?: string
}

export interface GuestCart {
  ownerId: string | null
  tableNumber: number | null
  lines: GuestCartLine[]
}

const STORAGE_KEY = 'restaurant.guest.cart.v1'

const empty: GuestCart = { ownerId: null, tableNumber: null, lines: [] }

const isCart = (val: unknown): val is GuestCart =>
  !!val && typeof val === 'object' && Array.isArray((val as GuestCart).lines)

export function readGuestCart(): GuestCart {
  if (typeof window === 'undefined') return { ...empty }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...empty }
    const parsed = JSON.parse(raw) as unknown
    if (!isCart(parsed)) return { ...empty }
    return parsed
  } catch (_error) {
    // localStorage may be unavailable or contain non-JSON — fall back to empty cart
    return { ...empty }
  }
}

export function writeGuestCart(cart: GuestCart): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch (_error) {
    // localStorage quota exceeded — best-effort write, ignore
  }
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (_error) {
    // localStorage may be unavailable — best-effort clear, ignore
  }
}

export function addLine(cart: GuestCart, line: Omit<GuestCartLine, 'qty'>): GuestCart {
  const existing = cart.lines.find((l) => l.id === line.id)
  if (existing) {
    return {
      ...cart,
      lines: cart.lines.map((l) => (l.id === line.id ? { ...l, qty: l.qty + 1 } : l)),
    }
  }
  return { ...cart, lines: [...cart.lines, { ...line, qty: 1 }] }
}

export function setQty(cart: GuestCart, id: string, qty: number): GuestCart {
  if (qty <= 0) return { ...cart, lines: cart.lines.filter((l) => l.id !== id) }
  return { ...cart, lines: cart.lines.map((l) => (l.id === id ? { ...l, qty } : l)) }
}

export function cartCount(cart: GuestCart): number {
  return cart.lines.reduce((s, l) => s + l.qty, 0)
}

export function cartSubtotalCents(cart: GuestCart): number {
  return cart.lines.reduce((s, l) => s + l.priceCents * l.qty, 0)
}
