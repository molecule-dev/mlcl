import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, bookFlight, captureNetwork, getSampleFlight, signup } from './_helpers.js'

test.describe('/trips (My Trips) page', () => {
  test('empty state when user has no trips', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trips')
      await page.waitForTimeout(1500)
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/trips(?!\/)/.test(r.url))
    expect(list, 'GET /api/trips').toBeTruthy()
    expect(list?.status).toBeLessThan(400)
    // No /trips/:id links.
    const tripLinks = await page.locator('[href^="/trips/"]:not([href="/trips"])').count()
    expect(tripLinks).toBe(0)
  })

  test('after booking, a row links to /trips/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    await page.goto(APP_BASE + '/trips')
    await page.waitForTimeout(1500)
    const link = page.locator(`a[href="/trips/${trip.id}"]`).first()
    await expect(link).toBeVisible()
  })

  test('"Search flights" CTA on the empty state navigates to /search', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips')
    await page.waitForTimeout(1200)
    await page.locator('a[href="/search"]').first().click()
    await expect(page).toHaveURL(/\/search/)
  })
})
