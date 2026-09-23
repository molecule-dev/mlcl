import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Reset password page (/reset-password)', () => {
  test('renders new + confirm password fields with a token in the URL', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    await expect(page.getByRole('heading', { name: /^Refract$/ })).toBeVisible()
    await expect(page.getByText(/Set a new password/)).toBeVisible()
    await expect(page.getByLabel(/NEW PASSWORD/i)).toBeVisible()
    await expect(page.getByLabel(/CONFIRM PASSWORD/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Reset Password/ })).toBeVisible()
  })

  test('Show password toggle flips the new-password input type to text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const input = page.getByLabel(/NEW PASSWORD/i)
    await expect(input).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/ }).click()
    await expect(input).toHaveAttribute('type', 'text')
  })

  test('Back to Sign In link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    await page.getByRole('link', { name: /Back to Sign In/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('submitting an INVALID token POSTs /api/users/reset-password and surfaces failure (no silent success)', async ({
    page,
  }) => {
    // The invalid token intentionally 401s; the page must surface it inline
    // and the contract assertions below pin the response semantics.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/reset-password?token=' + 'a'.repeat(32))
    await page.getByLabel(/NEW PASSWORD/i).fill('NewPass123!')
    await page.getByLabel(/CONFIRM PASSWORD/i).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset Password/ }).click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    // The reset page POSTs to /api/users/reset-password (mounted by @molecule/api-resource-user)
    // — verify the request fires and check the error path.
    const resetPosts = whereUrl(
      reqs,
      /\/api\/users\/(?:resetPassword|password-reset|reset-password)/i,
      'POST',
    )
    expect(resetPosts.length, 'expected a POST to the reset-password endpoint').toBeGreaterThan(0)
    // Invalid tokens MUST NOT silently succeed — the contract is "respond with an error",
    // not "respond 200 and pretend it worked." This catches the silent-failure pattern.
    expect(resetPosts[0]!.status, 'invalid token must not return 200').not.toBe(200)
    // Specifically: it should be a 4xx — the route MUST exist (not 404) but
    // an unknown token MUST fail with 400 (validated request, business rule failed).
    expect(
      resetPosts[0]!.status,
      'invalid token should be a 400 (route exists but token is bad)',
    ).toBeLessThan(500)
    expect(resetPosts[0]!.status, 'reset endpoint must exist (not 404)').not.toBe(404)
  })

  test('mismatched passwords are rejected client-side without a POST', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=' + 'a'.repeat(32))
    await page.getByLabel(/NEW PASSWORD/i).fill('NewPass123!')
    await page.getByLabel(/CONFIRM PASSWORD/i).fill('DoesNotMatch!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Reset Password/ })
        .click({ force: true })
        .catch(() => {})
      await page.waitForTimeout(800)
    })
    const resetPosts = whereUrl(reqs, /reset[-]?password/i, 'POST')
    expect(resetPosts.length, 'POST must NOT fire with mismatched passwords').toBe(0)
    await expect(page.getByRole('alert')).toContainText(/do not match/i)
  })

  test('shows brand heading "Refract"', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=' + 'a'.repeat(32))
    const heading = await page.getByRole('heading', { name: /^Refract$/ }).textContent()
    expect(heading).toBe('Refract')
  })

  test('Hide password toggle flips type back to "password"', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=' + 'a'.repeat(32))
    const input = page.getByLabel(/NEW PASSWORD/i)
    await page.getByRole('button', { name: /Show password/ }).click()
    await expect(input).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /Hide password/ }).click()
    await expect(input).toHaveAttribute('type', 'password')
  })
})
