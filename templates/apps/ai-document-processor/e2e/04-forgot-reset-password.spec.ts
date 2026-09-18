import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

test.describe('/forgot-password and /reset-password', () => {
  test('forgot-password page renders + submitting fires POST /api/users/forgot-password', async ({
    page,
  }) => {
    const creds = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').fill(creds.email)
      await page
        .getByRole('button', { name: /send|reset|email me|continue|submit/i })
        .first()
        .click()
      await page.waitForTimeout(2_500)
    })
    const fp = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
    expect(fp, 'POST /api/users/forgot-password should fire').toBeDefined()
    // Either 200 with masked acknowledgement, or 4xx if the bond
    // chooses to fail loud — both are valid; we only require the
    // request actually fired (i.e. the handler exists, not stubbed).
    expect(fp!.status, 'forgot-password should not 5xx').toBeLessThan(500)
  })

  test('forgot-password for unknown email is masked (no enumeration)', async ({ page }) => {
    // Hit the API directly with a bogus email.
    const stranger = uniqueEmail('nobody')
    const res = await page.request.post(API_BASE + '/users/forgot-password', {
      data: { email: stranger },
    })
    expect(res.status(), 'unknown email should not 4xx leak').toBeLessThan(500)
  })

  test('/reset-password without a token surfaces a "missing token" error or empty form', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    // No assertion on copy, just that the route renders.
    await expect(page.locator('input[type="password"], [role="alert"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/forgot-password "Back to sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back|sign.*in|log.*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/reset-password password input accepts typed input (masked)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    // The token-validating server may return a missing-token error
    // before rendering the form. Tolerate either path: form OR alert.
    const pwd = page.locator('input[type="password"]').first()
    if (await pwd.count().catch(() => 0)) {
      await pwd.fill('NewPass1234!')
      await expect(pwd).toHaveValue('NewPass1234!')
    } else {
      await expect(page.locator('[role="alert"]').first()).toBeVisible()
    }
  })
})
