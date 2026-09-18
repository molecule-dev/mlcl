import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getSampleFlight, signup } from './_helpers.js'

test.describe('/flight/:id (FlightDetail) page', () => {
  test('renders flight info and links to /book/:id', async ({ page }) => {
    await signup(page)
    const flight = await getSampleFlight(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/flight/${flight.id}`)
      await page.waitForTimeout(1200)
    })
    const detail = reqs.find((r) => /\/api\/flights\/[^/]+$/.test(r.url) && r.method === 'GET')
    expect(detail, 'GET /api/flights/:id').toBeTruthy()
    expect(detail?.status).toBeLessThan(400)
    await expect(page.locator('[href^="/book/"]').first()).toBeVisible()
  })

  test('"Back to results" returns to /search', async ({ page }) => {
    await signup(page)
    const flight = await getSampleFlight(page)
    await page.goto(APP_BASE + `/flight/${flight.id}`)
    await page.waitForTimeout(800)
    await page
      .getByRole('link', { name: /back to results/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('clicking "Continue to booking" lands on /book/:id with same id', async ({ page }) => {
    await signup(page)
    const flight = await getSampleFlight(page)
    await page.goto(APP_BASE + `/flight/${flight.id}`)
    // The CTA carries the passenger count (/book/:id?passengers=1), so match the
    // path prefix rather than the exact href — and drop the fixed sleep for a
    // locator that waits.
    const cta = page.locator(`a[href^="/book/${flight.id}"]`).first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(new RegExp(`/book/${flight.id}(\\?|$)`))
  })
})
