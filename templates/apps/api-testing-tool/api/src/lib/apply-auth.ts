/**
 * Apply a saved request's auth (`auth_type` + `auth_config`) to the outbound
 * headers before it is fired. These are schema-validated and persisted, but the
 * execute path never applied them — so a request configured with Bearer / Basic
 * / API-key auth fired unauthenticated (the target rejected it). Mutates the
 * given `headers` object in place. Supported types:
 *   - `bearer` / `oauth` — `Authorization: Bearer <config.token>`
 *   - `basic`            — `Authorization: Basic base64(username:password)`
 *   - `apikey`           — a custom header `<config.key>: <config.value>`
 *                          (header placement only; a query-param key is skipped)
 *   - `none` / unknown   — no change
 *
 * @module
 */

function parseConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch (_error) {
      // malformed auth_config JSON — treat as empty
    }
  }
  return {}
}

const str = (cfg: Record<string, unknown>, key: string): string =>
  typeof cfg[key] === 'string' ? (cfg[key] as string) : ''

export function applyAuth(
  headers: Record<string, string>,
  authType: unknown,
  authConfig: unknown,
): void {
  const type = String(authType ?? 'none').toLowerCase()
  if (type === 'none' || type === '') return
  const cfg = parseConfig(authConfig)

  if (type === 'bearer' || type === 'oauth') {
    const token = str(cfg, 'token') || str(cfg, 'accessToken')
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (type === 'basic') {
    const username = str(cfg, 'username')
    const password = str(cfg, 'password')
    if (username || password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    }
  } else if (type === 'apikey' || type === 'api_key') {
    const key = str(cfg, 'key') || str(cfg, 'headerName')
    const value = str(cfg, 'value')
    const location = (str(cfg, 'in') || 'header').toLowerCase()
    // Query-param API keys would need URL rewriting (out of scope); the header
    // form covers the common Bearer-style API key.
    if (key && location !== 'query') headers[key] = value
  }
}
