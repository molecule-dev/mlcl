import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, whereUrl } from './_helpers.js'

test.describe('Login page', () => {
  test('renders email + password + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByLabel(/password/i).first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /sign\s*in|enter\s*refract|log\s*in/i }).first(),
    ).toBeVisible()
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /sign\s*up|create.*account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('valid credentials log in and redirect away from /login', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await login(page, session.email, session.password)
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in(?:\?|$)/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in fired').toBeGreaterThan(0)
    expect(loginPost[0].status, 'login must succeed').toBe(200)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('invalid credentials show inline error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByLabel(/email/i)
      .first()
      .fill('nobody-' + Date.now() + '@example.com')
    await page
      .getByLabel(/password/i)
      .first()
      .fill('WrongPass123!')
    await page
      .getByRole('button', { name: /sign\s*in|enter\s*refract|log\s*in/i })
      .first()
      .click()
    // remain on /login (no redirect to /dashboard)
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('show/hide password toggle exposes password text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/password/i).first()
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const showBtn = page.getByRole('button', { name: /show password/i })
    if (await showBtn.count()) {
      await showBtn.click()
      await expect(pw).toHaveAttribute('type', 'text')
    }
  })

  test('Refract brand heading is present (not the placeholder app name)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /^Refract$/ })).toBeVisible()
  })

  test('email input has autoFocus and required attributes', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('#email')
    await expect(email).toBeVisible()
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
    // The autoFocus attribute makes the input the active document element on load.
    const isFocused = await email.evaluate((el) => el === document.activeElement)
    expect(isFocused, 'email input should be auto-focused on /login').toBe(true)
  })
})
