import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedAlert, signup } from './_helpers.js'

test.describe('/alerts (PriceAlerts) page', () => {
  test('GET /api/alerts on load and shows empty state with no alerts', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/alerts')
      await page.waitForTimeout(1500)
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/alerts(?!\/)/.test(r.url))
    expect(list).toBeTruthy()
    expect(list?.status).toBeLessThan(400)
    await expect(page.getByText(/no tracked routes yet/i)).toBeVisible()
  })

  test('"Add alert" form opens and creates a new alert (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: /add alert/i }).click()
    await page.waitForTimeout(300)

    // 4 inputs visible: origin (text), destination (text), target (number), departure (date)
    await page.locator('input[placeholder="JFK"]').first().fill('LHR')
    await page.locator('input[placeholder="CDG"]').first().fill('JFK')
    await page.locator('input[type="number"]').first().fill('500')
    await page.getByRole('button', { name: /save alert/i }).click()
    await page.waitForTimeout(1500)

    // Read-after-write
    const list = await page.request
      .get(`${API_BASE}/alerts`, { headers: apiHeaders(accessToken) })
      .then((r) => r.json())
    expect(Array.isArray(list)).toBe(true)
    const hit = (
      list as Array<{ origin_iata: string; destination_iata: string; target_price_cents: number }>
    ).find((a) => a.origin_iata === 'LHR' && a.destination_iata === 'JFK')
    expect(hit).toBeTruthy()
    expect(hit?.target_price_cents).toBe(50000)
    // UI re-loaded with the new card
    await expect(page.getByText(/LHR/).first()).toBeVisible()
  })

  test('toggling active state PUTs to /api/alerts/:id and persists (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const alert = await seedAlert(page, accessToken)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForTimeout(1500)

    // Active toggle is the button with aria-pressed=true containing "Active" label.
    const toggle = page
      .locator('button[aria-pressed="true"]')
      .filter({ hasText: /Active/ })
      .first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(800)

    const fetched = (await page.request
      .get(`${API_BASE}/alerts/${alert.id}`, { headers: apiHeaders(accessToken) })
      .then((r) => r.json())) as { active: boolean }
    expect(fetched.active).toBe(false)
  })

  test('deleting an alert removes the row (read-after-write 404)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const alert = await seedAlert(page, accessToken)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForTimeout(1500)

    page.once('dialog', (d) => d.accept())
    await page
      .getByRole('button', { name: /Delete alert/i })
      .first()
      .click()
    await page.waitForTimeout(1000)

    const fetched = await page.request.get(`${API_BASE}/alerts/${alert.id}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(fetched.status()).toBe(404)
  })
})
