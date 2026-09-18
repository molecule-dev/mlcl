/**
 * Shared helpers for contract-management e2e specs.
 *
 * Auth: signup uses the UI form; the helper reads the JWT bearer from the
 * httpOnly `token` cookie (prod: `__Host-token`) via the Playwright context
 * so callers can drive `page.request.*` with bearer auth.
 *
 * Seeding: small helpers for counterparties / templates / contracts so
 * specs that need pre-existing data can skip the manual UI dance.
 */

import { Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3110')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4110') + '/api'

let counter = 0

export function uniqueEmail(prefix = 'cm') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export type AuthSession = {
  email: string
  password: string
  accessToken: string | null
  userId: string | null
}

export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<AuthSession> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-firstName').fill('Test')
  await page.locator('#signup-lastName').fill('User')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-company').fill('Acme Co')
  await page.locator('#signup-password').fill(password)
  await page.locator('#signup-confirm').fill(password)
  const submit = page.getByRole('button', { name: /create.*account|sign\s*up|join/i }).first()
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
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userBody = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userBody.props?.id ?? userBody.id ?? null
  return { email, password, accessToken, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: Response) => {
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

/** Seed a counterparty via the API. */
export async function seedCounterparty(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    organization: string
    contact_name: string
    contact_email: string
    type: 'client' | 'vendor'
  }> = {},
): Promise<{ id: string; organization: string }> {
  const organization = overrides.organization ?? `Counterparty ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/counterparties`, {
    headers: authHeaders(accessToken),
    data: {
      organization,
      contact_name: overrides.contact_name ?? 'Jane Doe',
      contact_email: overrides.contact_email ?? `signer+${counter}@example.com`,
      type: overrides.type ?? 'client',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, organization }
}

/** Seed a template via the API. */
export async function seedTemplate(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    name: string
    description: string
    category: 'msa' | 'sow' | 'nda' | 'order' | 'employment' | 'other'
    content: string
  }> = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `Template ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/templates`, {
    headers: authHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'Spec template',
      category: overrides.category ?? 'msa',
      type: overrides.category ?? 'msa',
      content: overrides.content ?? 'Hello {{name}}, this is a {{type}} agreement dated {{date}}.',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, name }
}

/** Seed a contract via the API. Returns id + title for navigation. */
export async function seedContract(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    title: string
    counterparty_id: string | null
    party_name: string
    party_email: string | null
    type: string
    amount_cents: number
    currency: string
    expires_at: string | null
    body_html: string
  }> = {},
): Promise<{ id: string; title: string }> {
  const title = overrides.title ?? `Spec Contract ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/contracts`, {
    headers: authHeaders(accessToken),
    data: {
      title,
      type: overrides.type ?? 'msa',
      counterparty_id: overrides.counterparty_id ?? null,
      party_name: overrides.party_name ?? 'Acme Corp',
      party_email: overrides.party_email ?? 'signer@example.com',
      amount_cents: overrides.amount_cents ?? 1_000_000,
      currency: overrides.currency ?? 'USD',
      expires_at: overrides.expires_at ?? new Date(Date.now() + 90 * 86_400_000).toISOString(),
      body_html: overrides.body_html ?? '<p>Body</p>',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, title }
}
