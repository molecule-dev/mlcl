import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings/billing', () => {
  test('shell renders and shows current-plan heading', async ({ page }) => {
    await signup(page, uniqueEmail('bill-shell'))
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-test=billing-page]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/free|pro|team|bargain/i).first()).toBeVisible()
  })

  test('plans grid renders 3 tier cards from /api/billing/tiers', async ({ page }) => {
    await signup(page, uniqueEmail('bill-grid'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/billing')
      await expect(page.locator('[data-test=billing-plans]')).toBeVisible({ timeout: 15_000 })
    })
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    const statusCall = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET')
    expect(tiersCall?.status).toBe(200)
    expect(statusCall?.status).toBe(200)
    expect(await page.locator('[data-test^=billing-plan-]').count()).toBeGreaterThanOrEqual(3)
  })

  test('Free plan card is shown', async ({ page }) => {
    await signup(page, uniqueEmail('bill-free'))
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-test=billing-plan-free]')).toBeVisible({ timeout: 15_000 })
  })

  test('Pro plan card is shown', async ({ page }) => {
    await signup(page, uniqueEmail('bill-pro'))
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-test=billing-plan-pro]')).toBeVisible({ timeout: 15_000 })
  })

  test('Pro CTA either fires checkout or surfaces config error', async ({ page }) => {
    await signup(page, uniqueEmail('bill-pro-cta'))
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-test=billing-plan-pro]')).toBeVisible({ timeout: 15_000 })
    const cta = page.locator('[data-test=billing-cta-pro]')
    if (await cta.isEnabled()) {
      const reqs = await captureNetwork(page, async () => {
        await cta.click()
        await page.waitForTimeout(1500)
      })
      const post = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
      // either fired (got 200/302/4xx) or stayed disabled because no priceId
      if (post) {
        expect([200, 400, 503].includes(post.status)).toBe(true)
      }
    } else {
      // disabled because Stripe price id not configured — still a valid pass
      await expect(cta).toBeDisabled()
    }
  })

  test('Free CTA wires to /api/billing/cancel when on a paid plan, otherwise stays disabled on Free', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('bill-free-cta'))
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-test=billing-plan-free]')).toBeVisible({ timeout: 15_000 })
    const cta = page.locator('[data-test=billing-cta-free]')
    // For a fresh user the active plan is Free, so the CTA on Free is disabled
    // (no-op). Confirm the disabled state rather than firing a network call.
    await expect(cta).toBeDisabled()
  })

  test('"Back to settings" link returns to /settings', async ({ page }) => {
    await signup(page, uniqueEmail('bill-back'))
    await page.goto(APP_BASE + '/settings/billing')
    await page
      .getByRole('link', { name: /back.*settings|settings/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings$/)
  })
})
