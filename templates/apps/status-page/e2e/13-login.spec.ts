import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('login form rejects invalid credentials and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('definitely-not-a-real-user@example.com')
    await page.locator('#password').fill('wrong-password-123')
    const submit = page.getByRole('button', { name: /^(log\s*in|sign\s*in)$/i }).first()
    await submit.click()
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  test('login form accepts a real password and redirects off /login', async ({ page }) => {
    const email = uniqueEmail('login-good')
    const password = 'TestPass123!'
    // Provision the user via the API only — no addInitScript on this page.
    const create = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'Login Tester' },
    })
    expect(create.status(), 'pre-create user').toBe(201)

    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page
        .getByRole('button', { name: /^(log\s*in|sign\s*in)$/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    // The auth bond posts to whichever loginEndpoint the app configures
    // (Vigil uses `/users/log-in`); accept any login-shaped path.
    const post = reqs.find((r) => /\/users\/(log-?in|login)/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'POST /api/users/log-in should be 200').toBe(200)
    expect(new URL(page.url()).pathname).not.toBe('/login')
  })

  test('Forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot/i }).first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
  })

  test('Sign-up link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    // Vigil's login uses "Request access" copy — match a link pointing at /signup.
    const link = page.locator('a[href="/signup"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })
})
