import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the confirmation heading once auth state initializes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
  })

  test('return-home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const home = page.getByRole('link', { name: /home|return/i }).first()
    await home.click()
    await expect(page).toHaveURL(/\/$|\/files$/)
  })

  test('reflects current /api/billing/status planKey via subsequent fetch', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/users\/me/.test(r.url))).toBeTruthy()
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status', { credentials: 'include' })
      return await res.json()
    })
    expect(typeof (status as { planKey?: unknown }).planKey).toBe('string')
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
