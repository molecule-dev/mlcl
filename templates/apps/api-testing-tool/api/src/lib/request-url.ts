/**
 * Merge a saved request's stored `query_params` into its URL's query string.
 *
 * `query_params` is a first-class stored field (accepted by the request schema, persisted as JSON),
 * but the execute + monitor-run paths fired `saved.url` verbatim and dropped it — so configured
 * query parameters never reached the outgoing request. This applies them before the fetch.
 *
 * @module
 */

/** Parse a JSON-string-or-object record into a `Record<string, string>` (null/undefined ignored). */
function parseStringRecord(raw: unknown): Record<string, string> {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (_error) {
      // Malformed stored JSON is treated as "no params" — the parse error says nothing the caller can act on.
      return {}
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val != null) out[key] = String(val)
  }
  return out
}

/**
 * Return `url` with the entries of `rawQueryParams` appended/overwritten in its query string.
 * Absolute URLs are handled via the WHATWG `URL` parser; a non-absolute URL falls back to a manual,
 * properly-encoded append. When there are no params the URL is returned unchanged.
 */
export function withQueryParams(url: string, rawQueryParams: unknown): string {
  const params = parseStringRecord(rawQueryParams)
  const keys = Object.keys(params)
  if (keys.length === 0) return url
  try {
    const parsed = new URL(url)
    for (const key of keys) parsed.searchParams.set(key, params[key]!)
    return parsed.toString()
  } catch (_error) {
    // Not an absolute URL, so URL() cannot parse it; fall back to appending the query string by hand.
    const separator = url.includes('?') ? '&' : '?'
    const qs = keys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`)
      .join('&')
    return `${url}${separator}${qs}`
  }
}
