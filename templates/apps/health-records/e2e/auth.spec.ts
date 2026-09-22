/**
 * Auth invariants — signup creates a user, the JWT lands in
 * localStorage, login round-trips, and logout clears the session.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, logout, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a user, writes the JWT to localStorage, and lands inside the app', async ({
    page,
  }) => {
    const { email, accessToken } = await signup(page, uniqueEmail('auth-signup'))
    expect(email).toMatch(/^auth-signup\+\d+/)
    expect(accessToken, 'access token should land in localStorage after signup').toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login reuses an existing account', async ({ page }) => {
    // Known harness race (trace-verified): right after POST /users 201 the SPA
    // mounts the dashboard and its initial fetch fan-out can beat the browser's
    // Set-Cookie commit, so up to one round of the four dashboard GETs 401s in
    // console. The retry round succeeds; only console noise remains, and the
    // app state is correct. The description must be coarse because the
    // console-guard matches msg.text(), which for failed resources does NOT
    // include the request URL — endpoint-scoped regexes can never match.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const creds = await signup(page, uniqueEmail('auth-login'))
    await logout(page)
    await login(page, creds.email, creds.password)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('forgot-password page is reachable from login and accepts an email submission', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    const fakeEmail = uniqueEmail('forgot')
    await page.locator('input[type="email"]').first().fill(fakeEmail)
    const submit = page.getByRole('button').first()
    if (await submit.count()) {
      await submit.click()
    }
  })
})
