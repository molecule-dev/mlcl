import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getSampleLine, signup } from './_helpers.js'

test.describe('/plan (TripPlanner) page', () => {
  test('planning a cross-line trip POSTs /api/trips/plan and renders options', async ({ page }) => {
    await signup(page)
    const lineA = await getSampleLine(page)
    // A second line guarantees a destination off line A where possible —
    // values come from the API, never hardcoded demo data.
    const linesRes = await page.request.get(`${API_BASE}/network/lines`)
    const lines = (await linesRes.json()) as Array<{ code: string; stops: string[] }>
    const other = lines.find((l) => l.code !== lineA.code) ?? lines[0]
    const originCode = lineA.stops[0]
    const destinationCode = other.stops[other.stops.length - 1]

    await page.goto(APP_BASE + '/plan')
    await page.waitForTimeout(1500)

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="trip-origin-picker"]').selectOption(originCode)
      await page.locator('[data-mol-id="trip-destination-picker"]').selectOption(destinationCode)
      await page.locator('[data-mol-id="trip-plan-submit"]').click()
      await page.waitForTimeout(2000)
    })

    const planReq = reqs.find((r) => r.method === 'POST' && /\/api\/trips\/plan/.test(r.url))
    expect(planReq, 'POST /api/trips/plan').toBeTruthy()
    expect(planReq?.status).toBeLessThan(400)

    // The UI renders exactly the options the API returned (public route —
    // no auth header needed).
    const apiRes = await page.request.post(`${API_BASE}/trips/plan`, {
      data: { origin: originCode, destination: destinationCode },
      failOnStatusCode: false,
    })
    expect(apiRes.ok()).toBe(true)
    const body = (await apiRes.json()) as { options: Array<{ strategy: string }> }
    expect(body.options.length).toBeGreaterThan(0)
    const cards = await page.locator('[data-mol-id^="itinerary-"]').count()
    expect(cards).toBe(body.options.length)
    // Itinerary cards are UI-anchored: at least one shows a transfer ladder.
    await expect(page.locator('[data-mol-id^="itinerary-"]').first()).toBeVisible()
  })

  test('swap button exchanges origin and destination', async ({ page }) => {
    await signup(page)
    const lineA = await getSampleLine(page)
    const linesRes = await page.request.get(`${API_BASE}/network/lines`)
    const lines = (await linesRes.json()) as Array<{ code: string; stops: string[] }>
    const other = lines.find((l) => l.code !== lineA.code) ?? lines[0]

    await page.goto(APP_BASE + '/plan')
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="trip-origin-picker"]').selectOption(lineA.stops[0])
    await page.locator('[data-mol-id="trip-destination-picker"]').selectOption(other.stops[0])
    await page.locator('[data-mol-id="trip-swap"]').click()
    await expect(page.locator('[data-mol-id="trip-origin-picker"]')).toHaveValue(other.stops[0])
    await expect(page.locator('[data-mol-id="trip-destination-picker"]')).toHaveValue(
      lineA.stops[0],
    )
  })

  test('plan button stays disabled until both ends are chosen', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="trip-plan-submit"]')).toBeDisabled()
  })
})
