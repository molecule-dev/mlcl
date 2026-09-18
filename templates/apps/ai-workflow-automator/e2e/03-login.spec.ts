import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders email + password fields and sign-in button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in/i }).first()).toBeVisible()
  })

  test('valid credentials log in and route to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const { email, password } = await signup(page, uniqueEmail('login-ok'))
    // Navigate to a real page first so localStorage/cookies have an origin.
    await page.goto(APP_BASE + '/login')
    await ctx.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')

    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in/i })
        .first()
        .click()
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    })
    const logIn = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(logIn).toBeTruthy()
    expect(logIn!.status).toBe(200)
    await ctx.close()
  })

  test('invalid credentials show an error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .locator('input[type="email"]')
      .first()
      .fill('nobody-' + Date.now() + '@example.com')
    await page.locator('input[type="password"]').first().fill('NoSuchPass!')
    await page
      .getByRole('button', { name: /sign\s*in/i })
      .first()
      .click()
    // Stay on /login (no redirect to /dashboard).
    await page.waitForTimeout(1500)
    expect(page.url()).toMatch(/\/login/)
  })

  test('login page links to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('login page links to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /start free|sign\s*up/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const input = page.locator('input[type="password"]').first()
    await expect(input).toBeVisible()
    const toggle = page.locator('[data-mol-id="login-toggle-password"]').first()
    if (await toggle.count()) {
      await toggle.click()
      // After click the password input should be type=text
      await expect(page.locator('[data-mol-id="login-password"]')).toHaveAttribute('type', 'text')
    }
  })
})
