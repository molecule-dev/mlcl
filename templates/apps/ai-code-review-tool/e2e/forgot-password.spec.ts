import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Forgot password page (/forgot-password)', () => {
  test('renders branded heading and reset-request form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /^Refract$/ })).toBeVisible()
    await expect(page.getByText(/Enter your email to receive a reset link/)).toBeVisible()
    await expect(page.getByLabel(/EMAIL/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send Reset Link/ })).toBeVisible()
  })

  test('Back to Sign In link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to Sign In/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Send Reset Link POSTs /api/users/forgot-password and reaches the backend', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/EMAIL/i).fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send Reset Link/ }).click()
      // Wait briefly for the network call to fire and complete.
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const sendPosts = whereUrl(reqs, /\/api\/users\/forgot-password/i, 'POST')
    expect(sendPosts.length, 'expected a POST to /api/users/forgot-password').toBeGreaterThan(0)
    // Should be 200 — backend always returns success regardless of account existence
    // (anti-enumeration) when the request body shape is valid.
    expect(sendPosts[0]!.status, 'reset POST should not fail').toBeLessThan(500)
  })

  test('does not leak whether an email exists (anti-enumeration: unknown ≡ 200)', async ({
    page,
  }) => {
    const unknown = uniqueEmail('definitely-unknown')
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/EMAIL/i).fill(unknown)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send Reset Link/ }).click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const sendPosts = whereUrl(reqs, /\/api\/users\/forgot-password/i, 'POST')
    expect(sendPosts.length, 'POST must fire even for unknown emails').toBeGreaterThan(0)
    expect(sendPosts[0]!.status, 'unknown emails must not 4xx (would leak account existence)').toBe(
      200,
    )
  })

  test('empty email is rejected by HTML required without firing a POST', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Send Reset Link/ })
        .click({ force: true })
        .catch(() => {})
      await page.waitForTimeout(500)
    })
    const sendPosts = whereUrl(reqs, /\/api\/users\/forgot-password/i, 'POST')
    expect(sendPosts.length, 'POST should NOT fire on empty email').toBe(0)
  })

  test('shows brand heading "Refract" not the placeholder app name', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const heading = await page.getByRole('heading', { name: /^Refract$/ }).textContent()
    expect(heading).toBe('Refract')
  })
})
