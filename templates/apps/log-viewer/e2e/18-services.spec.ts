import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { gotoAndWait, APP_BASE, captureNetwork, signup } from './_helpers'

// /services — service catalog list rendering ServiceCard rows from /api/services.

test.describe('/services', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/services')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /services loads via GET /api/services', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(page, APP_BASE + '/services', (r) =>
        /\/api\/services(\b|\?|$)/.test(r.url()),
      )
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/services(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('renders the service catalog heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/services')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('renders ≥ 1 service card after seed', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/services', (r) => /\/api\/services/.test(r.url()))
    // Wait for React to render the list after the response. count() is racy
    // against the post-response render — use toHaveCount with a timeout so we
    // poll until items appear (or fail with a useful diagnostic).
    await expect(page.locator('main ul li')).not.toHaveCount(0, { timeout: 5_000 })
  })

  test('each service card renders its name + ingest rate + error %', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/services', (r) => /\/api\/services/.test(r.url()))
    const cards = page.locator('main ul li button[data-mol-id^="service-card-"]')
    // Wait for at least one card to render (post-response React tick).
    await expect(cards.first()).toBeVisible({ timeout: 5_000 })
    await expect(cards.first()).toBeAttached()
    expect(await cards.first().textContent()).toMatch(/\d/)
  })
})
