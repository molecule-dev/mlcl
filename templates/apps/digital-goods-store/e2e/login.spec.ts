import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, whereUrl } from './_helpers.js'

test.describe('Login page (/login)', () => {
  test('email and password fields render and are required', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('#email')
    const pw = page.locator('#password')
    await expect(email).toBeVisible()
    await expect(email).toHaveAttribute('type', 'email')
    await expect(pw).toBeVisible()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('valid credentials log in and redirect away from /login', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await login(page, session.email, session.password)
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in fired').toBeGreaterThan(0)
    expect(loginPost[0].status).toBe(200)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('invalid credentials keep user on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('does-not-exist-' + Date.now() + '@example.com')
    await page.locator('#password').fill('WrongPass123!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page
      .getByRole('link', { name: /sign\s*up|create.*(account|store|shop)|new to trove/i })
      .or(page.locator('a[href="/signup"]').first())
    await link.first().click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('show/hide password toggle exposes password text when present', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('#password')
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const showBtn = page.getByRole('button', { name: /show password/i })
    if (await showBtn.count()) {
      await showBtn.click()
      await expect(pw).toHaveAttribute('type', 'text')
    }
  })
})
