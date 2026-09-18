/**
 * /login per-page suite.
 * Asserts elements render, navigation links work, valid creds redirect off
 * /login, wrong creds stay, captures POST /api/users/log-in.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, BRAND, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders email + password inputs and Sign in button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible()
  })

  test('Forgot-password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/, { timeout: 10_000 })
  })

  test('Create-an-account link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /create an account|sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/, { timeout: 10_000 })
  })

  test('Show-password toggle flips type=password ↔ type=text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pwInput = page.locator('input[type="password"]').first()
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    await expect(pwInput).toBeVisible()
    await pwInput.fill('SomePass123!')
    await toggle.click()
    // Login has 1 email input + 1 password input. After toggle, password becomes type=text.
    await expect(page.locator('input[type="text"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /hide password/i })).toBeVisible()
  })

  test('valid credentials POST /api/users/log-in 200 + leaves /login', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('login-page')
    const password = 'TestPass123!'
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p, email, password)
    await ctx.close()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill(password)
      await page.locator('form button[type="submit"]').first().click()
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 })
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/users\/log-in/.test(r.url) && r.status === 200),
      'POST /api/users/log-in 200 not seen',
    ).toBeTruthy()
  })

  test('Theme toggle on /login changes html theme attr', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const before = await page.evaluate(
      () =>
        document.documentElement.getAttribute('data-mol-mode') ??
        document.documentElement.getAttribute('data-theme'),
    )
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document.documentElement.getAttribute('data-mol-mode') ??
            document.documentElement.getAttribute('data-theme'),
        ),
      )
      .not.toBe(before)
  })

  test('Brand logo link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: new RegExp(`^${BRAND}$`, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })

  test('wrong password keeps user on /login', async ({ page, browser }) => {
    const email = uniqueEmail('badlogin-page')
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await signup(p, email, 'TestPass123!')
    await ctx.close()

    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('not-the-password')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2_000)
    await expect(page).toHaveURL(/\/login$/)
  })
})
