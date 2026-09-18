/**
 * /login — sign-in page.
 *
 * Asserts the visible flows: submit fires POST /api/users/log-in and
 * lands on /library; the forgot link routes to /forgot-password; the
 * "Create one" link routes to /signup.
 *
 * captureNetwork() is used to confirm /api/users/log-in fires.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers.js'

test.describe('/login', () => {
  test('login submit POSTs /api/users/log-in and navigates to /library', async ({
    page,
    context,
  }) => {
    const { email, password } = await signup(page)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="login-submit"]').click()
      await page.waitForURL(/\/library/, { timeout: 15_000 })
    })
    const loginCall = calls.find((c) => c.method === 'POST' && /\/api\/users\/log-in/.test(c.url))
    expect(loginCall, 'expected POST /api/users/log-in').toBeDefined()
    expect(loginCall!.status).toBe(200)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('"Forgot?" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await page.waitForURL(/\/forgot-password/)
  })

  test('"Create one" link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create one/i }).click()
    await page.waitForURL(/\/signup/)
  })
})
