import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Forgot password /forgot-password', () => {
  test('submits email, sees inbox confirmation, and POST /api/users/forgot-password fired', async ({
    page,
  }) => {
    const { email } = await signup(page)
    // Clearing the session while the dashboard is still mounting its
    // fetches can 401 them — expected noise of this flow, not an app bug.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()

    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 10000 })
    })
    const fp = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
    expect(fp, 'POST /api/users/forgot-password not observed').toBeTruthy()
    expect(fp!.status).toBeLessThan(400)
    await expect(page.getByText(email)).toBeVisible()
  })

  test('Email field is required (empty submit stays)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await page.waitForTimeout(500)
    // Should still be on forgot-password (no inbox screen).
    expect(page.url()).toContain('/forgot-password')
    await expect(page.getByText(/check your inbox/i)).toHaveCount(0)
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Toggle theme flips <html data-mol-mode>', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
  })

  test('Logo link routes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /Ascent/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })
})
