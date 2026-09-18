/**
 * Tiny response-shape helpers for hotel-booking pages.
 *
 * `useHttpClient().get()` returns `{ data: <body>, status, headers, ... }`
 * where `<body>` is whatever the API returned. Most of our list endpoints
 * wrap their payload in `{ data: [...] }`, so a raw call yields:
 *
 *   { data: { data: [...] } }
 *
 * `unwrapList<T>` strips both layers — array body, `{data: [...]}` body, or
 * the doubly-wrapped `{data: {data: [...]}}` shape — and always returns a
 * plain `T[]`.
 *
 * `unwrapSingle<T>` does the same for endpoints that return a single object.
 *
 * @module
 */

export function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && 'data' in value) {
    const inner = (value as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (
      inner &&
      typeof inner === 'object' &&
      'data' in inner &&
      Array.isArray((inner as { data: unknown }).data)
    ) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

export function unwrapSingle<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) return null
  // HttpResponse wrapper → unwrap once
  if ('data' in value) {
    const inner = (value as { data: unknown }).data
    if (inner === null || inner === undefined) return null
    if (Array.isArray(inner)) return null
    if (typeof inner !== 'object') return null
    // Double-wrap: server payload also nested under .data
    if (
      'data' in inner &&
      (inner as { data?: unknown }).data &&
      typeof (inner as { data?: unknown }).data === 'object' &&
      !Array.isArray((inner as { data: unknown }).data)
    ) {
      return (inner as { data: T }).data
    }
    // Empty server "no resource" envelope
    if (Object.keys(inner as object).length === 0) return null
    return inner as T
  }
  if (Object.keys(value as object).length === 0) return null
  return value as T
}
