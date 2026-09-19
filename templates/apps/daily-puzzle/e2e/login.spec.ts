import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/login', () => {
  test('renders the brand link with "Lexlet home" aria-label', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('link', { name: /lexlet home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await flipThemeAndAssertChanged(page)
  })

  test('email input accepts and preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('demo@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('demo@example.com')
  })

  test('password input accepts and preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="password"]').first().fill('hunter2')
    expect(await page.locator('input[type="password"]').first().inputValue()).toBe('hunter2')
  })

  test('"Forgot password?" link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Create an account" link → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /create an account|sign\s*up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('welcome-back headline renders', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('wrong password surfaces an inline error', async ({ page }) => {
    await signup(page, uniqueEmail('login-bad'), 'TestPass!1234')
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).first().fill(uniqueEmail('nope'))
    await page.locator('input[type="password"]').first().fill('WrongPass!9999')
    await page
      .getByRole('button', { name: /play today|log\s*in|sign\s*in/i })
      .first()
      .click()
    // Login renders hook errors as a centered semibold error line.
    await expect(page.locator('p.text-error').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('/login authenticated flow', () => {
  test('valid credentials POST /api/users/log-in, set bearer, navigate to /play', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await context.clearCookies()
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/play/)
    const sess = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url()))
    expect(sess, 'POST /api/users/log-in').toBeTruthy()
    expect(sess?.status).toBeLessThan(400)
    const token = await bearerToken(page)
    expect(token).toBeTruthy()
  })
})
