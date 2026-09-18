import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('bookings list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookings')
  })

  test('renders a heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/bookings', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/bookings')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/bookings\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('empty-state CTA routes to /sitters', async ({ page }) => {
    const link = page.getByRole('link', { name: /book|sitter|browse/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/sitters/)
    }
  })
})
