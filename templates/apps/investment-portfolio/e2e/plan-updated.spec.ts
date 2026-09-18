import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders for authenticated user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toMatch(/TypeError|Cannot|Internal Server Error/i)
  })

  test('"Return home" / "Continue" link navigates to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('button', { name: /home|dashboard|continue/i }).first()
    const linkAlt = page.getByRole('link', { name: /home|dashboard|continue/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
    } else if ((await linkAlt.count()) > 0) {
      await linkAlt.click()
    } else {
      test.skip(true, 'no return-home control on plan-updated')
      return
    }
    await page.waitForTimeout(1500)
    expect(page.url()).toMatch(/\/dashboard/)
  })

  test('plan-updated reflects post-checkout state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated?session_id=cs_test_dummy')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    // Should mention plan/subscription/upgrade
    expect(text).toMatch(/plan|subscription|upgrade|Pro|thank|confirmed/i)
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
