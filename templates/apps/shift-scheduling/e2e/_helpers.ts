/**
 * Shared helpers for shift-scheduling e2e tests. Mirrors the hr-management
 * playbook: a `signup()` that returns an access token, plus thin domain
 * seeders that drive the live API with that token so specs can assert on
 * read-after-write rather than retest the shared form plumbing.
 */
import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3080')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4080') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'shift'): string {
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

// ---------- week math (mirrors the API's Monday-based helpers) ----------

export function weekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

/** A date `offsetWeeks` weeks out from the current Monday, on weekday `day` (0=Mon … 6=Sun). */
export function weekDate(offsetWeeks: number, day: number): string {
  const d = new Date(`${weekStart()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offsetWeeks * 7 + day)
  return d.toISOString().slice(0, 10)
}

// ---------- roster pickers ----------

/** A staff row, in the shape the staff page reads. */
export interface RosterStaff {
  id: string
  name: string
  role: string
  status: string
}

/** The roster, read from the same endpoint the staff page reads. */
export async function getStaff(page: Page, accessToken: string): Promise<RosterStaff[]> {
  const res = await page.request.get(`${API_BASE}/staff`, { headers: apiHeaders(accessToken) })
  expect(res.status(), 'GET /api/staff').toBe(200)
  return (await res.json()) as RosterStaff[]
}

/**
 * A staff member to drive.
 *
 * Read from the roster, or created through the same POST /api/staff the
 * add-staff form uses when the roster is empty. Specs never name a demo
 * person: the demo roster is the first thing an app's owner replaces, and
 * a spec that names one fails on a correct app.
 */
export async function pickStaff(page: Page, accessToken: string, offset = 0): Promise<RosterStaff> {
  const roster = await getStaff(page, accessToken)
  return roster[offset] ?? (await seedStaff(page, accessToken))
}

// ---------- domain seeders ----------

export async function seedStaff(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    first_name: string
    last_name: string
    role: string
    email: string
    max_weekly_hours: number
    status: string
  }> = {},
): Promise<{ id: string; name: string; role: string; status: string }> {
  const first = overrides.first_name ?? `Test${Date.now() % 100000}`
  const last = overrides.last_name ?? `User${++counter}`
  const res = await page.request.post(`${API_BASE}/staff`, {
    headers: apiHeaders(accessToken),
    data: {
      first_name: first,
      last_name: last,
      role: overrides.role ?? 'Barista',
      email: overrides.email ?? `${first.toLowerCase()}.${last.toLowerCase()}@shiftly.example`,
      max_weekly_hours: overrides.max_weekly_hours ?? 40,
      status: overrides.status ?? 'active',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; name: string; role: string; status: string }
  return body
}

export interface SeededShift {
  id: string
  staff_id: string | null
  date: string
  time_label: string
  published: boolean
}

/**
 * Create the shift through the same POST /api/shifts the schedule composer
 * uses. `day` is 0=Mon … 6=Sun inside `offsetWeeks` from the current week;
 * published defaults to true so the shift is immediately claimable.
 */
export async function seedShift(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    staff_id: string | null
    role: string
    date: string
    start_time: string
    end_time: string
    published: boolean
    notes: string
  }> = {},
): Promise<SeededShift> {
  const res = await page.request.post(`${API_BASE}/shifts`, {
    headers: apiHeaders(accessToken),
    data: {
      staff_id: overrides.staff_id ?? null,
      role: overrides.role ?? 'Barista',
      date: overrides.date ?? weekDate(1, 0),
      start_time: overrides.start_time ?? '10:00',
      end_time: overrides.end_time ?? '18:00',
      published: overrides.published ?? true,
      notes: overrides.notes ?? '',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as SeededShift
  return body
}

/** Submit a swap/drop request through POST /api/swap-requests. */
export async function seedSwapRequest(
  page: Page,
  accessToken: string,
  args: {
    from_shift: string
    requester_staff_id: string
    kind: 'swap' | 'drop'
    target_staff_id?: string | null
    note?: string
  },
): Promise<{ id: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/swap-requests`, {
    headers: apiHeaders(accessToken),
    data: {
      kind: args.kind,
      from_shift: args.from_shift,
      requester_staff_id: args.requester_staff_id,
      target_staff_id: args.target_staff_id ?? null,
      note: args.note ?? 'e2e request',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; status: string }
  return body
}

/** Claim an open shift through POST /api/claims (lands pending). */
export async function claimShift(
  page: Page,
  accessToken: string,
  shiftId: string,
  staffId: string,
): Promise<{ id: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/claims`, {
    headers: apiHeaders(accessToken),
    data: { shift_id: shiftId, staff_id: staffId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; status: string }
  return body
}
