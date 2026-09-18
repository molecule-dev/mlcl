import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('auth recovery', () => {
  test('forgot-password form posts email and shows the success state', async ({ page }) => {
    const email = uniqueEmail('na-forgot')
    await signup(page, email)
    // Sign back out before exercising recovery so we can prove the flow
    // works for a plain visitor — sign out from settings.
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/)

    await page.goto(APP_BASE + '/forgot-password')

    const emailInput = page.locator('#forgot-email, input[type="email"]').first()
    await expect(emailInput).toBeVisible()
    await emailInput.fill(email)

    // The submit button is the only primary action on the form.
    const submit = page.getByRole('button', { name: /reset|send|submit|email me/i }).first()
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/(reset-password|password-reset|forgot|recovery)/i.test(r.url()) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      submit.click(),
    ])
    // The molecule-package handler always returns 2xx (so attackers can't
    // enumerate emails). The user-visible success signal is the form's
    // "Check your email" confirmation state.
    expect(resp.status()).toBeLessThan(500)
    await expect(page.getByText(/check your email|check.*inbox|reset link/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('forgot-password "Back to sign in" navigates back to /login', async ({ page }) => {
    const email = uniqueEmail('na-forgot-back')
    await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/)

    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#forgot-email, input[type="email"]').first().fill(email)
    await page
      .getByRole('button', { name: /reset|send|submit|email me/i })
      .first()
      .click()
    await expect(page.getByText(/check your email|check.*inbox|reset link/i).first()).toBeVisible()
    await page
      .getByRole('button', { name: /back to sign in|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('reset-password page renders with a token query param and shows the form', async ({
    page,
  }) => {
    // The molecule reset-password page accepts ?token=... and renders a
    // password+confirm form. We just need to prove the route loads and
    // shows recognisable UI (heading + form + submit).
    await page.goto(APP_BASE + '/reset-password?token=fake-test-token')
    await expect(
      page.getByRole('heading', { name: /reset|new password|choose/i }).first(),
    ).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByRole('button', { name: /reset.*password|set.*password/i }).first(),
    ).toBeVisible()
  })

  test('reset-password without a token surfaces an error state, not a crash', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    // Either an error/copy state or a back-to-login control should render.
    const link = page.getByRole('link', { name: /sign in|log in|forgot/i }).first()
    const button = page.getByRole('button', { name: /sign in|back|forgot/i }).first()
    const visible =
      (await link.isVisible().catch(() => false)) || (await button.isVisible().catch(() => false))
    expect(visible).toBe(true)
  })
})
