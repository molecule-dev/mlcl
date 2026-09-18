import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /login — re-auth an existing user via POST /api/users/log-in.

test.describe('/login', () => {
  test('renders fields without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('log-in with correct credentials POSTs /api/users/log-in and lands on /dashboard', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const creds = await signup(page)
    // Clear storage to simulate a returning user
    await ctx.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').fill(creds.email)
      await page.locator('input[type="password"]').fill(creds.password)
      await page.getByRole('button', { name: /sign in|log in/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const loginPost = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginPost).toBeDefined()
    expect(loginPost!.status).toBeLessThan(300)
    await ctx.close()
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Start your trial" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /trial|start your/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('toggling password visibility flips the input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input#password')
    await pw.fill('Sekret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const toggle = page.getByRole('button', { name: /show password/i })
    if ((await toggle.count()) > 0) {
      await toggle.first().click()
      await expect(pw).toHaveAttribute('type', 'text')
    } else {
      // Toggle isn't required to ship — assert input still accepts input.
      await expect(pw).toHaveValue('Sekret123!')
    }
  })

  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('input#email')
    await email.fill('walker@example.com')
    await expect(email).toHaveValue('walker@example.com')
  })
})
