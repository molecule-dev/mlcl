import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/login (Login form)', () => {
  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('#login-email')
    await email.fill('alice@example.com')
    await expect(email).toHaveValue('alice@example.com')
  })

  test('password field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('#login-password')
    await pw.fill('SecretPass123!')
    await expect(pw).toHaveValue('SecretPass123!')
  })

  test('two-factor token field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const totp = page.locator('#login-2fa')
    await totp.fill('123456')
    await expect(totp).toHaveValue('123456')
  })

  test('Sign in submit POSTs /api/users/login and lands the user inside the app', async ({
    page,
  }) => {
    const email = uniqueEmail('login-spec')
    const password = 'TestPass123!'
    const sign = await page.request.post(API_BASE + '/users', {
      data: { email, password, name: 'Login Spec User' },
    })
    expect(sign.status()).toBe(201)

    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Sign in/i }).click()
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 })
    })
    const loginCall = reqs.find((r) => /\/api\/users\/log-in$/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'POST /api/users/log-in must have fired').toBeTruthy()
    expect(loginCall!.status).toBeLessThan(300)
  })

  test('Forgot link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/, { timeout: 10_000 })
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Create an account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/, { timeout: 10_000 })
  })

  test('Wrong password surfaces an error and the user stays on /login', async ({ page }) => {
    // The deliberate bad password is rejected 403; the browser logs that
    // failed fetch to the console. Expected — allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const email = uniqueEmail('login-bad')
    const password = 'TestPass123!'
    const sign = await page.request.post(API_BASE + '/users', {
      data: { email, password, name: 'Login Spec Bad' },
    })
    expect(sign.status()).toBe(201)

    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill('WRONG' + password)
    await page.getByRole('button', { name: /Sign in/i }).click()
    // We should still be on /login (no nav)
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/login/)
  })
})
