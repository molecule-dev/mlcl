import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password /reset-password', () => {
  test('submitting hits POST /api/users/reset-password with the token + password', async ({
    page,
  }) => {
    // An invalid token is correctly rejected with 401; the browser logs the
    // failed fetch as a console error — expected on this negative path.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    await page.goto(APP_BASE + '/reset-password?token=invalid-test-token')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="password"]').first().fill('NewPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(1500)
    })
    const sent = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(sent, 'POST /api/users/reset-password not observed').toBeTruthy()
    expect(sent!.status).toBeLessThan(500)
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=any')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('new-password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=any')
    const input = page.locator('input[type="password"]').first()
    await input.fill('NewPass!1234')
    await expect(input).toHaveValue('NewPass!1234')
  })
})
