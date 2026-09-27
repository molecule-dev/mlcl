// E2E test helpers for the discussion-boards (Stoa) flagship.
// Specs share signup/login + small request helpers from here so every
// test starts from a fresh, isolated user.

import { createHmac } from 'node:crypto'

import { Page, expect, APIResponse, request } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'stoa') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Create a fresh user via the API and seed localStorage so SPA boots authed. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = `Stoa Tester ${Date.now()}-${counter}`,
) {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name },
  })
  expect(res.status(), `signup should return 201, got ${await safeText(res)}`).toBe(201)
  const body = await res.json()
  if (!body.accessToken) {
    throw new Error('signup did not return accessToken: ' + JSON.stringify(body))
  }
  // The user object lives in `props` (resource library convention).
  const user = body.user ?? body.props
  return {
    email,
    password,
    name,
    accessToken: body.accessToken as string,
    userId: (user?.id as string) ?? '',
  }
}

/**
 * UI-driven signup. Hardening: gate on submit-enabled, arm the POST
 * /api/users response listener BEFORE the click, then poll until the
 * JWT lands in localStorage. Eliminates a race where React routed off
 * /signup before the molecule auth hook had persisted the token, so an
 * immediate authed `page.request.*` call 401-ed. (Direct-API `signup()`
 * above does not have this race because there is no React submit step.)
 */
export async function signupViaUI(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/Display name/i).fill('Stoa Tester')
  await page.getByLabel(/Email/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  await page.getByLabel(/Confirm/i).fill(password)
  const submit = page.getByRole('button', { name: /Create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** A category row, in the shape the category pages read. */
export interface Category {
  id: string
  name: string
  slug: string
}

export async function getCategories(page: Page): Promise<Category[]> {
  const res = await page.request.get(`${API_BASE}/categories`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  return (Array.isArray(body) ? body : (body.data ?? [])) as Category[]
}

/**
 * A category from the live board — whichever one the app actually holds.
 *
 * Specs read the room they post into instead of naming one: the demo board
 * is the first thing an app's owner replaces, and a spec that names a
 * seeded slug fails on a correct app.
 */
export async function pickCategory(page: Page): Promise<Category> {
  const [category] = await getCategories(page)
  if (!category) throw new Error('the board has no categories')
  return category
}

export async function createThread(
  page: Page,
  args: { title: string; body: string; categoryId: string },
): Promise<{ id: string; slug: string; title: string }> {
  const res = await page.request.post(`${API_BASE}/threads`, { data: args })
  expect(res.status(), `POST /threads should be 201, got ${await safeText(res)}`).toBe(201)
  const body = await res.json()
  const t = body.data ?? body
  return { id: t.id, slug: t.slug, title: t.title }
}

/**
 * Create a second user via the API (no localStorage seeding, no UI).
 *
 * Uses an ISOLATED, throwaway request context — NOT `page.request` — on
 * purpose: signup sets a session `token` cookie, and `page.request` shares
 * the page's cookie jar, so signing up a second user through it would
 * silently re-authenticate the browser as that second user. The SPA
 * restores its session from the cookie on the next `page.goto`, so the
 * primary user's authed pages (e.g. /bookmarks) would then load as the
 * second (empty) user. The isolated context keeps the page session intact;
 * the returned `accessToken` is used explicitly via `apiAs(...)`.
 */
export async function signupApi(
  page: Page,
  email = uniqueEmail('actor'),
  password = 'TestPass123!',
  name = `Stoa Actor ${Date.now()}-${counter}`,
) {
  void page // isolated context, intentionally not using page.request's cookie jar
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${API_BASE}/users`, {
      data: { email, password, name },
    })
    expect(res.status(), `signup should return 201, got ${await safeText(res)}`).toBe(201)
    const body = await res.json()
    const user = body.user ?? body.props
    return {
      email,
      password,
      name,
      accessToken: body.accessToken as string,
      userId: (user?.id as string) ?? '',
    }
  } finally {
    await ctx.dispose()
  }
}

/** Make an API request as a specific bearer token holder. */
export async function apiAs(
  page: Page,
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
) {
  const opts: { headers: Record<string, string>; data?: unknown } = {
    headers: { Authorization: `Bearer ${token}` },
  }
  if (data !== undefined) opts.data = data
  switch (method) {
    case 'GET':
      return page.request.get(url, opts)
    case 'POST':
      return page.request.post(url, opts)
    case 'PUT':
      return page.request.put(url, opts)
    case 'PATCH':
      return page.request.patch(url, opts)
    case 'DELETE':
      return page.request.delete(url, opts)
  }
}

export async function safeText(res: APIResponse): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Capture every network response during `fn`. Specs use this to assert the
 * app actually fired the expected backend call (and got a 2xx) — not just
 * that a click handler ran. Returns method/url/status for each response.
 */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/**
 * Fail the test if any console.error fires during fn. Benign third-party
 * noise (favicon 404s, network noise from devtools) is filtered.
 */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|404 \(Not Found\)|net::ERR_FAILED/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of input.replace(/=+$/, '').toUpperCase()) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Computes the current RFC 6238 TOTP code for a base32 secret, matching the
 *  server's defaults (HMAC-SHA1, 6 digits, 30-second step) as implemented by
 *  `@molecule/api-two-factor-otplib`. Exists so e2e specs can complete a REAL
 *  two-factor enrollment instead of asserting on a boolean flag [M-5]: the
 *  only way 2FA turns on is by answering the provisioning secret with a valid
 *  code. No extra dependency needed — node's crypto is enough. */
export function totp(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / 30)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  counterBuffer.writeUInt32BE(counter >>> 0, 4)
  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}
