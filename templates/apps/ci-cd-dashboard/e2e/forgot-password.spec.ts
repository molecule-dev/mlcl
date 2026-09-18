import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders email field + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send reset link/i })).toBeVisible()
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/^Email$/i).fill('user@example.com')
    await expect(page.getByLabel(/^Email$/i)).toHaveValue('user@example.com')
  })

  test('Send reset link fires POST /api/users/forgot-password and shows success', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/^Email$/i).fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await page.waitForTimeout(3000)
    })
    const post = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(post.length, 'POST /api/users/forgot-password fired').toBeGreaterThan(0)
    expect(post[0].status, 'forgot-password must succeed').toBeGreaterThanOrEqual(200)
    expect(post[0].status, 'forgot-password must succeed').toBeLessThan(400)
    await expect(
      page.locator('[data-mol-id="forgot-success"], [role="status"]').first(),
    ).toBeVisible()
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
