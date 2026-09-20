/**
 * /reset-password — finalize password reset using a token from the
 * email. Mismatched passwords show an inline alert and DO NOT POST.
 * Valid token + matching passwords POST to /api/users/reset-password.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders the new-password form when a token query is present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token-test-only')
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm')).toBeVisible()
  })

  test('mismatched passwords surface inline alert and DO NOT POST', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=tok-mismatch')
    await page.locator('input#password').fill('AAAAaaaaaa1!')
    await page.locator('input#confirm').fill('BBBBbbbbbb1!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    })
    expect(
      reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST'),
    ).toBeFalsy()
  })

  test('matching passwords POST to /api/users/reset-password (status surfaced regardless of token validity)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=tok-attempt')
    await page.locator('input#password').fill('GoodPass!12345')
    await page.locator('input#confirm').fill('GoodPass!12345')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(1_000)
    })
    const post = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/users/reset-password call').toBeTruthy()
    expect(post?.status, 'reset-password POST status').toBeLessThan(500)
  })
})
