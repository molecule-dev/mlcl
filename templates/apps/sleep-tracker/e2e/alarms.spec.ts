/**
 * Smart-alarm CRUD contract via the real API.
 *
 * Outcomes asserted:
 * - POST /alarms persists; GET /alarms/:id reflects the new row
 * - PATCH /alarms/:id flips a field; GET reflects it
 * - DELETE /alarms/:id removes the row
 * - User isolation: user B cannot read user A's alarms
 * - The /alarm page lists the user's seeded alarm (real GET, not stub)
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedAlarm, signup } from './_helpers.js'

test('POST /alarms creates a real row visible in GET /alarms', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedAlarm(page, accessToken, { label: 'Test wake', alarm_time: '07:15' })
  expect(seeded.id).toBeTruthy()

  const list = await page.request.get(`${API_BASE}/alarms`, { headers: apiHeaders(accessToken) })
  expect(list.status()).toBe(200)
  const rows = (await list.json()) as { id: string; label: string; alarm_time: string }[]
  const found = rows.find((r) => r.id === seeded.id)
  expect(found?.label).toBe('Test wake')
  expect(found?.alarm_time).toBe('07:15')
})

test('PATCH /alarms/:id toggles enabled and changes time', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedAlarm(page, accessToken, { enabled: true })
  const patch = await page.request.patch(`${API_BASE}/alarms/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    data: { enabled: false, alarm_time: '08:00' },
    failOnStatusCode: false,
  })
  expect(patch.status()).toBe(200)
  const after = await page.request.get(`${API_BASE}/alarms/${seeded.id}`, {
    headers: apiHeaders(accessToken),
  })
  const fresh = (await after.json()) as { enabled: boolean; alarm_time: string }
  expect(fresh.enabled).toBe(false)
  expect(fresh.alarm_time).toBe('08:00')
})

test('DELETE /alarms/:id removes the row (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedAlarm(page, accessToken)
  const del = await page.request.delete(`${API_BASE}/alarms/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(del.status()).toBe(204)
  const after = await page.request.get(`${API_BASE}/alarms/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(after.status()).toBe(404)
})

test("user B cannot read user A's alarms", async ({ page, browser }) => {
  const a = await signup(page)
  const seeded = await seedAlarm(page, a.accessToken, { label: "A's alarm" })

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const b = await signup(p)

  const list = await p.request.get(`${API_BASE}/alarms`, { headers: apiHeaders(b.accessToken) })
  const rows = (await list.json()) as { id: string }[]
  expect(rows.find((r) => r.id === seeded.id)).toBeUndefined()
  const detail = await p.request.get(`${API_BASE}/alarms/${seeded.id}`, {
    headers: apiHeaders(b.accessToken),
    failOnStatusCode: false,
  })
  expect(detail.status()).toBe(404)
  await ctx.close()
})

test('zod validation rejects invalid alarm_time', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.post(`${API_BASE}/alarms`, {
    headers: apiHeaders(accessToken),
    data: { alarm_time: '99:99', label: 'broken' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(400)
})

test("SmartAlarm page renders the user's seeded alarm (label + time)", async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedAlarm(page, accessToken, { label: 'Jog alarm', alarm_time: '05:45', enabled: true })

  await page.goto(APP_BASE + '/alarm')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Jog alarm').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('05:45').first()).toBeVisible({ timeout: 15_000 })
})

test('"New alarm" button reveals a form that POSTs and the new alarm appears in the list', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/alarm')
  await page.waitForLoadState('networkidle')

  await page
    .getByRole('button', { name: /new alarm/i })
    .first()
    .click()
  await page.locator('input[type="time"]').fill('07:42')
  const labelInput = page.locator('input[type="text"]').first()
  await labelInput.fill('Sunset weekend')
  await page.getByRole('button', { name: /save alarm/i }).click()

  // Read-after-write via the API: row should exist on this user
  const list = await page.request.get(`${API_BASE}/alarms`, { headers: apiHeaders(accessToken) })
  const rows = (await list.json()) as { label: string; alarm_time: string }[]
  const created = rows.find((r) => r.label === 'Sunset weekend')
  expect(created, JSON.stringify(rows)).toBeTruthy()
  expect(created?.alarm_time).toBe('07:42')

  // And it must render in the page (07:42 → 7:42 AM in the formatted display)
  await expect(page.getByText(/Sunset weekend/i).first()).toBeVisible({ timeout: 10_000 })
})

test('toggling an alarm in the UI persists via PATCH /alarms/:id', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedAlarm(page, accessToken, {
    label: 'Persisted-toggle',
    alarm_time: '06:00',
    enabled: true,
  })
  await page.goto(APP_BASE + '/alarm')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /toggle alarm Persisted-toggle/i }).click()

  // Read-after-write: the row should now be enabled=false
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/alarms/${seeded.id}`, {
          headers: apiHeaders(accessToken),
        })
        const fresh = (await res.json()) as { enabled: boolean }
        return fresh.enabled
      },
      { timeout: 10_000 },
    )
    .toBe(false)
})

test('deleting an alarm from the UI removes it from /alarms', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedAlarm(page, accessToken, { label: 'Delete-me', alarm_time: '05:00' })
  await page.goto(APP_BASE + '/alarm')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /delete alarm Delete-me/i }).click()

  // Read-after-write: the row should be gone
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/alarms/${seeded.id}`, {
          headers: apiHeaders(accessToken),
          failOnStatusCode: false,
        })
        return res.status()
      },
      { timeout: 10_000 },
    )
    .toBe(404)
})
