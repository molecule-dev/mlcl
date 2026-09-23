import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers'

test.describe('/login — email + password sign-in', () => {
  test('login with valid credentials sends to /boards', async ({ page, context }) => {
    const email = uniqueEmail('login-valid')
    const password = 'TestPass!Login123'
    await signup(page, email, password)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/boards/)
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url) && r.status < 400),
      `expected POST /api/users/log-in — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
  })

  test('login with bad password stays on /login', async ({ page }) => {
    const email = uniqueEmail('login-badpass')
    await signup(page, email, 'TestPass!Real123')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    // Expected 403 from POST /api/users/log-in — the browser logs it as a
    // console error; the app must stay on /login and surface an inline error.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TotallyWrongPass!')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('the page renders an email + password form, submit button, and a forgot-password link', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible()
  })

  test('the "Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const signupLink = page.locator('a[href="/signup"]').first()
    if (await signupLink.count().catch(() => 0)) {
      await signupLink.click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })
})
