import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

// /reset-password — Set-new-credentials form. Backed by
// POST /api/users/reset-password (consumes the token from the email).
// We can't read the Mailgun-delivered token in test (sandbox mode), so
// we exercise the failure path: a bad token must return a non-2xx, the
// form must still render, and field-level validation (length, mismatch)
// must run client-side.

test.describe('/reset-password', () => {
  test('renders without auth and shows all four fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('#reset-email')).toBeVisible()
    await expect(page.locator('#reset-token')).toBeVisible()
    await expect(page.locator('#reset-password')).toBeVisible()
    await expect(page.locator('#reset-confirm')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('client-side validation: too-short password disables submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#reset-email').fill('user@example.com')
    await page.locator('#reset-token').fill('abc-123')
    await page.locator('#reset-password').fill('short')
    await page.locator('#reset-confirm').fill('short')
    const btn = page.getByRole('button', { name: /reset password/i })
    await expect(btn).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText(/12 characters/i)
  })

  test('client-side validation: mismatched passwords disable submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#reset-email').fill('user@example.com')
    await page.locator('#reset-token').fill('abc-123')
    await page.locator('#reset-password').fill('Abcdef123456')
    await page.locator('#reset-confirm').fill('Different123!')
    const btn = page.getByRole('button', { name: /reset password/i })
    await expect(btn).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText(/do not match/i)
  })

  test('invalid token POSTs /api/users/reset-password and surfaces a non-2xx', async ({ page }) => {
    const creds = await signup(page, { email: uniqueEmail('resetuser'), password: 'TestPass1234!' })
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#reset-email').fill(creds.email)
    await page.locator('#reset-token').fill('clearly-not-a-real-token-xxxxxxxx')
    await page.locator('#reset-password').fill('NewMaster123456')
    await page.locator('#reset-confirm').fill('NewMaster123456')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(post, 'POST /api/users/reset-password should fire').toBeDefined()
    expect(post!.status, 'invalid token must NOT silently 2xx').toBeGreaterThanOrEqual(400)
  })
})
