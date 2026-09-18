import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

// /login — POST /api/users/log-in. After signup, user can sign out and
// sign back in with the same credentials and land on /dashboard.

test.describe('/login', () => {
  test('renders fields without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('valid credentials POST /api/users/log-in and land on /dashboard', async ({
    page,
    browser,
  }) => {
    const creds = await signup(page)
    // Use an isolated context to avoid carrying signup's localStorage tokens.
    const ctx = await browser.newContext()
    const fresh = await ctx.newPage()
    const reqs = await captureNetwork(fresh, async () => {
      await fresh.goto(APP_BASE + '/login')
      await fresh.locator('#email').fill(creds.email)
      await fresh.locator('#password').fill(creds.password)
      await fresh.getByRole('button', { name: /^sign in$/i }).click()
      await expect(fresh).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    await ctx.close()
    const loginPost = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginPost, 'POST /api/users/log-in should fire').toBeDefined()
    expect(loginPost!.status).toBeLessThan(300)
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(uniqueEmail('nobody'))
    await page.locator('#password').fill('WrongPassword!1')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible()
  })

  test('"Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up|create.*workspace|create.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
