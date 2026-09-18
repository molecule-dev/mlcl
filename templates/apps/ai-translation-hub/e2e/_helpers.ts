// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3180')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4180') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'rendition') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user via the UI form. ai-translation-hub uses a
 *  single password field (no confirm) and lands on /dashboard.
 *  Returns email/password and the JWT bearer access token + user id. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').first().fill(email)
  await page
    .locator('input[autocomplete="new-password"], input[type="password"]')
    .first()
    .fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL('**/dashboard', { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me')
  let userId: string | null = null
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Sign out via the user menu. */
export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise). */
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers (called via page.request with a JWT) ----------

export interface SeededProject {
  id: string
  name: string
  source_lang: string
  target_langs: string[]
  status: string
}

export async function seedProject(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    description: string
    source_lang: string
    target_langs: string[]
    status: 'draft' | 'in_progress' | 'review' | 'completed'
  }> = {},
): Promise<SeededProject> {
  const name = overrides.name ?? `Test Project ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/projects`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'An e2e seeded project.',
      source_lang: overrides.source_lang ?? 'EN',
      target_langs: overrides.target_langs ?? ['ES', 'FR'],
      status: overrides.status ?? 'in_progress',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as {
    id: string
    name: string
    source_lang: string
    target_langs: string[] | string
    status: string
  }
  return {
    id: body.id,
    name: body.name,
    source_lang: body.source_lang,
    target_langs:
      typeof body.target_langs === 'string'
        ? (JSON.parse(body.target_langs) as string[])
        : body.target_langs,
    status: body.status,
  }
}

export interface SeededSegment {
  id: string
  source_text: string
  target_lang: string
  status: string
}

export async function seedSegment(
  page: Page,
  accessToken: string,
  args: {
    project_id: string
    source_text?: string
    target_lang?: string
    source_lang?: string
    position?: number
  },
): Promise<SeededSegment> {
  const res = await page.request.post(`${API_BASE}/segments`, {
    headers: apiHeaders(accessToken),
    data: {
      project_id: args.project_id,
      source_text: args.source_text ?? 'Hello, world.',
      source_lang: args.source_lang ?? 'EN',
      target_lang: args.target_lang ?? 'ES',
      position: args.position ?? 0,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededSegment
}
