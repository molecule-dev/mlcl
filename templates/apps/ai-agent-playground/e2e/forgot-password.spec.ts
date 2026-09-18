import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Forgot password page', () => {
  test('renders heading + email field + submit + back-to-login link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /^Neuron$/ })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible()
  })

  test('submits POST /api/users/forgot-password and shows confirmation', async ({ page }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: /Send Reset Link/i }).click()
      await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 10000 })
    })
    expect(whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST').length).toBeGreaterThan(0)
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 })
  })
})
