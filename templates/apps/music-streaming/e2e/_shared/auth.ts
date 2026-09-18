/**
 * Shared E2E auth helpers — used by every flagship app's `e2e/*.spec.ts`.
 *
 * The flow exercises the real signup / login endpoints exposed by
 * `@molecule/api-resource-user`:
 *   POST /api/users           — signup (creates the user, sets the auth cookie)
 *   POST /api/users/log-in    — login (sets the auth cookie)
 *
 * These helpers are framework-agnostic — they assume an Express API listening
 * at `process.env.API_URL` (default `http://localhost:4000`) and a Vite app at
 * `process.env.BASE_URL` (default `http://localhost:5173`).
 *
 * No HTTP layer mocking — real fetch hits the real API. JWT cookies set by
 * the API server are picked up by the browser context for subsequent
 * navigation, matching production behaviour exactly.
 */

import type { Page, APIRequestContext, APIResponse } from '@molecule/app-e2e-fixtures-default'

export interface SignupOptions {
  email: string
  password: string
  name?: string
  /** Override the API base URL (defaults to API_URL or http://localhost:4000). */
  apiUrl?: string
  /** Override the App base URL (defaults to BASE_URL or http://localhost:5173). */
  baseUrl?: string
}

export interface LoginOptions {
  email: string
  password: string
  apiUrl?: string
  baseUrl?: string
}

/**
 * Extracts the JWT token from the response headers set by
 * `@molecule/api-resource-user`'s authorization helper. The molecule API
 * returns the token in two places:
 *   - `Authorization: Bearer <jwt>` response header (for non-browser clients)
 *   - `Set-Cookie: token=<jwt>` (for browser clients via auto-cookie persistence)
 *
 * Playwright's `APIRequestContext` automatically stores and replays cookies on
 * subsequent requests, but the molecule auth middleware
 * (`packages/api/resources/user/src/authorization.ts`) only reads the
 * `Authorization` header — it does not fall back to the cookie. Without
 * forwarding the captured Bearer token explicitly, every authenticated request
 * after signup gets a 401.
 *
 * Usage in specs:
 *   const { authHeaders } = await apiSignup(request, opts)
 *   await request.post(url, { headers: authHeaders, data: ... })
 */
export function extractAuthToken(res: APIResponse): string | null {
  const headers = res.headers()
  const raw = headers['authorization'] ?? headers['set-authorization']
  if (!raw) return null
  return raw.startsWith('Bearer ') ? raw.slice(7) : raw
}

/** Returns the standard request-headers object containing the Bearer token. */
export function bearerHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const apiBase = (override?: string): string =>
  override ?? process.env.API_URL ?? 'http://localhost:4000'

const appBase = (override?: string): string =>
  override ?? process.env.BASE_URL ?? 'http://localhost:5173'

/**
 * Signs a fresh user up via the real API, then makes the resulting auth cookie
 * available to the page's browser context. Subsequent `page.goto(...)` calls
 * are authenticated.
 *
 * Returns the created user record (id at minimum). Throws on signup failure —
 * E2E specs are not allowed to silently fall back.
 */
export async function signupAndLogin(
  page: Page,
  opts: SignupOptions,
): Promise<{
  id: string
  email: string
  token: string | null
  authHeaders: Record<string, string>
}> {
  const api = apiBase(opts.apiUrl)
  const app = appBase(opts.baseUrl)

  const res = await page.request.post(`${api}/api/users`, {
    data: {
      email: opts.email,
      password: opts.password,
      name: opts.name ?? opts.email.split('@')[0],
    },
    failOnStatusCode: false,
  })
  if (!res.ok()) {
    throw new Error(`signup failed (${res.status()} ${res.statusText()}): ${await res.text()}`)
  }
  const body = (await res.json()) as { id?: string; user?: { id?: string; email?: string } }
  const id = body.id ?? body.user?.id
  if (!id) {
    throw new Error(`signup returned no user id; body=${JSON.stringify(body)}`)
  }

  const token = extractAuthToken(res)

  // Stash the bearer token on the page so helpers like `expectAuthenticated`
  // (and any per-spec callers) can retrieve it without threading the
  // signup result through every call site. The molecule auth middleware now
  // also reads the `token` cookie that signup sets, so most `page.request.*`
  // calls work without explicit headers — but explicit Bearer is still
  // exposed via `getPageAuthHeaders(page)` for specs that need it (or that
  // run via the test-level `request` fixture, which has a separate cookie
  // jar from `page.request`).
  if (token) {
    pageTokens.set(page, token)
  }
  pageUserIds.set(page, id)

  // The molecule app-auth `createJWTAuthClient` reads its initial state from
  // localStorage under keys `<prefix>accessToken` / `<prefix>user` (default
  // prefix `molecule:auth:`). Without seeding those, every spec that visits
  // an authed React route (anything wrapped in `<AuthGuard>`) gets bounced
  // to /login because the auth bond initialises with `authenticated: false`
  // even though the API set the auth cookie / returned a Bearer token.
  //
  // We have to navigate to the app origin BEFORE calling `addInitScript`
  // because Playwright requires a real document context to install init
  // scripts. We then reload to actually trigger the init script for the
  // SPA's first JS evaluation.
  const userBody = body.user ?? { id, email: opts.email }
  await page.goto(app)
  if (token) {
    // The init script seeds the auth cache only when it is empty so that
    // subsequent page.reload()s after a profile/settings update don't clobber
    // freshly-saved fields with the original signup payload.
    await page.addInitScript(
      ({ token, user, prefix }) => {
        try {
          if (!window.localStorage.getItem(`${prefix}accessToken`)) {
            window.localStorage.setItem(`${prefix}accessToken`, token)
          }
          if (!window.localStorage.getItem(`${prefix}user`)) {
            window.localStorage.setItem(`${prefix}user`, JSON.stringify(user))
          }
        } catch {
          /* swallow — older browsers / storage-disabled contexts */
        }
      },
      { token, user: userBody, prefix: 'molecule:auth:' },
    )
    // Set them now too in case the spec doesn't navigate again.
    await page.evaluate(
      ({ token, user, prefix }) => {
        try {
          window.localStorage.setItem(`${prefix}accessToken`, token)
          window.localStorage.setItem(`${prefix}user`, JSON.stringify(user))
        } catch {
          /* ignore */
        }
      },
      { token, user: userBody, prefix: 'molecule:auth:' },
    )
  }
  return { id, email: opts.email, token, authHeaders: bearerHeaders(token) }
}

/**
 * Per-`Page` token / userId registries, populated by `signupAndLogin`.
 * Helpers like `expectAuthenticated` look these up so callers don't have
 * to thread the signup return value through every call site.
 */
const pageTokens: WeakMap<Page, string> = new WeakMap()
const pageUserIds: WeakMap<Page, string> = new WeakMap()

/**
 * Logs an existing user in via the real API. Use after `signupAndLogin` for
 * additional contexts, or against a pre-seeded user.
 */
export async function loginExistingUser(page: Page, opts: LoginOptions): Promise<void> {
  const api = apiBase(opts.apiUrl)
  const app = appBase(opts.baseUrl)

  const res = await page.request.post(`${api}/api/users/log-in`, {
    data: { email: opts.email, password: opts.password },
    failOnStatusCode: false,
  })
  if (!res.ok()) {
    throw new Error(`login failed (${res.status()} ${res.statusText()}): ${await res.text()}`)
  }
  const body = (await res.json()) as { id?: string; user?: { id?: string; email?: string } }
  const id = body.id ?? body.user?.id
  if (id) pageUserIds.set(page, id)
  const token = extractAuthToken(res)
  if (token) pageTokens.set(page, token)
  const userBody = body.user ?? { id: id ?? '', email: opts.email }
  await page.goto(app)
  if (token) {
    // Idempotent seed — see signupAndLogin for the reload-safety rationale.
    await page.addInitScript(
      ({ token, user, prefix }) => {
        try {
          if (!window.localStorage.getItem(`${prefix}accessToken`)) {
            window.localStorage.setItem(`${prefix}accessToken`, token)
          }
          if (!window.localStorage.getItem(`${prefix}user`)) {
            window.localStorage.setItem(`${prefix}user`, JSON.stringify(user))
          }
        } catch {
          /* ignore */
        }
      },
      { token, user: userBody, prefix: 'molecule:auth:' },
    )
    await page.evaluate(
      ({ token, user, prefix }) => {
        try {
          window.localStorage.setItem(`${prefix}accessToken`, token)
          window.localStorage.setItem(`${prefix}user`, JSON.stringify(user))
        } catch {
          /* ignore */
        }
      },
      { token, user: userBody, prefix: 'molecule:auth:' },
    )
  }
}

/**
 * Hits a known authenticated endpoint to assert the request context is
 * carrying a valid auth cookie. Returns true / false rather than throwing so
 * callers can branch.
 *
 * The molecule user resource exposes `GET /users/:id` (guarded by the
 * `authSelf` middleware), not a `/me` alias — so we pull the userId
 * captured by `signupAndLogin` and hit that endpoint with the bearer
 * token from the per-page registry. A 200 means verifyMiddleware
 * accepted the credentials and authSelf matched session.userId to the
 * URL param. Any other status is a failed auth handshake.
 */
export async function expectAuthenticated(
  page: Page,
  opts: { apiUrl?: string; authHeaders?: Record<string, string>; userId?: string } = {},
): Promise<boolean> {
  const api = apiBase(opts.apiUrl)
  const headers = opts.authHeaders ?? bearerHeaders(pageTokens.get(page) ?? null)
  const userId = opts.userId ?? pageUserIds.get(page)
  if (userId) {
    const self = await page.request.get(`${api}/api/users/${userId}`, {
      headers,
      failOnStatusCode: false,
    })
    if (self.ok()) return true
  }
  // Legacy fallbacks for templates that DO expose /me — try them last.
  const me = await page.request.get(`${api}/api/users/me`, { headers, failOnStatusCode: false })
  if (me.ok()) return true
  const fallback = await page.request.get(`${api}/api/me`, { headers, failOnStatusCode: false })
  return fallback.ok()
}

/** Returns the bearer token captured by the most recent `signupAndLogin(page)`. */
export function getPageToken(page: Page): string | null {
  return pageTokens.get(page) ?? null
}

/** Returns the `Authorization: Bearer …` headers for a page's stashed token. */
export function getPageAuthHeaders(page: Page): Record<string, string> {
  return bearerHeaders(pageTokens.get(page) ?? null)
}

/**
 * Direct-from-request signup, useful when a spec needs a second user without
 * touching the page (e.g. authorisation-failure tests).
 */
export async function apiSignup(
  request: APIRequestContext,
  opts: SignupOptions,
): Promise<{
  id: string
  email: string
  token: string | null
  authHeaders: Record<string, string>
}> {
  const api = apiBase(opts.apiUrl)
  const res = await request.post(`${api}/api/users`, {
    data: {
      email: opts.email,
      password: opts.password,
      name: opts.name ?? opts.email.split('@')[0],
    },
    failOnStatusCode: false,
  })
  if (!res.ok()) {
    throw new Error(`signup failed (${res.status()} ${res.statusText()}): ${await res.text()}`)
  }
  const body = (await res.json()) as { id?: string; user?: { id?: string; email?: string } }
  const id = body.id ?? body.user?.id
  if (!id) throw new Error(`signup returned no user id; body=${JSON.stringify(body)}`)
  const token = extractAuthToken(res)
  return { id, email: opts.email, token, authHeaders: bearerHeaders(token) }
}
