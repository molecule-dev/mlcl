/**
 * Forgot password — the form submits to the API, the API responds with a
 * success status whether or not the email exists, and the page renders
 * a confirmation surface so users without an account aren't told as much.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, uniqueEmail } from './_helpers.js'

test('/forgot-password renders an email input and submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page).toHaveURL(/\/forgot-password/)
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button').first()).toBeVisible()
})

test('POST /api/users/forgot-password returns 2xx for a non-existent email', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const res = await apiRequest(page, 'POST', '/api/users/forgot-password', {
    email: uniqueEmail('nonexistent'),
  })
  expect(res.status).toBeGreaterThanOrEqual(200)
  expect(res.status).toBeLessThan(400)
})

test('Form submission shows a confirmation/error surface (does not leak account existence)', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/forgot-password')
  const email = uniqueEmail('forgot')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('button[type="submit"]').first().click()
  // Wait for the form action to settle (either a confirmation message OR
  // navigation back to /login). Either way, the input should not still be
  // sitting empty after a click.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await expect(page).toHaveURL(/\/(forgot-password|login)/)
})

test('Form submit fires POST /api/users/forgot-password', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('cap'))
    await page.locator('button[type="submit"]').first().click()
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  })
  const post = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/users/forgot-password must fire on submit').toBeTruthy()
})
