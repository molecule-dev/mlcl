import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3280')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4280') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'sme2e') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up via the API directly (faster + more reliable than UI for setup).
 * The server sets an httpOnly cookie on the response; subsequent page.goto()
 * calls are automatically authenticated via that cookie.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
  name?: string,
) {
  const display = name ?? `User ${counter}`
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: display },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { accessToken: string; user: { id: string } }
  return { email, password, accessToken: body.accessToken, userId: body.user.id, name: display }
}

/**
 * Sign up via the UI form (validates the actual form is wired correctly).
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for /feed and poll until the JWT actually
 * lands in localStorage. Eliminates the API-only flake where a spec
 * fired an authed request before the auth-state hook had written it.
 */
export async function signupUI(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
  name = 'Vivid Tester',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="text"]').first().fill(name)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL((u) => /\/feed/.test(u.pathname), { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = (await getAccessToken(page)) ?? ''
  expect(accessToken, 'signup did not persist an access token').toBeTruthy()
  return { email, password, accessToken, name }
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
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

export interface SeededPost {
  id: string
  user_id: string
  caption: string
  tags: string[]
  visibility: string
}

export async function seedPost(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    caption: string
    hashtags: string[]
    location: string
    visibility: 'public' | 'followers' | 'private'
  }> = {},
): Promise<SeededPost> {
  const res = await page.request.post(`${API_BASE}/posts`, {
    headers: apiHeaders(accessToken),
    data: {
      caption: overrides.caption ?? `Seed post ${Date.now()}-${++counter}`,
      hashtags: overrides.hashtags ?? ['seed'],
      location: overrides.location ?? null,
      visibility: overrides.visibility ?? 'public',
      media_urls: [],
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededPost
}

export async function followUser(page: Page, accessToken: string, targetId: string) {
  const res = await page.request.post(`${API_BASE}/follows/users/${targetId}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as { following: boolean }
}

export async function likePost(page: Page, accessToken: string, postId: string) {
  const res = await page.request.post(`${API_BASE}/posts/${postId}/like`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as { liked: boolean; like_count: number }
}

export async function commentOnPost(page: Page, accessToken: string, postId: string, body: string) {
  const res = await page.request.post(`${API_BASE}/posts/${postId}/comments`, {
    headers: apiHeaders(accessToken),
    data: { body },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as { id: string; body: string }
}

export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
  }
  return reqs
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|apple-mobile-web-app-capable/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
