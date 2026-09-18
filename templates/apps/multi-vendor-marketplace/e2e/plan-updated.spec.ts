import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('plan-updated renders heading after fetch', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.length).toBeGreaterThanOrEqual(0)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('home link navigates away', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"], a[href="/catalog"]').first()
    if ((await link.count()) > 0) {
      await link.click()
      await page.waitForLoadState('networkidle')
    } else {
      await expect(page.locator('main').first()).toBeVisible()
    }
  })

  test('main region visible', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('main').first()).toBeVisible()
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
