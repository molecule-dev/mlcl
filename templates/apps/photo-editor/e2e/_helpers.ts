/**
 * Shared helpers for photo-editor (Lustra) e2e specs. Drives a real
 * browser against the dev server hitting a real Postgres + real Stripe
 * + real Mailgun (sandbox). No mocks — every assertion is "user
 * clicked → backend actually changed".
 */
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3050')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4050') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'lustra') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up a fresh user via the real signup form. Returns captured
 * access token + user id so specs can issue authenticated API calls
 * directly. After signup the app redirects to /library.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Lustra Photographer',
) {
  await page.goto(APP_BASE + '/signup')
  // Signup form: single 'Display name' field, email, password, confirm.
  await page.locator('input#name').fill(name)
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirm').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/library/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const meRes = await page.request.get(API_BASE + '/users/me')
  const meBody = meRes.ok()
    ? ((await meRes.json()) as { props?: { id?: string }; id?: string })
    : null
  const userId = meBody?.props?.id ?? meBody?.id ?? null
  return { email, password, name, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/library/, { timeout: 15_000 })
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/**
 * Capture every HTTP response during a block and return them. Used by
 * specs that must assert real backend calls happened (read-after-write
 * + gate 12 in scripts/verify-app-coverage.mjs).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
    })
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
 * Create an image row directly via the API. Returns the row.
 * Use a stable, well-known public test image URL so tests are
 * deterministic without depending on third-party CDN flake.
 */
export async function createImage(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    original_url: string
    width: number
    height: number
    album_id: string | null
  }> = {},
): Promise<ApiImage> {
  const body = {
    name: overrides.name ?? `Frame ${Date.now()}`,
    original_url:
      overrides.original_url ??
      'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800',
    width: overrides.width ?? 800,
    height: overrides.height ?? 600,
    album_id: overrides.album_id ?? null,
  }
  const res = await page.request.post(`${API_BASE}/images`, {
    headers: apiHeaders(accessToken),
    data: body,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiImage
}

export async function listImages(page: Page, accessToken: string): Promise<ApiImage[]> {
  const res = await page.request.get(`${API_BASE}/images`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as ApiImage[] | { data?: ApiImage[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export async function createAlbum(
  page: Page,
  accessToken: string,
  name = `Album ${Date.now()}`,
): Promise<ApiAlbum> {
  const res = await page.request.post(`${API_BASE}/albums`, {
    headers: apiHeaders(accessToken),
    data: { name },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiAlbum
}

export async function listAlbums(page: Page, accessToken: string): Promise<ApiAlbum[]> {
  const res = await page.request.get(`${API_BASE}/albums`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as ApiAlbum[] | { data?: ApiAlbum[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export interface ApiImage {
  id: string
  user_id: string
  name: string
  original_url: string
  current_url: string
  width: number
  height: number
  album_id: string | null
  edit_history: unknown[]
  is_public: boolean
  created_at: string
  updatedAt?: string | null
}

export interface ApiAlbum {
  id: string
  user_id: string
  name: string
  cover_image_id: string | null
  created_at: string
  updatedAt?: string | null
}

export interface ApiPreset {
  id: string
  user_id: string | null
  name: string
  parameters: Record<string, unknown>
  created_at: string
}

export interface ApiExport {
  id: string
  user_id: string
  image_id: string
  format: string
  quality: number
  width: number
  height: number
  status: string
  output_url: string | null
  created_at: string
}
