import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.getByLabel(/Work email/i).first()
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/Password/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('Sign in with valid credentials POSTs /users/log-in and lands on /dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    const signupRes = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'Login Tester' },
    })
    expect(signupRes.status(), 'preflight signup').toBe(201)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page
      .getByLabel(/Work email/i)
      .first()
      .fill(email)
    await page
      .getByLabel(/Password/i)
      .first()
      .fill(password)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Sign in$/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    })
    await expect(page).toHaveURL(/\/dashboard/)

    const authCall = reqs.find((r) => /\/api\/users\/log-in\b/.test(r.url) && r.method === 'POST')
    expect(authCall, 'POST /api/users/log-in should fire').toBeTruthy()
    expect(authCall!.status, 'auth POST returned non-2xx').toBeLessThan(300)
  })

  test('Forgot password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Footer Create-one link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create one/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
