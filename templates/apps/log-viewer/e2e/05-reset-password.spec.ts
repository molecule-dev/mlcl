import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /reset-password — POST /api/users/reset-password.
//
// Without a real token the call fails (401), but the request still
// goes out — this asserts the wiring is in place.

test.describe('/reset-password', () => {
  test('renders form without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo&email=demo@example.com')
    await expect(page.locator('input#reset-token, input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /reset|confirm|submit/i }).first()).toBeVisible()
  })

  test('submitting fires POST /api/users/reset-password', async ({ page }) => {
    const email = uniqueEmail('reset')
    await page.goto(
      APP_BASE + `/reset-password?token=fake-token&email=${encodeURIComponent(email)}`,
    )
    await page.locator('input[type="password"]').first().fill('NewPass1234!')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/users\/reset-password/.test(r.url()),
      { timeout: 10_000 },
    )
    await page
      .getByRole('button', { name: /reset|confirm|submit/i })
      .first()
      .click()
    const resp = await respPromise
    expect(resp, 'POST /api/users/reset-password should fire').toBeDefined()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /sign in|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('token field is pre-filled from query string', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=hello-token&email=x@x.com')
    await expect(page.locator('#reset-token')).toHaveValue('hello-token')
    await expect(page.locator('#reset-email')).toHaveValue('x@x.com')
  })
})
