import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('plan updated page', () => {
  test('renders confirmation message and return-to-dashboard link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const card = page.locator('[data-mol-id="page-plan-updated"]')
    await expect(card).toBeVisible()
    await expect(card.getByText(/plan.*updated|updated/i).first()).toBeVisible()
    // ContentPageShell puts `data-mol-id` on the hero band; the return CTA
    // lives in the content <main> below it, so scope the link to the page.
    await expect(page.getByRole('link', { name: /dashboard|home|return/i }).first()).toBeVisible()
  })

  test('return-to-dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('[data-mol-id="page-plan-updated"]')).toBeVisible()
    // The return CTA renders in the content <main>, a sibling of the hero
    // band that carries the page's data-mol-id — scope the link to the page.
    await page
      .getByRole('link', { name: /dashboard|home|return/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.locator('[data-mol-id="page-plan-updated"]')).toBeVisible()
    })
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
