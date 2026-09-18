import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /plan-updated — Stripe checkout return page; renders confirmation
// copy + a "Return home" link back to /.

test.describe('/plan-updated', () => {
  test('renders the success heading after signup', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByText(/your plan has been updated/i)).toBeVisible()
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during plan-updated',
    ).toBeUndefined()
  })

  test('renders the thank-you copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/thank you/i)).toBeVisible()
  })

  test('"Return home" link navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: /return home/i }).click()
    await expect(page).toHaveURL(
      new RegExp(`^${APP_BASE.replace(/[.*+?^${}()|[\\]/g, '\\$&')}/?(\\?.*)?$`),
    )
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
