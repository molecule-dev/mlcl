/**
 * /reset-password — token + new-password form. Asserts the form renders,
 * a POST hits /api/users/reset-password (rejected without a real token), and
 * the back-to-login link works.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset password (/reset-password)', () => {
  test('renders password and confirm inputs', async ({ page }) => {
    await page.goto(
      APP_BASE + '/reset-password?token=spec-only-not-valid&email=who@meditation.test',
    )
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').nth(1)).toBeVisible()
  })

  test('submitting calls POST /api/users/reset-password (rejected without a real token)', async ({
    page,
  }) => {
    // The 401 for the bogus token is the expected rejection the test asserts.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(
        APP_BASE + '/reset-password?token=spec-only-not-valid&email=who@meditation.test',
      )
      await page.locator('input[type="password"]').first().fill('NewPass!1234')
      await page.locator('input[type="password"]').nth(1).fill('NewPass!1234')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(1500)
    })
    const calls = reqs.filter(
      (r) => r.url.includes('/api/users/reset-password') && r.method === 'POST',
    )
    expect(
      calls.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)
    expect(calls[0].status).toBeGreaterThanOrEqual(400)
  })

  test('back-to-login link returns the user to /login', async ({ page }) => {
    await page.goto(
      APP_BASE + '/reset-password?token=spec-only-not-valid&email=who@meditation.test',
    )
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
