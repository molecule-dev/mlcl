import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.locator('[data-mol-id="login-email"]')
    await tb.fill('test@example.com')
    await expect(tb).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.locator('[data-mol-id="login-password"]')
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('"Show password" toggle reveals plaintext, then hides again', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('[data-mol-id="login-password"]')
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.locator('[data-mol-id="login-toggle-password"]').click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.locator('[data-mol-id="login-toggle-password"]').click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('"Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-mol-id="login-forgot-link"]').click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-mol-id="login-signup-link"]').click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Sign in submits credentials and lands on /files', async ({ page, browser }) => {
    // Register a fresh user in a separate context so the page fixture context
    // starts clean (no auth cookie) for the actual login flow being tested.
    const email = uniqueEmail('login')
    const ctxSignup = await browser.newContext()
    const pageSignup = await ctxSignup.newPage()
    const { password } = await signup(pageSignup, email)
    await ctxSignup.close()

    // Drive the login flow on the video-enabled page fixture context.
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-mol-id="login-email"]').fill(email)
    await page.locator('[data-mol-id="login-password"]').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="login-submit"]').click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    })
    expect(page.url()).toMatch(/\/files/)
    expect(
      reqs.some(
        (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST' && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Sign in with bad password surfaces an error and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-mol-id="login-email"]').fill(uniqueEmail('badpw'))
    await page.locator('[data-mol-id="login-password"]').fill('wrongpassword')
    await page.locator('[data-mol-id="login-submit"]').click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible()
  })
})
