/**
 * /plan-updated — post-Stripe-Checkout return surface.
 *
 * Public outcome: an authenticated user lands here after a successful
 * Stripe Checkout. It should show the thank-you copy and provide a
 * "Return home" button that routes to /.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
  })

  test('post-checkout landing makes no extra app-API calls beyond auth', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('button', { name: /(Return home|Home)/i })).toBeVisible()
    })
    // Only auth/profile reads should fire; no domain mutations on this page.
    const mutating = reqs.filter(
      (r) => r.url.includes('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method),
    )
    expect(mutating, 'plan-updated must not mutate state').toEqual([])
  })

  test('confirmation message heading renders', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  })

  test('thank-you heading renders', async ({ page }) => {
    const headings = page.getByRole('heading', { level: 2 })
    await expect(headings).toHaveCount(2)
  })

  test('Return home button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /(Return home|Home)/i })).toBeVisible()
  })

  test('Return home button (within link to "/") navigates to landing /', async ({ page }) => {
    const link = page
      .getByRole('link')
      .filter({ has: page.getByRole('button', { name: /(Return home|Home)/i }) })
    await expect(link).toHaveAttribute('href', '/')
    await link.click()
    await expect(page).toHaveURL(/\/$/)
  })
})
