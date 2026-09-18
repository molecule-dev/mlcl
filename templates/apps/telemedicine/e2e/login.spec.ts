import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup } from './_helpers.js'

test.describe('/login — Sign in', () => {
  test('renders email + password fields and sign-in button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('Sign in with valid credentials authenticates the user', async ({ page, browser }) => {
    // Create the account via the helper (uses the signup form so we
    // exercise the same code path a real user would).
    const { email, password } = await signup(page)
    // Fresh browser context to drop the signup session.
    const ctx = await browser.newContext()
    const fresh = await ctx.newPage()
    await login(fresh, email, password)
    await expect(fresh).not.toHaveURL(/\/login/)
    const token = await getAccessToken(fresh)
    expect(token).toBeTruthy()
    await ctx.close()
  })

  test('Sign in with bad password surfaces an error and stays on /login', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('NotMyPassword!')
    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('"Forgot password?" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign up" link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Submitting credentials POSTs /api/users/log-in with the typed email', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill(password)
      await page
        .getByRole('button', { name: /sign in/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    })
    const hit = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in(\?|$)/.test(r.url))
    expect(hit, 'login form must POST to /api/users/log-in').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })
})
