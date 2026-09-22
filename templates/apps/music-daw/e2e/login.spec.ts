import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiSignup, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Login page (/login)', () => {
  test('renders Fugue brand and email/password fields with submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /^Fugue$/ })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /open the studio|sign\s*in/i })).toBeVisible()
  })

  test('email field is type=email and required', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('#email')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
  })

  test('forgot password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign up" footer link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Show password toggle flips type=password to type=text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('#password')
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('valid credentials log in and navigate to /dashboard', async ({ page, request }) => {
    const u = await apiSignup(request)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('#email').fill(u.email)
      await page.locator('#password').fill(u.password)
      await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in must fire').toBeGreaterThan(0)
    expect(loginPost[0].status, 'login must succeed').toBeLessThan(300)
  })

  test('invalid credentials show error alert and stay on /login', async ({ page }) => {
    // The failed login 403 is the EXPECTED result under test — silence the
    // console-guard so the alert assertion below is what decides pass/fail.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('does-not-exist+' + Date.now() + '@example.com')
    await page.locator('#password').fill('WrongPass123!')
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login session survives page reload (token rehydrates from storage)', async ({ page }) => {
    const session = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    expect(session.email).toBeTruthy()
  })

  test('login endpoint returns a JWT-shaped accessToken', async ({ request }) => {
    const u = await apiSignup(request)
    const res = await request.post(API_BASE + '/users/log-in', {
      data: { email: u.email, password: u.password },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBeLessThan(300)
    const body = await res.json()
    const tok = body.accessToken ?? body.token
    expect(tok, 'must return an accessToken').toBeTruthy()
    expect(String(tok).split('.').length, 'JWT shape').toBe(3)
  })
})
