/**
 * Response-envelope unwrappers tuned for restaurant-review pages.
 *
 * `useHttpClient().get()` returns `{ data: <body>, status, headers, ... }`
 * (`HttpResponse<T>`) where `<body>` is whatever the API returned. Our
 * list endpoints wrap their payload in `{ data: [...] }`, so a raw call
 * to `http.get()` yields:
 *
 *   { data: { data: [...] }, status: 200, ... }
 *
 * The stock `@molecule/app-http` `unwrapList` only handles a single
 * layer of `{ data }` wrapping, so it returns `[]` for our doubly-wrapped
 * shape. These local helpers peel either layer transparently and always
 * return a usable `T[]` / `T | null`.
 *
 * @module
 */

/**
 * Normalize any of these response shapes to `T[]`:
 *   - bare array `T[]`
 *   - `{ data: T[] }` (single wrap — bare API response)
 *   - `{ data: { data: T[] } }` (double wrap — HttpResponse around API body)
 *   - anything else → `[]`
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

/**
 * Normalize any of these response shapes to `T | null`:
 *   - non-empty plain object `T`
 *   - `{ data: T }`
 *   - `{ data: { data: T } }` (HttpResponse around API body)
 *   - `null`/`undefined`/array/primitive/empty object → `null`
 */
export function unwrapSingle<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) return null
  if ('data' in value) {
    const inner = (value as { data: unknown }).data
    if (inner === null || inner === undefined) return null
    if (Array.isArray(inner)) return null
    if (typeof inner !== 'object') return null
    // Double wrap: HttpResponse → API body → resource
    if (
      'data' in inner &&
      (inner as { data?: unknown }).data &&
      typeof (inner as { data?: unknown }).data === 'object' &&
      !Array.isArray((inner as { data: unknown }).data)
    ) {
      return (inner as { data: T }).data
    }
    if (Object.keys(inner as object).length === 0) return null
    return inner as T
  }
  if (Object.keys(value as object).length === 0) return null
  return value as T
}
