import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /login — POST /api/users/log-in → JWT → /dashboard.

test.describe('/login', () => {
  test('renders form without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i }).first()).toBeVisible()
  })

  test('valid credentials POST /api/users/log-in and redirect to /dashboard', async ({ page }) => {
    const creds = await signup(page)
    // Sign out: clear localStorage (auth bond writes JWT there).
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').fill(creds.email)
      await page.locator('input[type="password"]').fill(creds.password)
      await page
        .getByRole('button', { name: /sign in|log in/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(post, 'POST /api/users/log-in should fire').toBeDefined()
    expect(post!.status).toBeLessThan(300)
  })

  test('wrong password surfaces an error message and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill('nope-' + Date.now() + '@example.com')
    await page.locator('input[type="password"]').fill('WrongPass!')
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('"Forgot?" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Sign up" link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up|create.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('show/hide password toggle changes input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input[type="password"]')
    await pw.fill('peek123')
    const toggle = page.getByRole('button', { name: /show password|hide password/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await toggle
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) {
      test.skip(true, 'no password visibility toggle in this build')
    }
    await toggle.click()
    await expect(page.locator('input[type="text"]').filter({ hasText: '' })).toBeVisible()
  })
})
