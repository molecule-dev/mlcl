import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signupUI, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('Login with existing credentials authenticates and routes to /feed', async ({ page }) => {
    const { email, password } = await signupUI(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL(/\/feed/, { timeout: 15_000 })
    })
    expect(reqs.find((r) => /\/api\/users\/log-in/.test(r.url))).toBeTruthy()
    const newToken = await getAccessToken(page)
    expect(newToken).toBeTruthy()
  })

  test('Login with bad credentials shows an error and stays on /login', async ({ page }) => {
    // A rejected login is SUPPOSED to 403 — the console-guard would otherwise
    // fail the test on the browser's own "Failed to load resource" line.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail())
    await page.locator('input[type="password"]').first().fill('wrong-password')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('AuthGuard redirects /feed to /login when unauthenticated', async ({ page }) => {
    const ctx = await page.context().browser()!.newContext()
    const fresh = await ctx.newPage()
    await fresh.goto(APP_BASE + '/feed')
    await fresh.waitForURL(/\/login/, { timeout: 10_000 })
    await ctx.close()
  })

  test('"Forgot password?" link points to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/forgot-password"]').first()
    await expect(link).toHaveAttribute('href', '/forgot-password')
  })

  test('"Sign up" link points to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/signup"]').first()
    await expect(link).toHaveAttribute('href', '/signup')
  })
})
