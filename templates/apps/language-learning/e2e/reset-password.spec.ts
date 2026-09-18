import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders all four fields (email, code, new password, confirm)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByLabel(/Email( address)?/i)).toBeVisible()
    await expect(page.getByLabel(/Reset code/i)).toBeVisible()
    await expect(page.getByLabel(/^New password$/i)).toBeVisible()
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible()
  })

  test('mismatched passwords show inline mismatch error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=user%40example.com&token=abc')
    await page.getByLabel(/^New password$/i).fill('Password123!')
    await page.getByLabel(/Confirm password/i).fill('Different123!')
    await page.getByLabel(/Confirm password/i).press('Tab')
    await expect(page.getByText(/don.?t match/i)).toBeVisible()
  })

  test('submitting with an invalid token surfaces a real error (no silent success)', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(
        APP_BASE + '/reset-password?email=does-not-exist@example.com&token=definitely-not-real',
      )
      await page.getByLabel(/^New password$/i).fill('Password123!')
      await page.getByLabel(/Confirm password/i).fill('Password123!')
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForTimeout(2500)
    })
    // Either the reset call returned non-2xx OR we stayed on /reset-password.
    const resetCalls = reqs.filter(
      (r) =>
        /\/api\/users\/.*\/password|\/api\/users\/reset|\/api\/auth\/password/.test(r.url) &&
        /POST|PUT|PATCH/.test(r.method),
    )
    if (resetCalls.length > 0) {
      expect(resetCalls[0].status, 'invalid token must NOT silently 200').not.toBe(200)
    }
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 5000 })
  })
})
