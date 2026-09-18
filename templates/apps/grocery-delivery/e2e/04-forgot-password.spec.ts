import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /forgot-password — email field, calls POST /api/users/forgotPassword
// (mailgun sandbox in env). Real users see a "check your inbox" message.

test.describe('/forgot-password', () => {
  test('renders email field and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link|submit/i })).toBeVisible()
  })

  test('submitting an existing email triggers POST /api/users/forgotPassword and shows success', async ({
    page,
  }) => {
    // Sign up first so the email is real. Then nav to forgot-password,
    // submit, and verify the network call fired with 2xx.
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('textbox', { name: /email/i }).fill(email)
      await page.getByRole('button', { name: /send reset link|submit/i }).click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/(forgot-password|forgotPassword)/i.test(r.url),
    )
    expect(call, 'POST /api/users/forgot-password should fire').toBeDefined()
    expect(call!.status).toBeLessThan(400)
    // UI swaps in the "check your inbox" success body
    await expect(page.getByText(/check your inbox|email is registered/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
