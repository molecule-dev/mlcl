// e2e helpers for iot-device-manager (Filament).
//
// Auth + base-URL plumbing + domain helpers shared across every spec.
// Specs ONLY use the helpers — they never re-implement signup, login, or
// per-route fetches.

import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3240')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4240') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'iot') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up a fresh user via the UI signup form (NAME / EMAIL / PASSWORD,
 * in that document order). After submit the auth client sets an httpOnly
 * `token` cookie and navigates to `/dashboard`. We push to `/dashboard`
 * after to be safe so the AuthGuard shell loads.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const nameInput = page.locator('input[autocomplete="name"]').first()
  if (await nameInput.count().catch(() => 0)) {
    await nameInput.fill('Filament User ' + Date.now().toString().slice(-6))
  }
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  const userId = meResp.ok()
    ? (((await meResp.json()) as { props?: { id?: string } }).props?.id ?? null)
    : null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
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

/** Capture every network response during a block — used for outcome assertions. */
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain helpers (called via page.request with a JWT) ----------

export interface ApiDevice {
  id: string
  owner_id: string
  name: string
  device_type: string
  serial_number: string | null
  firmware_version: string | null
  status: 'online' | 'offline' | 'warning' | 'critical' | 'provisioning' | 'decommissioned'
  last_seen: string | null
  metadata: Record<string, unknown> | string
  created_at: string
}

export async function listDevices(page: Page, accessToken: string): Promise<ApiDevice[]> {
  const res = await page.request.get(`${API_BASE}/devices`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiDevice[]
}

export async function createDeviceApi(
  page: Page,
  accessToken: string,
  body: Partial<ApiDevice> & { name: string },
): Promise<ApiDevice> {
  const res = await page.request.post(`${API_BASE}/devices`, {
    headers: apiHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiDevice
}

export interface ApiFleet {
  id: string
  owner_id: string
  name: string
  description: string | null
  tags: string[] | string | null
  created_at: string
}

export async function listFleets(page: Page, accessToken: string): Promise<ApiFleet[]> {
  const res = await page.request.get(`${API_BASE}/fleets`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiFleet[]
}

export interface ApiFirmwareVersion {
  id: string
  owner_id: string
  version: string
  device_type: string
  release_notes: string | null
  download_url: string | null
  checksum: string | null
  file_size: number
  status: 'draft' | 'published' | 'deprecated'
  released_at: string | null
  created_at: string
}

export async function listFirmware(page: Page, accessToken: string): Promise<ApiFirmwareVersion[]> {
  const res = await page.request.get(`${API_BASE}/firmware`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiFirmwareVersion[]
}

export interface ApiCommand {
  id: string
  device_id: string
  command_type: string
  payload: string | Record<string, unknown>
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'acknowledged' | 'completed' | 'failed' | 'canceled'
  result: unknown
  error_message: string | null
  acknowledged_at: string | null
  completed_at: string | null
  created_at: string
}

export async function listCommands(
  page: Page,
  accessToken: string,
  deviceId?: string,
): Promise<ApiCommand[]> {
  const url = deviceId ? `${API_BASE}/commands?device_id=${deviceId}` : `${API_BASE}/commands`
  const res = await page.request.get(url, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiCommand[]
}

export interface ApiAlert {
  id: string
  owner_id: string
  device_id: string | null
  type: 'offline' | 'anomaly' | 'command_failed' | 'firmware_failed' | 'manual'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  status: 'open' | 'acknowledged' | 'resolved'
  metadata: Record<string, unknown> | string
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
}

export async function listAlerts(page: Page, accessToken: string): Promise<ApiAlert[]> {
  const res = await page.request.get(`${API_BASE}/alerts`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiAlert[]
}

export interface ApiTier {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
  limits: Record<string, unknown>
}

export async function listTiers(page: Page, accessToken: string): Promise<ApiTier[]> {
  const res = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  const body = (await res.json()) as { data: ApiTier[] }
  return body.data
}

export interface ApiBillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, unknown>
  isFree: boolean
}

export async function getBillingStatus(page: Page, accessToken: string): Promise<ApiBillingStatus> {
  const res = await page.request.get(`${API_BASE}/billing/status`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiBillingStatus
}

export interface ApiFleetReport {
  devices_total: number
  devices_online: number
  devices_warning: number
  devices_critical: number
  devices_offline: number
  active_alerts: number
  messages_per_min: number
  firmware_pending: number
  uptime_pct: number
  as_of: string
}

export async function getFleetReport(page: Page, accessToken: string): Promise<ApiFleetReport> {
  const res = await page.request.get(`${API_BASE}/reports/fleet`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiFleetReport
}

/**
 * Issue a per-device bearer token (the plaintext token is shown ONCE in
 * the response and never recoverable later). Returns the plaintext.
 */
export async function issueDeviceToken(
  page: Page,
  accessToken: string,
  deviceId: string,
  label?: string,
): Promise<{ id: string; token: string }> {
  const res = await page.request.post(`${API_BASE}/devices/${deviceId}/tokens`, {
    headers: apiHeaders(accessToken),
    data: { label: label ?? `e2e-${Date.now()}` },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  const body = (await res.json()) as { id: string; token: string }
  expect(body.token, 'token plaintext must be returned at issue').toBeTruthy()
  return body
}

/** Ingest a telemetry point as the device (NOT the user). */
export async function ingestTelemetry(
  page: Page,
  deviceToken: string,
  body: { metric: string; value: number; unit?: string },
): Promise<unknown> {
  const res = await page.request.post(`${API_BASE}/telemetry`, {
    headers: { Authorization: `Bearer ${deviceToken}`, 'Content-Type': 'application/json' },
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return await res.json()
}
