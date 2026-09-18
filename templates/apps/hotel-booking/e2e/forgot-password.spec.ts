import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#email').fill('walker@example.com')
    await expect(page.locator('#email')).toHaveValue('walker@example.com')
  })

  test('"Send reset link" submits the request and shows confirmation copy', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#email').fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\//.test(r.url) && r.method === 'POST'),
      'a POST request to /api/* must be observed when submitting the reset form',
    ).toBeTruthy()
    await expect(page.getByText(/check your email|sent|reset link/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('brand "Auberge" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /Auberge/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(APP_BASE.replace(/[/.]/g, '\\$&') + '/?$'))
  })
})
