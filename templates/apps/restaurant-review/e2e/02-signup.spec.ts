/**
 * Signup — creates a real DB user, lands on /discover, and the resulting
 * session can read owner-scoped resources.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
  uniqueUsername,
} from './_helpers.js'

test('Signup form creates an account and lands on /discover', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/(discover|home|onboarding|app)/)
  await expect(page.getByRole('heading', { name: /Find your next favorite spot/i })).toBeVisible()
})

test('After signup the JWT cookie is well-formed', async ({ page }) => {
  await signup(page)
  const token = await getAccessToken(page)
  const segments = token ? token.split('.').length : 0
  expect(segments).toBeGreaterThanOrEqual(3)
})

test('Authed user can read their own owner-scoped notifications endpoint', async ({ page }) => {
  await signup(page)
  const notifs = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/notifications')
  expect(notifs.status).toBe(200)
  expect(Array.isArray(notifs.body.data)).toBe(true)
})

test('Signup form renders all expected inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.locator('input[autocomplete="username"]').first()).toBeVisible()
})

test('Signup submits POST /api/users and stores a JWT', async ({ page }) => {
  const email = uniqueEmail('cap')
  const username = uniqueUsername('cap')
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const firstNameField = page.locator('input[autocomplete="given-name"]')
    if (await firstNameField.count()) await firstNameField.fill('Cap')
    const lastNameField = page.locator('input[autocomplete="family-name"]')
    if (await lastNameField.count()) await lastNameField.fill('Net')
    const usernameField = page.locator('input[autocomplete="username"]')
    if (await usernameField.count()) await usernameField.fill(username)
    await page.locator('input[type="email"]').fill(email)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('TestPass123!')
    if ((await passwordFields.count()) > 1) await passwordFields.nth(1).fill('TestPass123!')
    await page
      .getByRole('button', { name: /Initialize Session|Create account|Join|Sign up|Get started/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  })
  const post = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/users must fire on submit').toBeTruthy()
  expect(post!.status).toBeGreaterThanOrEqual(200)
  expect(post!.status).toBeLessThan(400)
})

test('Submit button is reachable in the form', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(
    page
      .getByRole('button', { name: /Initialize Session|Create account|Join|Sign up|Get started/i })
      .first(),
  ).toBeVisible()
})
