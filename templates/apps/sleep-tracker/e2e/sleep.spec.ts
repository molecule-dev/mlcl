/**
 * Sleep-log CRUD contract via the real API.
 *
 * Outcomes asserted:
 * - POST /sleep creates a real sleep_logs row scoped to the user
 * - GET /sleep returns it
 * - PATCH /sleep/:id mutates a field that GET reflects
 * - DELETE /sleep/:id removes it (read-after-write)
 * - User isolation: user B cannot see user A's logs
 * - Dashboard shows the seeded log's score / date after navigating
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedSleepLog, signup } from './_helpers.js'

test('POST /sleep creates a row visible in GET /sleep', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedSleepLog(page, accessToken, { quality_score: 88 })
  expect(seeded.id).toBeTruthy()

  const list = await page.request.get(`${API_BASE}/sleep`, { headers: apiHeaders(accessToken) })
  expect(list.status()).toBe(200)
  const items = (await list.json()) as { id: string; quality_score: number }[]
  const found = items.find((r) => r.id === seeded.id)
  expect(found, 'seeded sleep log should appear in GET /sleep').toBeTruthy()
  expect(found?.quality_score).toBe(88)
})

test('PATCH /sleep/:id updates a field that GET reflects', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedSleepLog(page, accessToken, { quality_score: 70 })

  const patchRes = await page.request.patch(`${API_BASE}/sleep/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    data: { quality_score: 95, notes: 'updated via test' },
    failOnStatusCode: false,
  })
  expect(patchRes.status()).toBe(200)

  const getRes = await page.request.get(`${API_BASE}/sleep/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(getRes.status()).toBe(200)
  const fresh = (await getRes.json()) as { quality_score: number; notes: string }
  expect(fresh.quality_score).toBe(95)
  expect(fresh.notes).toBe('updated via test')
})

test('DELETE /sleep/:id removes the row (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedSleepLog(page, accessToken)

  const del = await page.request.delete(`${API_BASE}/sleep/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(del.status()).toBe(204)

  const after = await page.request.get(`${API_BASE}/sleep/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(after.status()).toBe(404)
})

test("user B cannot read user A's sleep logs", async ({ page, browser }) => {
  const a = await signup(page)
  const seeded = await seedSleepLog(page, a.accessToken)

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const b = await signup(p)

  // GET list — must be empty for B
  const listB = await p.request.get(`${API_BASE}/sleep`, { headers: apiHeaders(b.accessToken) })
  expect(listB.status()).toBe(200)
  const itemsB = (await listB.json()) as unknown[]
  expect(itemsB.find((r: unknown) => (r as { id: string }).id === seeded.id)).toBeUndefined()

  // Direct GET by id — must 404 for B
  const detail = await p.request.get(`${API_BASE}/sleep/${seeded.id}`, {
    headers: apiHeaders(b.accessToken),
    failOnStatusCode: false,
  })
  expect(detail.status()).toBe(404)
  await ctx.close()
})

test('Dashboard fetches /api/sleep and /api/stats/overview after signup', async ({ page }) => {
  await signup(page)
  let sleepCalled = false
  let statsCalled = false
  page.on('response', (resp) => {
    if (/\/api\/sleep(\?|$)/.test(resp.url()) && resp.request().method() === 'GET')
      sleepCalled = true
    if (/\/api\/stats\/overview/.test(resp.url())) statsCalled = true
  })
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')
  expect(sleepCalled, 'dashboard should issue GET /api/sleep on load').toBe(true)
  expect(statsCalled, 'dashboard should issue GET /api/stats/overview on load').toBe(true)
})

test('GET /stats/overview returns a stats payload for an empty user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/stats/overview?days=7`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as Record<string, unknown>
  expect(body).toBeTruthy()
})

test('GET /stats/trends returns 200 for an authenticated user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/stats/trends?days=30`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
})

test('seeded log appears in the dashboard recent-nights list', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedSleepLog(page, accessToken, {
    quality_score: 73,
    sleep_date: new Date().toISOString().slice(0, 10),
  })

  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')

  // The dashboard renders score values inside generic boxes; the score we
  // chose (73) is unique vs the SAMPLE_RECENT defaults so this is a real
  // signal that real data is rendering, not the placeholder fallback.
  // (Sample scores are 87/79/64/91; 73 is none of them.)
  // The score appears in both the hero card and the recent-nights row.
  await expect(page.getByText(/^73$/).first()).toBeVisible({ timeout: 15_000 })
  // And there should be more than one match (hero + row), proving real data wired through
  await expect(page.getByText(/^73$/)).toHaveCount(2, { timeout: 15_000 })
})
