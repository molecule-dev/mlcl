import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/webhooks — fetches /api/webhooks (handler returns hardcoded
// catalog). First event is auto-expanded. Clicking the row toggles
// open/close and the SAMPLE_PAYLOAD section appears when open.

test.describe('/docs/webhooks', () => {
  test('GET /api/webhooks fires + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/webhooks')
      await page.getByRole('heading', { name: /Event subscriptions/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/webhooks(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/webhooks should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('first event is auto-expanded; clicking it collapses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/webhooks')
    await page.getByRole('heading', { name: /Event subscriptions/i }).waitFor({ timeout: 15_000 })
    const firstExpanded = page.locator('button[aria-expanded="true"]').first()
    await expect(firstExpanded).toBeVisible({ timeout: 15_000 })
    await firstExpanded.click()
    // After click, that same row should now be collapsed (aria-expanded=false)
    await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(0)
  })

  test('SAMPLE_PAYLOAD label is visible when an event is expanded', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/webhooks')
    await page.getByRole('heading', { name: /Event subscriptions/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/SAMPLE_PAYLOAD/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
