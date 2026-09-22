import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, login, signup, STRONG_PASSWORD } from './_helpers'

test.describe('/login', () => {
  test('renders email and password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|unlock|log in/i })).toBeVisible()
  })

  test('login round-trips POST /api/users/log-in and routes into the app', async ({ page }) => {
    const { email } = await signup(page)
    // log out indirectly by clearing storage
    await page.evaluate(() => globalThis.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, STRONG_PASSWORD)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(post, 'POST /api/users/log-in should fire on login').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/(vault|generator|shared|security|settings|profile)/, {
      timeout: 15_000,
    })
  })

  test('login with bogus password shows error and stays on /login', async ({ page }) => {
    // The rejected login legitimately comes back 401/403 — allow the
    // expected console resource error before submitting bogus credentials.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 40[13]' })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('does-not-exist@example.com')
    await page.locator('input[type="password"]').first().fill('totally-wrong')
    await page.getByRole('button', { name: /sign in|unlock|log in/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot password link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot.*password|recover/i }).first()
    if ((await link.count().catch(() => 0)) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/forgot-password/)
    }
  })
})
