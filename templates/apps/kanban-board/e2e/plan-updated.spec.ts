import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the confirmation message after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Either the i18n key or its default English value renders.
    const heading = page.getByText(/planUpdated\.message|Your plan|plan has been updated/i).first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
  })

  test('renders the thank-you heading after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const heading = page.getByText(/planUpdated\.thankYou|Thank you|Thanks/i).first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
  })

  test('return-home link navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page
      .getByRole('link')
      .filter({ hasText: /planUpdated\.returnHome|Home|Return/i })
      .first()
    await link.click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
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
