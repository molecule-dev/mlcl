/**
 * Shared helpers for hr-management e2e tests. Mirrors the
 * accounting-invoicing playbook: a `signup()` that returns an access
 * token, plus thin domain seeders that drive the live API with that
 * token so specs can assert on read-after-write rather than retest the
 * shared form plumbing.
 */
import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3080')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4080') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'hr'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Signup via the live UI form and return the persisted JWT so subsequent
 * page.request.* calls (which use a different cookie jar than the
 * browser) can authenticate as the same user.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<{ email: string; password: string; accessToken: string; userId: string | null }> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').fill('Test')
  await page.locator('input#lastName').fill('User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirm').fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId: string | null = null
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/**
 * Capture every network response while a callback runs. Used to assert
 * which endpoints a UI interaction fired (and that they returned <400).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request(): { method(): string }
    url(): string
    status(): number
  }): void => {
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

// ---------- roster pickers ----------

/** An employee row, in the shape the employee pages read. */
export interface RosterEmployee {
  id: string
  name: string
  status: string
}

/** The roster, read from the same endpoint the employee pages read. */
export async function getEmployees(page: Page, accessToken: string): Promise<RosterEmployee[]> {
  const res = await page.request.get(`${API_BASE}/employees`, { headers: apiHeaders(accessToken) })
  expect(res.status(), 'GET /api/employees').toBe(200)
  return (await res.json()) as RosterEmployee[]
}

/**
 * An employee to drive.
 *
 * Read from the roster, or created through the same POST /api/employees the
 * Add-employee form uses when the roster is empty. Specs never name a demo
 * employee: the demo roster is the first thing an app's owner replaces, and
 * a spec that names one fails on a correct app.
 */
export async function pickEmployee(page: Page, accessToken: string): Promise<RosterEmployee> {
  const roster = await getEmployees(page, accessToken)
  return roster[0] ?? (await seedEmployee(page, accessToken))
}

// ---------- domain seeders ----------

export async function seedEmployee(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    first_name: string
    last_name: string
    title: string
    email: string
    department_name: string
    manager_name: string
    status: string
  }> = {},
): Promise<{ id: string; name: string; status: string }> {
  const first = overrides.first_name ?? `Test${Date.now() % 100000}`
  const last = overrides.last_name ?? `User${++counter}`
  const res = await page.request.post(`${API_BASE}/employees`, {
    headers: apiHeaders(accessToken),
    data: {
      first_name: first,
      last_name: last,
      title: overrides.title ?? 'Engineer',
      email: overrides.email ?? `${first.toLowerCase()}.${last.toLowerCase()}@arbor.example`,
      department_name: overrides.department_name ?? 'Engineering',
      manager_name: overrides.manager_name,
      status: overrides.status ?? 'active',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; name: string; status: string }
  return { id: body.id, name: body.name, status: body.status }
}

export async function seedPto(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    employee_id: string
    type: string
    start_date: string
    end_date: string
    reason: string
  }> = {},
): Promise<{ id: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/pto`, {
    headers: apiHeaders(accessToken),
    data: {
      employee_id: overrides.employee_id,
      type: overrides.type ?? 'vacation',
      start_date: overrides.start_date ?? '2026-06-01',
      end_date: overrides.end_date ?? '2026-06-05',
      reason: overrides.reason ?? 'Family trip',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; status: string }
  return { id: body.id, status: body.status }
}

export async function seedDocument(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    type: string
    category: string
    url: string
    size_label: string
    shared_with: string
  }> = {},
): Promise<{ id: string; name: string; size_label: string; shared_with: string }> {
  const res = await page.request.post(`${API_BASE}/documents`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Policy ${Date.now()}`,
      type: overrides.type ?? 'pdf',
      category: overrides.category ?? 'Policy',
      url: overrides.url ?? 'https://arbor.example/p.pdf',
      size_label: overrides.size_label ?? '120 KB',
      shared_with: overrides.shared_with ?? 'All employees',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as {
    id: string
    name: string
    size_label: string
    shared_with: string
  }
  return body
}
