/**
 * /reset-password — set a new password using a token from email link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('reset password page', () => {
  test('mismatched passwords surface an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=anything')
    await page.locator('input').nth(0).fill('NewPass!1234')
    await page.locator('input').nth(1).fill('Different!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })

  test('too-short password surfaces an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=anything')
    await page.locator('input').nth(0).fill('short')
    await page.locator('input').nth(1).fill('short')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })

  test('back to sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=anything')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('valid password fields trigger POST /api/users/reset-password (server may reject; we assert request fired)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-but-formatted')
    await page.locator('input').nth(0).fill('NewPass!1234')
    await page.locator('input').nth(1).fill('NewPass!1234')
    // Arm the wait BEFORE the click that triggers the POST so we don't race it.
    // Endpoint is /api/users/reset-password (see authConfig.resetPasswordEndpoint).
    // The fake token is rejected 401 by design ("server may reject") — the
    // browser logs that status as a console error; allow it explicitly.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const postPromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'POST' && /\/api\/users\/reset-password/.test(resp.url()),
      { timeout: 10000 },
    )
    await page.locator('form button[type="submit"]').first().click()
    const post = await postPromise
    expect(post.request().method()).toBe('POST')
  })
})
