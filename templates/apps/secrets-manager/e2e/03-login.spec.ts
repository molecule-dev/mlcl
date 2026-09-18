import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup } from './_helpers'

// /login — POST /api/users/log-in → JWT in httpOnly cookie → redirect to /vaults.

test.describe('/login', () => {
  test('redirects authed routes to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/vaults')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('login with signup credentials POSTs /api/users/log-in, lands on /vaults, persists token', async ({
    page,
  }) => {
    const creds = await signup(page)
    // Drop the auth cookie from this session so we exercise the actual login flow.
    await page.context().clearCookies()
    const reqs = await captureNetwork(page, async () => {
      await login(page, creds.email, creds.password)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/(log-in|login)\b/.test(r.url),
    )
    expect(post, 'POST /api/users/log-in should fire on submit').toBeDefined()
    expect(post!.status, 'login should succeed for valid creds').toBeLessThan(300)
    await expect(page).toHaveURL(/\/vaults/)
    const token = await getAccessToken(page)
    expect(token, 'login must persist a JWT in the auth cookie').toBeTruthy()
  })

  test('"Forgot password" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })
})
