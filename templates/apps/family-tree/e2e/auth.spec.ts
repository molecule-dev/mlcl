/**
 * Auth flow — signup lands on the tree, login round-trips, unauthenticated
 * visitors are bounced from the app shell to /login.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup lands on the tree screen with a session', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('auth-signup'))
    expect(accessToken).toBeTruthy()
    await expect(page).toHaveURL(/\/tree/)
    await expect(page.locator('[data-mol-id="page-tree"]').first()).toBeVisible()
  })

  test('login page renders the branded form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in/i }).first()).toBeVisible()
  })

  test('login round-trips with the credentials just created', async ({ page }) => {
    const creds = await signup(page, uniqueEmail('auth-login'))
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await login(page, creds.email, creds.password)
    expect(await getAccessToken(page)).toBeTruthy()
    await expect(page).toHaveURL(/\/tree/)
  })

  test('unauthenticated visit to the shell redirects to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/people')
    await expect(page).toHaveURL(/\/login/)
  })
})
