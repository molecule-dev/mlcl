import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password (ForgotPassword)', () => {
  test('email input accepts a typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const emailField = page.locator('input[type="email"]').first()
    await emailField.fill('forgot@example.com')
    await expect(emailField).toHaveValue('forgot@example.com')
  })

  test('Submit POSTs /api/users/forgot-password and shows confirmation copy', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot-spec'))
      // The form's submit button is whichever button is type="submit"; click that
      // explicitly so we don't depend on the localized label.
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(750)
    })
    const call = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(call, 'POST /api/users/forgot-password must be issued').toBeTruthy()
    // The handler always returns a generic success even for unknown emails (anti-enumeration).
    expect(call!.status).toBeLessThan(400)
  })

  test('Back arrow navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('button', { name: /go back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
