/**
 * Unpack helpers for the @molecule/app-http response shape.
 *
 * The HTTP bond returns parsed-JSON payloads that may be:
 *   - a bare array (legacy/older endpoints)
 *   - `{ items: [...] }` (paginated style)
 *   - `{ data: [...] }` (current default — every list endpoint in the
 *     scaffolded API wraps its body this way; do NOT unwrap the .data
 *     in handlers, this is the client-side normalization)
 *   - `{ data: { id, ... } }` (single-record shape)
 *   - `{ id, ... }` (single record returned bare)
 *
 * Without these helpers each page would need its own ad-hoc unwrap and
 * any new endpoint that switches between shapes would silently render
 * empty lists.
 */
export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const obj = payload as { items?: unknown; data?: unknown }
    if (Array.isArray(obj.items)) return obj.items as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
    if (obj.data && typeof obj.data === 'object') {
      const inner = (obj.data as { items?: unknown }).items
      if (Array.isArray(inner)) return inner as T[]
    }
  }
  return []
}

export function unwrapSingle<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null
  if ('id' in payload) return payload as T
  if ('data' in payload && (payload as { data?: unknown }).data) {
    const inner = (payload as { data: unknown }).data
    if (inner && typeof inner === 'object') return inner as T
  }
  return null
}
