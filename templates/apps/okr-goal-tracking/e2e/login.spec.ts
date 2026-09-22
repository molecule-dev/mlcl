import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, getAccessToken } from './_helpers.js'

test.describe('Login /login', () => {
  test('valid credentials POST /api/users/log-in and redirect to /dashboard', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill(password)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    const loggedIn = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loggedIn, 'POST /api/users/log-in not observed').toBeTruthy()
    expect(loggedIn!.status).toBeLessThan(300)

    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('invalid credentials show an error and do not redirect', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('nope'))
    await page.locator('input[type="password"]').first().fill('wrong-password')
    // The 403 from POST /api/users/log-in is the EXPECTED invalid-credentials
    // rejection (user resource returns 403 by design) — allow it through the
    // console guard before it fires.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Create an account link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create an account/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('email field required (empty submit stays)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/login')
  })

  test('Toggle theme flips <html data-mol-mode>', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
  })

  test('Logo link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Ascent/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })
})
