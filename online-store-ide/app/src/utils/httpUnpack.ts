/** Normalizes list-shaped HTTP responses from the reference storefront API. */
export function unpackListPayload(res: unknown): unknown[] {
  const wrapped = res as { data?: unknown } | null | undefined
  const top = wrapped?.data !== undefined ? wrapped.data : res
  if (Array.isArray(top)) return top
  if (top && typeof top === 'object' && Array.isArray((top as { data?: unknown[] }).data)) {
    return (top as { data: unknown[] }).data
  }
  return []
}

export function unpackPagedMeta(res: unknown, rows: unknown[]): number {
  const wrapped = res as { total?: unknown } | null | undefined
  if (wrapped && typeof wrapped.total === 'number') return wrapped.total
  return rows.length
}

export function sumOrderTotals(orders: unknown[]): number {
  let sum = 0
  for (const o of orders) {
    if (o && typeof o === 'object' && 'total' in o) {
      const v = (o as { total: unknown }).total
      if (typeof v === 'number') sum += v
    }
  }
  return sum
}

/** Cart GET/POST response body used on checkout and nav. */
export function unpackCartPayload(res: unknown): {
  items: unknown[]
  subtotal: number
  shipping: number
  tax: number
  total: number
} | null {
  const raw = (res as { data?: unknown })?.data ?? res
  if (!raw || typeof raw !== 'object' || !('items' in raw)) return null
  const o = raw as {
    items: unknown
    subtotal?: unknown
    shipping?: unknown
    tax?: unknown
    total?: unknown
  }
  if (!Array.isArray(o.items)) return null
  return {
    items: o.items,
    subtotal: Number(o.subtotal ?? 0),
    shipping: Number(o.shipping ?? 0),
    tax: Number(o.tax ?? 0),
    total: Number(o.total ?? 0),
  }
}

export function unpackCreatedResourceId(res: unknown): string | undefined {
  const o = res as { data?: { id?: unknown }; id?: unknown }
  const id = o?.data?.id ?? o?.id
  return typeof id === 'string' ? id : undefined
}

/** Admin products table API — list may be top-level array or `{ data, total, totalPages }`. */
export function unpackAdminProductsList(res: unknown): {
  products: unknown[]
  total: number
  totalPages: number
} {
  const root = (res as { data?: unknown })?.data ?? res
  if (Array.isArray(root)) {
    return { products: root, total: root.length, totalPages: 1 }
  }
  if (root && typeof root === 'object') {
    const o = root as { data?: unknown; total?: unknown; totalPages?: unknown }
    const list = Array.isArray(o.data) ? o.data : []
    const total = typeof o.total === 'number' ? o.total : list.length
    const totalPages = typeof o.totalPages === 'number' ? o.totalPages : 1
    return { products: list, total, totalPages }
  }
  return { products: [], total: 0, totalPages: 1 }
}
