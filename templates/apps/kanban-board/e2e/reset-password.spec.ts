import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers.js'

/**
 * The /reset-password flow needs a real signed token from the backend
 * (which we cannot mint here). These tests instead prove the form is
 * mounted, the inputs accept values, the params get prefilled, and the
 * cross-page links work — the actual token-confirm round-trip is exercised
 * end-to-end by the molecule user-resource tests.
 */
test.describe('/reset-password', () => {
  test('email field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const email = page.getByLabel(/Work email/i)
    await email.fill('user@example.com')
    await expect(email).toHaveValue('user@example.com')
  })

  test('Recovery code field accepts a value (and prefills from ?token=)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc123')
    const token = page.getByLabel(/Recovery code/i)
    await expect(token).toHaveValue('abc123')
    await token.fill('zxc999')
    await expect(token).toHaveValue('zxc999')
  })

  test('New-password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.getByLabel(/New password/i)
    await pw.fill('NewSecret1!')
    await expect(pw).toHaveValue('NewSecret1!')
  })

  test('submit with bogus token fires a backend request and does not land on /dashboard', async ({
    page,
  }) => {
    // A bogus token is EXPECTED to 401 from the backend — that is the
    // behavior under test (rejected, no navigation). Silence the console
    // guard for exactly that response.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(
      APP_BASE + '/reset-password?token=bogus-token-for-test&email=nobody@example.com',
    )
    await page.getByLabel(/New password/i).fill('NewSecret1!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password & sign in/i }).click()
      await page.waitForTimeout(2500)
    })
    // We should NOT have navigated to /dashboard with a bogus token.
    await expect(page).toHaveURL(/\/reset-password/)
    // SOME backend call fired (the molecule auth client routes confirmReset
    // through the configured `resetPasswordEndpoint`, which may be the
    // default `/auth/password/reset/confirm` if the app didn't override it).
    const apiCall = reqs.find(
      (r) => /\/api\//.test(r.url) && ['PATCH', 'POST', 'PUT'].includes(r.method),
    )
    expect(apiCall, 'a backend request should have fired on submit').toBeTruthy()
  })

  test('"Sign in" footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
