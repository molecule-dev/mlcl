/**
 * /plan-updated — confirmation page after a successful Stripe Checkout
 * return. Reachable for any authenticated user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated (PlanUpdated)', () => {
  test('renders "Plan updated" + thank-you copy + return-home CTA + auth bootstrap fetches user profile', async ({
    page,
  }) => {
    const sess = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByText(/plan.*updated/i).first()).toBeVisible({ timeout: 15000 })
    })
    await expect(page.getByText(/thank/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /return home/i })).toBeVisible()
    // Auth bootstrap may fetch the user once we land on a protected route
    // — accept either a /api/users/:id refresh OR a refresh-token call.
    const userRefresh = reqs.find(
      (r) => /\/api\/(?:users\/[^/]+|auth\/refresh)/.test(r.url) && r.status < 500,
    )
    expect(
      userRefresh,
      `expected a user/refresh fetch on /plan-updated mount, saw ${JSON.stringify(reqs.slice(-10))}`,
    ).toBeTruthy()
    void sess
  })

  test('return home CTA navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /return home/i }).click()
    await page.waitForURL(/\/(?:dashboard|$|\?)?/, { timeout: 10000 })
    await expect(page).not.toHaveURL(/\/plan-updated/)
  })

  test('return home href is "/"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/')
  })

  test('renders inside an authenticated layout (no redirect to login)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).not.toHaveURL(/\/login/)
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
