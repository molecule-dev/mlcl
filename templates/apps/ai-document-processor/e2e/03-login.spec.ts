import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/login', () => {
  test('renders email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i }).first()).toBeVisible()
  })

  test('correct credentials → JWT issued → redirect to /dashboard', async ({ page }) => {
    const creds = await signup(page)
    // Sign out: clear local auth and navigate to /login.
    await page.evaluate(() => window.localStorage.clear())

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').fill(creds.email)
      await page.locator('input[type="password"]').first().fill(creds.password)
      await page
        .getByRole('button', { name: /sign in|log in/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const loginPost = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/log-in(\b|\?|$)/.test(r.url),
    )
    expect(loginPost, 'POST /api/users/log-in should fire on login').toBeDefined()
    expect(loginPost!.status).toBe(200)
  })

  test('wrong password → stays on /login with no redirect', async ({ page }) => {
    const creds = await signup(page)
    await page.evaluate(() => window.localStorage.clear())

    // The rejected log-in is EXPECTED to 403 — tell the console guard before
    // the response fires.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(creds.email)
    await page.locator('input[type="password"]').first().fill('WrongPass1234!')
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await page.waitForTimeout(2_500)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Forgot password" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot.*password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign up" link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
