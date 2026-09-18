import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders thank-you copy and a link back home for an authenticated user', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated?session_id=cs_test_dummy')
    // Page renders message + thank-you headings + Return home button.
    await expect(page.getByRole('button', { name: /Return home|Home/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('Return home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated?session_id=cs_test_dummy')
    await page.getByRole('button', { name: /Return home|Home/i }).click()
    await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 10000 })
  })

  test('does not fire any /api/billing or /api/users mutations on mount (purely informational)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated?session_id=cs_test_dummy')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const mutations = reqs.filter(
      (r) => /\/api\/(billing|users)\//.test(r.url) && /POST|PUT|PATCH|DELETE/.test(r.method),
    )
    expect(mutations.length, 'plan-updated must not auto-mutate user/billing state').toBe(0)
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
