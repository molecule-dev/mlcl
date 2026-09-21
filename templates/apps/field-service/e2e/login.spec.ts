import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('login', () => {
  test('login form renders email + password fields and Sign In submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('"Forgot password?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Sign Up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('successful login redirects off /login and POSTs /api/users/log-in', async ({ page }) => {
    const email = uniqueEmail('loginflow')
    const { password } = await signup(page, email)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill(password)
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    })
    const loginPost = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginPost?.status, 'POST /api/users/log-in').toBeGreaterThanOrEqual(200)
    expect(loginPost?.status).toBeLessThan(300)
  })

  test('login with wrong password shows alert and stays on /login', async ({ page }) => {
    // The rejected POST /api/users/log-in logs a 403 console error — expected.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('loginbad')
    await signup(page, email)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('clearly-wrong')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5000 })
  })
})
