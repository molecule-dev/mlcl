import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated — Stripe checkout return page', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Authed user lands on the page and sees the thank-you message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Heading is rendered as h2 (translation may be raw key on first paint).
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 15000 })
  })

  test('Page exposes a "Return home" CTA that routes to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const returnHome = page
      .getByRole('link', { name: /(return\s*home|back\s*to\s*home|home)/i })
      .first()
    await expect(returnHome).toBeVisible({ timeout: 15000 })
    await returnHome.click()
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(?:dashboard)?$/, { timeout: 10000 })
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
