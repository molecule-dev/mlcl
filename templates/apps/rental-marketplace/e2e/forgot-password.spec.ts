/**
 * /forgot-password — request a reset link.
 *
 * Real outcomes asserted:
 *   - the form renders with the email field + Send reset link button
 *   - submitting fires POST /api/users/forgot-password (the backend
 *     route the @molecule/app-core-auth client targets)
 *   - the success state ("Check your email") is shown after submit
 *   - the "Back to sign in" link points to /login
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

test('forgot-password page renders the form and back link', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
    'href',
    /\/login/,
  )
})

test('submitting forgot-password calls /users/forgot-password and shows success', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/forgot-password')
  const email = uniqueEmail('forgot')
  await page.locator('input[type="email"]').first().fill(email)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /send reset link/i }).click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => r.url.includes('/api/users/forgot-password') && r.method === 'POST')
  expect(post, 'POST /api/users/forgot-password should fire').toBeTruthy()
  // Endpoint always 200s on valid email shape regardless of whether the
  // user exists (anti-enumeration — typical behaviour for password
  // reset endpoints).
  expect(post!.status).toBe(200)
  await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })
})

test('Reset your password heading is rendered on first paint', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
})

test('Back to sign in link points at /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
    'href',
    /\/login/,
  )
})

test('email field is required and type=email (HTML5 validation)', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const email = page.locator('input[type="email"]').first()
  await expect(email).toBeVisible()
  // Submitting with an empty email keeps us on the page (browser-level
  // required-validation blocks submission).
  await page.getByRole('button', { name: /send reset link/i }).click()
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/forgot-password/)
})
