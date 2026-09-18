import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/appointments/:id — Appointment detail', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/appointments/some-id')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders the seeded appointment patient + reason headers', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Find the user's first appointment (seeded on first list call).
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    expect(list.status()).toBeLessThan(400)
    const items = (await list.json()) as Array<{
      id: string
      reason?: string
      patient_name?: string
    }>
    expect(items.length, 'seeded user should have at least one appointment').toBeGreaterThan(0)
    const id = items[0]!.id

    await page.goto(`${APP_BASE}/appointments/${id}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('body')).toContainText(/Test User/i)
  })

  test('Calls GET /api/appointments/:id on load', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/appointments/${id}`)
      await expect(page.locator('body')).toContainText(/Test User/i, { timeout: 15000 })
    })
    const hit = reqs.find((r) => r.method === 'GET' && r.url.includes(`/api/appointments/${id}`))
    expect(hit, 'must call GET /api/appointments/:id').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Cancel-from-detail (UI may not exist) — at minimum back link returns to /appointments', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/appointments`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    const id = items[0]!.id
    await page.goto(`${APP_BASE}/appointments/${id}`)
    const back = page.getByRole('link', { name: /(all\s+appointments|back|appointments)/i }).first()
    await back.click()
    await expect(page).toHaveURL(/\/appointments$/, { timeout: 10000 })
  })
})
