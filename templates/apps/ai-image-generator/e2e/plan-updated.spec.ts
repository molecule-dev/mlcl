import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders confirmation heading and the page loads (no errors)', async ({ page }) => {
    await signup(page, uniqueEmail('plan'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading', { name: /plan has been updated/i })).toBeVisible()
    })
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('renders thank-you heading', async ({ page }) => {
    await signup(page, uniqueEmail('plan'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /Thank you/i })).toBeVisible()
  })

  test('"Return home" link goes to /', async ({ page }) => {
    await signup(page, uniqueEmail('plan'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /Return home/i }).click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
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
