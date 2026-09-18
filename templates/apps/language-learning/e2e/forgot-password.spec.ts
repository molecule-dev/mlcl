import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the form with email field + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/Email( address)?/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Send reset link|Reset password/i }),
    ).toBeVisible()
  })

  test('submitting fires POST /api/users/forgot-password and shows success message', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.getByLabel(/Email( address)?/i).fill(email)
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await page.waitForTimeout(2000)
    })
    const calls = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(calls.length, 'forgot-password fired').toBeGreaterThan(0)
    expect([200, 201, 204]).toContain(calls[0].status)
    await expect(page.getByText(/Check your inbox|If .* matches an account/i).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('Back to sign in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
