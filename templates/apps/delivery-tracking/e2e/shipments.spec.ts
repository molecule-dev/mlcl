import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, signup } from './_helpers.js'

test.describe('/shipments', () => {
  test('renders the shipments table populated from /api/shipments', async ({ page }) => {
    await signup(page)
    // Both /api/shipments and /api/carriers are fired in parallel from
    // the mount useEffect; gate on BOTH responses arriving rather than
    // just on the heading rendering (the heading can paint before either
    // GET resolves, and `captureNetwork`'s heading-only gate previously
    // raced /api/carriers off the end of the window).
    const shipResponse = page.waitForResponse(
      (r) => /\/api\/shipments(\?|$)/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    const carrierResponse = page.waitForResponse(
      (r) => /\/api\/carriers(\?|$)/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/shipments')
    await expect(page.getByRole('heading', { name: /^Shipments$/i })).toBeVisible()
    const [shipRes, carrierRes] = await Promise.all([shipResponse, carrierResponse])
    expect(shipRes.status(), '/api/shipments must return 200').toBe(200)
    expect(carrierRes.status(), '/api/carriers must return < 400').toBeLessThan(400)

    const { body } = await apiRequest<unknown>(page, 'GET', '/api/shipments')
    const list = asList<any>(body)
    expect(list.length).toBeGreaterThan(0)
    await expect(page.getByText(list[0].tracking_number).first()).toBeVisible()
  })

  test('search filters the visible rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shipments')
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const first = asList(body)[0]
    expect(first).toBeTruthy()
    await page.getByRole('searchbox').fill(first.tracking_number)
    await expect(page.getByText(first.tracking_number).first()).toBeVisible()
    await page.getByRole('searchbox').fill('ZZZ_NO_MATCH_QUERY_XYZ')
    await page.waitForTimeout(300)
    await expect(page.getByText(first.tracking_number)).toHaveCount(0)
  })

  test('status filter chips narrow the table', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shipments')
    await page.getByRole('button', { name: /^Delivered$/i, pressed: false }).click()
    await page.waitForTimeout(300)
    const rows = await page.locator('tbody tr').count()
    if (rows > 0) {
      await expect(page.getByText(/^delivered$/i).first()).toBeVisible()
    }
  })

  test('"+ New shipment" creates a row that persists across reload (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shipments')
    const tracking = `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    await page.getByRole('button', { name: /\+ New shipment/i }).click()
    await page.locator('[data-mol-id="input-tracking"]').fill(tracking)
    await page.locator('[data-mol-id="input-destination"]').fill('Berlin, BE, Germany')
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-new-shipment"]')).toBeHidden({
      timeout: 10_000,
    })

    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/shipments')
    const list = asList(body)
    expect(list.find((s: any) => s.tracking_number === tracking)).toBeTruthy()

    await page.reload()
    await expect(page.getByText(tracking).first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a tracking # opens the shipment detail page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shipments')
    const firstLink = page.locator('tbody tr a').first()
    await expect(firstLink).toBeVisible()
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/\/shipments\//)
    await firstLink.click()
    await expect(page).toHaveURL(/\/shipments\/[a-f0-9-]+/i)
  })
})
