/**
 * /reset-password — token-based reset form. Without a valid token it
 * surfaces an error; with mismatched passwords it surfaces an error;
 * with a real token it would call the confirm endpoint.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders new password + confirm fields + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-test-token')
    await expect(page.locator('input#reset-password')).toBeVisible()
    await expect(page.locator('input#reset-confirm')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password|saving/i })).toBeVisible()
  })

  test('without ?token, submitting shows "invalid link" error and does not POST', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await page.locator('input#reset-password').fill('NewPass!1234')
      await page.locator('input#reset-confirm').fill('NewPass!1234')
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.locator('[role="alert"]')).toContainText(/invalid|new reset email/i, {
        timeout: 5000,
      })
    })
    const confirmCall = reqs.find(
      (r) => /\/api\/users\/.*confirm-?password/i.test(r.url) && r.method === 'POST',
    )
    expect(confirmCall, 'no confirm POST without a token').toBeUndefined()
  })

  test('mismatched passwords show inline error and do not POST', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=fake-test-token')
      await page.locator('input#reset-password').fill('NewPass!1234')
      await page.locator('input#reset-confirm').fill('OtherPass!9999')
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.locator('[role="alert"]')).toContainText(/match/i, { timeout: 5000 })
    })
    const confirmCall = reqs.find((r) => /password|reset/i.test(r.url) && r.method === 'POST')
    expect(confirmCall, 'no POST when passwords do not match').toBeUndefined()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('a[href="/login"]').click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
