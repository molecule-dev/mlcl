// Shared helpers for the crm flagship e2e specs.
//
// Every spec imports from here rather than rewriting auth/network plumbing.
// We deliberately call the API directly when seeding fixtures (contacts,
// companies, deals) so a single spec failure doesn't snowball through the
// suite — fixture creation is verified by its own dedicated spec.

import {
  Page,
  expect,
  Request as PWRequest,
  Response as PWResponse,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3110')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4110') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'crm'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface AuthedSession {
  email: string
  password: string
  accessToken: string
  userId: string
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

/**
 * Sign up via the UI. Returns credentials + the JWT bearer token persisted
 * to localStorage so callers can drive page.request.* with bearer auth.
 *
 * The CRM signup form has Full Name + Email + Password.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'CRM E2E',
): Promise<AuthedSession> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#name').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  // Hardening: gate on submit-enabled, arm the POST /api/users response
  // listener BEFORE the click, then poll until the JWT lands in
  // localStorage. Eliminates a race where the auth-state hook persisted
  // the token in a microtask AFTER React routed off /signup, so the
  // immediate accessToken read below saw '' and the assertion blew up.
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
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

  const accessToken = (await getAccessToken(page)) ?? ''
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userBody = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userBody.props?.id ?? userBody.id ?? ''
  expect(accessToken, 'signup must return an accessToken').not.toBe('')
  expect(userId, 'signup must return user.id').not.toBe('')
  return { email, password, accessToken, userId }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email, input[type="email"]').first().fill(email)
  await page.locator('#password, input[type="password"]').first().fill(password)
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

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: PWResponse) => {
    const req: PWRequest = resp.request()
    reqs.push({ method: req.method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export interface SeededContact {
  id: string
  first_name: string
  last_name: string
  email: string
  title: string | null
  source: string | null
  company_id: string | null
}

export async function seedContact(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    first_name: string
    last_name: string
    email: string
    phone: string
    title: string
    source: string
    company_id: string
  }> = {},
): Promise<SeededContact> {
  const data = {
    first_name: overrides.first_name ?? `Ada${++counter}`,
    last_name: overrides.last_name ?? 'Lovelace',
    email: overrides.email ?? `ada+${Date.now()}-${counter}@example.com`,
    phone: overrides.phone,
    title: overrides.title,
    source: overrides.source,
    company_id: overrides.company_id,
  }
  const res = await page.request.post(`${API_BASE}/contacts`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as SeededContact
  return body
}

export interface SeededCompany {
  id: string
  name: string
  industry: string | null
  size: string | null
}

export async function seedCompany(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    industry: string
    size: string
  }> = {},
): Promise<SeededCompany> {
  const data = {
    name: overrides.name ?? `Acme ${++counter}`,
    industry: overrides.industry ?? 'Tech',
    size: overrides.size ?? '11-50',
  }
  const res = await page.request.post(`${API_BASE}/companies`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as SeededCompany
}

export interface SeededDeal {
  id: string
  title: string
  value: string
  stage: string
  probability: string
  company_id: string | null
  contact_id: string | null
}

export async function seedDeal(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    value: number
    stage: string
    probability: number
    company_id: string
    contact_id: string
  }> = {},
): Promise<SeededDeal> {
  const data = {
    title: overrides.title ?? `Renewal ${++counter}`,
    value: overrides.value ?? 12_500,
    stage: overrides.stage ?? 'qualified',
    probability: overrides.probability ?? 50,
    company_id: overrides.company_id,
    contact_id: overrides.contact_id,
  }
  const res = await page.request.post(`${API_BASE}/deals`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as SeededDeal
}

export async function seedActivity(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    type: string
    subject: string
    contact_id: string
    deal_id: string
    company_id: string
    due_date: string
  }> = {},
): Promise<{ id: string; type: string; subject: string; due_date: string | null }> {
  const data = {
    type: overrides.type ?? 'call',
    subject: overrides.subject ?? `Follow-up ${++counter}`,
    contact_id: overrides.contact_id,
    deal_id: overrides.deal_id,
    company_id: overrides.company_id,
    due_date: overrides.due_date ?? new Date(Date.now() + 86_400_000).toISOString(),
  }
  const res = await page.request.post(`${API_BASE}/activities`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as {
    id: string
    type: string
    subject: string
    due_date: string | null
  }
}
