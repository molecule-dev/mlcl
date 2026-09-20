import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, logout, signup, uniqueEmail } from './_helpers.js'

test.describe('civic-311: auth', () => {
  test('signup creates an account and lands in the app', async ({ page }) => {
    const session = await signup(page)
    expect(session.userId).not.toBe('')
    await expect(page).toHaveURL(/\/(explore|my-reports|report|notifications)/, { timeout: 15_000 })
  })

  test('login round-trips an existing account', async ({ page }) => {
    const email = uniqueEmail()
    const password = 'TestPass123!'
    await signup(page, email, password)
    await logout(page)
    await login(page, email, password)
    expect(await getAccessToken(page)).not.toBeNull()
  })

  test('unauthed app route redirects to /login (AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/explore')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('public landing renders without a session', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/')
    await expect(page.getByTestId('landing-hero-title')).toBeVisible({ timeout: 15_000 })
  })
})
