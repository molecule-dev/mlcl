import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const email = page.getByLabel(/email/i).first()
    await email.fill('me@example.com')
    await expect(email).toHaveValue('me@example.com')
  })

  test('reset token input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const tok = page.getByLabel(/Reset token/i).first()
    await tok.fill('abc-123-token')
    await expect(tok).toHaveValue('abc-123-token')
  })

  test('new password input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.getByLabel(/New password/i).first()
    await pw.fill('NewPass123!')
    await expect(pw).toHaveValue('NewPass123!')
  })

  test('confirm new password input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw2 = page.getByLabel(/Confirm new password/i).first()
    await pw2.fill('NewPass123!')
    await expect(pw2).toHaveValue('NewPass123!')
  })

  test('mismatched passwords surface an inline alert without firing a network call', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByLabel(/email/i).first().fill('me@example.com')
    await page
      .getByLabel(/Reset token/i)
      .first()
      .fill('abc')
    await page
      .getByLabel(/New password/i)
      .first()
      .fill('NewPass123!')
    await page
      .getByLabel(/Confirm new password/i)
      .first()
      .fill('different!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 5000 })
    })
    const apiCalls = reqs.filter(
      (r) =>
        /\/api\/users\/reset-password|\/api\/users\/password-reset|\/api\/auth\/reset/.test(
          r.url,
        ) && r.method === 'POST',
    )
    expect(apiCalls, 'mismatched passwords must NOT trigger the reset POST').toEqual([])
  })

  test('Back to sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
