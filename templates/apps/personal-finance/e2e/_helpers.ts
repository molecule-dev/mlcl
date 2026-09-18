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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3150')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4150') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'pfe2e') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up via the UI form. Personal-finance lands on / (Dashboard) post-signup. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').first().fill(email)
  await page
    .locator('input[autocomplete="new-password"], input[type="password"]')
    .first()
    .fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // See virtual-classroom/_helpers.ts for the auth-race rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL((u) => !/\/signup|\/login/.test(u.pathname), { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
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
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in via the UI form. Same auth-race hardening as signup(). */
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

/** Fail if any console.error fires during fn (allowing benign third-party noise). */
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

export interface SeededAccount {
  id: string
  name: string
  type: string
  balance: number | string
  institution: string | null
  currency: string
}

export async function seedAccount(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan'
    institution: string
    account_number: string
    currency: string
    initial_balance: number
  }> = {},
): Promise<SeededAccount> {
  const res = await page.request.post(`${API_BASE}/accounts`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Test Account ${Date.now()}-${++counter}`,
      type: overrides.type ?? 'checking',
      institution: overrides.institution ?? 'Test Bank',
      account_number: overrides.account_number ?? `${Date.now()}${counter}`,
      currency: overrides.currency ?? 'USD',
      initial_balance: overrides.initial_balance ?? 1000,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededAccount
}

export interface SeededCategory {
  id: string
  name: string
  type: string
  color: string
  icon: string
}

export async function seedCategory(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    type: 'income' | 'expense'
    color: string
    icon: string
    parent_id: string
  }> = {},
): Promise<SeededCategory> {
  const res = await page.request.post(`${API_BASE}/categories`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Test Category ${Date.now()}-${++counter}`,
      type: overrides.type ?? 'expense',
      color: overrides.color ?? '#10b981',
      icon: overrides.icon ?? 'shopping_bag',
      parent_id: overrides.parent_id ?? null,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededCategory
}

export interface SeededTransaction {
  id: string
  amount: number | string
  description: string
  date: string
  type: string
  account_id: string
  category_id: string | null
}

export async function seedTransaction(
  page: Page,
  accessToken: string,
  args: {
    account_id: string
    category_id?: string | null
    amount?: number
    description?: string
    date?: string
    type?: 'income' | 'expense' | 'transfer'
  },
): Promise<SeededTransaction> {
  const res = await page.request.post(`${API_BASE}/transactions`, {
    headers: apiHeaders(accessToken),
    data: {
      account_id: args.account_id,
      category_id: args.category_id ?? null,
      amount: args.amount ?? 25,
      description: args.description ?? 'E2E test transaction',
      date: args.date ?? new Date().toISOString().slice(0, 10),
      type: args.type ?? 'expense',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededTransaction
}

export interface SeededBudget {
  id: string
  category_id: string
  amount: number | string
  month: number
  year: number
}

export async function seedBudget(
  page: Page,
  accessToken: string,
  args: {
    category_id: string
    amount?: number
    month?: number
    year?: number
  },
): Promise<SeededBudget> {
  const now = new Date()
  const res = await page.request.post(`${API_BASE}/budgets`, {
    headers: apiHeaders(accessToken),
    data: {
      category_id: args.category_id,
      amount: args.amount ?? 500,
      month: args.month ?? now.getMonth() + 1,
      year: args.year ?? now.getFullYear(),
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededBudget
}

export interface SeededGoal {
  id: string
  name: string
  target_amount: number | string
  current_amount: number | string
  target_date: string | null
  icon: string | null
}

export async function seedGoal(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    target_amount: number
    current_amount: number
    target_date: string
    icon: string
  }> = {},
): Promise<SeededGoal> {
  const res = await page.request.post(`${API_BASE}/goals`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Test Goal ${Date.now()}-${++counter}`,
      target_amount: overrides.target_amount ?? 5000,
      current_amount: overrides.current_amount ?? 100,
      target_date: overrides.target_date ?? '2030-12-31',
      icon: overrides.icon ?? 'savings',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededGoal
}
