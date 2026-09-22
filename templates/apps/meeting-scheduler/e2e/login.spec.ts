import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignup, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Login', () => {
  test('renders email/password fields and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('valid credentials log in and redirect to /dashboard', async ({ page, request }) => {
    const session = await apiSignup(request)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('#email').fill(session.email)
      await page.locator('#password').fill(session.password)
      await page.getByRole('button', { name: /sign in/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in fires').toBeGreaterThan(0)
    expect(loginPost[0].status, 'login should succeed').toBe(200)
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    // Bad credentials 403 by design (auth bond Forbidden); allow the
    // expected console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('nobody-' + Date.now() + '@example.com')
    await page.locator('#password').fill('WrongPassword1!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(1500)
    expect(page.url()).toMatch(/\/login/)
  })

  test('forgot-password link is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
  })
})
