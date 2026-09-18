/**
 * Shared helpers for the employee-onboarding flagship e2e specs. Every
 * spec imports from here rather than rewriting auth/network plumbing.
 *
 * The sign-up form has First name + Last name + Email + Password +
 * Confirm-password fields; `signup()` drives the full UI form and harvests
 * the JWT bearer token from localStorage so callers can drive
 * `page.request.*` with bearer auth and exercise the JSON API directly.
 *
 * @module
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || `http://localhost:${process.env.VITE_PORT || '3000'}`
export const API_BASE =
  process.env.API_BASE || `http://localhost:${process.env.API_PORT || '4000'}/api`

let counter = 0
export function uniqueEmail(prefix = 'embark'): string {
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

/**
 * Sign up a fresh user via the UI. Returns the credentials AND the JWT
 * bearer token persisted to localStorage so callers can drive page.request
 * with bearer auth.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Test',
  lastName = 'User',
): Promise<{
  email: string
  password: string
  firstName: string
  lastName: string
  accessToken: string | null
  userId: string | null
}> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const textBoxes = page.locator('input[type="text"]')
  if ((await textBoxes.count()) >= 2) {
    await textBoxes.nth(0).fill(firstName)
    await textBoxes.nth(1).fill(lastName)
  }
  await page.locator('input[type="email"]').first().fill(email)
  const pwBoxes = page.locator('input[type="password"]')
  await pwBoxes.nth(0).fill(password)
  if ((await pwBoxes.count()) > 1) {
    await pwBoxes.nth(1).fill(password)
  }
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up|join/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 45000 })
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  return { email, password, firstName, lastName, accessToken, userId }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|continue/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
}

/** Capture all network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

interface OnboardingTaskApi {
  id: string
  title: string
  description?: string | null
  category?: string
  due_date?: string | null
  status: string
}

interface DocumentApi {
  id: string
  name: string
  signed?: boolean
  signed_at?: string | null
  requires_signature?: boolean
  category?: string
}

interface NotificationApi {
  id: string
  read_at?: string | null
  kind: string
  title?: string | null
}

interface MeApi {
  user: { id: string; email?: string | null; name?: string | null; firstName?: string | null }
  onboarding: { id: string; start_date: string; status: string }
  counts: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
    totalMilestones: number
    achievedMilestones: number
  }
  derived: { completionPct: number; dayNumber: number }
}

export async function getMe(page: Page, accessToken: string | null): Promise<MeApi> {
  const r = await page.request.get(`${API_BASE}/onboardings/me`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as MeApi
}

export async function listTasks(
  page: Page,
  accessToken: string | null,
): Promise<OnboardingTaskApi[]> {
  const r = await page.request.get(`${API_BASE}/tasks`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as OnboardingTaskApi[]
}

export async function listDocuments(
  page: Page,
  accessToken: string | null,
): Promise<DocumentApi[]> {
  const r = await page.request.get(`${API_BASE}/documents`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as DocumentApi[]
}

export async function listNotifications(
  page: Page,
  accessToken: string | null,
): Promise<NotificationApi[]> {
  const r = await page.request.get(`${API_BASE}/notifications`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as NotificationApi[]
}

export type { DocumentApi, MeApi, NotificationApi, OnboardingTaskApi }
