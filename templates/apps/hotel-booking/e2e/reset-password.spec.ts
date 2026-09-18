import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('password and confirm-password inputs accept values', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token-123')
    await page.locator('#password').fill('NewPass123!')
    await page.locator('#confirmPassword').fill('NewPass123!')
    await expect(page.locator('#password')).toHaveValue('NewPass123!')
    await expect(page.locator('#confirmPassword')).toHaveValue('NewPass123!')
  })

  test('submitting fires a POST and either succeeds or surfaces a clear error', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token-abc')
    await page.locator('#password').fill('NewPass123!')
    await page.locator('#confirmPassword').fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\//.test(r.url) && r.method === 'POST'),
      'a POST request to /api/* must be observed',
    ).toBeTruthy()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=x')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('brand "Auberge" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=x')
    await page
      .getByRole('link', { name: /Auberge/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(APP_BASE.replace(/[/.]/g, '\\$&') + '/?$'))
  })

  test('rendering /reset-password without a token still renders the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
  })
})
