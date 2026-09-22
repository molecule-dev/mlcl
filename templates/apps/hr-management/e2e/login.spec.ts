/**
 * /login — credential-based sign-in. Bad password keeps user on /login;
 * good password lands on /dashboard with a persisted bearer token.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

async function registerUser(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  const reg = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Login Test' },
    failOnStatusCode: false,
  })
  expect(reg.status()).toBeLessThan(400)
}

test.describe('login page', () => {
  test('renders the email + password form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('rejects bad credentials and stays on /login', async ({ page }) => {
    // The rejected log-in intentionally 403s; the console error is expected.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('badcred')
    const password = 'TestPass!1234'
    await registerUser(page, email, password)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('totally wrong')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(800)
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(failed?.status, 'login attempt status').toBeGreaterThanOrEqual(400)
  })

  test('valid credentials log in and persist the access token', async ({ page }) => {
    const email = uniqueEmail('goodcred')
    const password = 'TestPass!1234'
    await registerUser(page, email, password)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    const token = await getAccessToken(page)
    expect(token, 'access token after login').toBeTruthy()
  })

  test('Forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot.*password/i })
      .first()
      .click()
    await page.waitForURL('**/forgot-password', { timeout: 5_000 })
  })
})
