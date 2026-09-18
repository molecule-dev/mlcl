/**
 * Wearable-connection CRUD via the real API.
 *
 * Outcomes:
 * - POST /wearables creates a row visible in GET
 * - PATCH /wearables/:id updates a field
 * - DELETE /wearables/:id removes
 * - User isolation
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

async function linkWearable(
  page: import('@playwright/test').Page,
  accessToken: string,
  provider = 'oura',
) {
  const res = await page.request.post(`${API_BASE}/wearables`, {
    headers: apiHeaders(accessToken),
    data: { provider, external_user_id: 'ext_' + Date.now() },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; provider: string; is_active?: boolean }
}

test('POST /wearables creates a row visible in GET', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await linkWearable(page, accessToken, 'oura')
  expect(seeded.id).toBeTruthy()

  const list = await page.request.get(`${API_BASE}/wearables`, { headers: apiHeaders(accessToken) })
  expect(list.status()).toBe(200)
  const rows = (await list.json()) as { id: string; provider: string }[]
  expect(rows.find((r) => r.id === seeded.id)?.provider).toBe('oura')
})

test('PATCH /wearables/:id updates fields read-after-write', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await linkWearable(page, accessToken, 'fitbit')
  const patch = await page.request.patch(`${API_BASE}/wearables/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    data: { is_active: false },
    failOnStatusCode: false,
  })
  expect(patch.status()).toBe(200)
  const after = await page.request.get(`${API_BASE}/wearables`, {
    headers: apiHeaders(accessToken),
  })
  const rows = (await after.json()) as { id: string; is_active: boolean }[]
  const row = rows.find((r) => r.id === seeded.id)
  expect(row?.is_active).toBe(false)
})

test('DELETE /wearables/:id removes the row', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await linkWearable(page, accessToken)
  const del = await page.request.delete(`${API_BASE}/wearables/${seeded.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(del.status()).toBe(204)

  const list = await page.request.get(`${API_BASE}/wearables`, { headers: apiHeaders(accessToken) })
  const rows = (await list.json()) as { id: string }[]
  expect(rows.find((r) => r.id === seeded.id)).toBeUndefined()
})

test("user B cannot read user A's wearable connections", async ({ page, browser }) => {
  const a = await signup(page)
  const seeded = await linkWearable(page, a.accessToken, 'fitbit')

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const b = await signup(p)
  const list = await p.request.get(`${API_BASE}/wearables`, { headers: apiHeaders(b.accessToken) })
  const rows = (await list.json()) as { id: string }[]
  expect(rows.find((r) => r.id === seeded.id)).toBeUndefined()
  await ctx.close()
})

test('Devices page shows empty-state for a fresh user (no hardcoded sample)', async ({ page }) => {
  const { APP_BASE: appBase } = await import('./_helpers.js')
  await signup(page)
  await page.goto(appBase + '/devices')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/no devices linked/i).first()).toBeVisible({ timeout: 10_000 })
  // The old hardcoded list referenced "Apple Watch Ultra 2" and "Oura Ring Gen4"
  await expect(page.getByText(/Apple Watch Ultra 2/)).toHaveCount(0)
  await expect(page.getByText(/Oura Ring Gen4/)).toHaveCount(0)
})

test('"Connect a device" creates a wearable_connection that GET reflects', async ({ page }) => {
  const { APP_BASE: appBase } = await import('./_helpers.js')
  const { accessToken } = await signup(page)
  await page.goto(appBase + '/devices')
  await page.waitForLoadState('networkidle')

  await page
    .getByRole('button', { name: /connect a device/i })
    .first()
    .click()
  const select = page.locator('select').first()
  await select.selectOption('oura')
  await page.getByRole('button', { name: /^connect$/i }).click()

  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/wearables`, {
          headers: apiHeaders(accessToken),
        })
        const rows = (await res.json()) as { provider: string }[]
        return rows.some((r) => r.provider === 'oura')
      },
      { timeout: 10_000 },
    )
    .toBe(true)
})

test('Pause toggle on a device persists via PATCH /wearables/:id', async ({ page }) => {
  const { APP_BASE: appBase } = await import('./_helpers.js')
  const { accessToken } = await signup(page)
  const seeded = await linkWearable(page, accessToken, 'fitbit')

  await page.goto(appBase + '/devices')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /pause Fitbit/i }).click()

  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/wearables`, {
          headers: apiHeaders(accessToken),
        })
        const rows = (await res.json()) as { id: string; is_active: boolean }[]
        return rows.find((r) => r.id === seeded.id)?.is_active
      },
      { timeout: 10_000 },
    )
    .toBe(false)
})

test('Unlink button removes the wearable_connection', async ({ page }) => {
  const { APP_BASE: appBase } = await import('./_helpers.js')
  const { accessToken } = await signup(page)
  const seeded = await linkWearable(page, accessToken, 'oura')

  await page.goto(appBase + '/devices')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /unlink Oura/i }).click()

  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/wearables/${seeded.id}`, {
          headers: apiHeaders(accessToken),
          failOnStatusCode: false,
        })
        return res.status()
      },
      { timeout: 10_000 },
    )
    .toBe(404)
})
