import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByLabel(/email/i).first()
    await tb.fill('test@example.com')
    await expect(tb).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByLabel(/^password$/i).first()
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('Show password toggle reveals plaintext', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/^password$/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('Forgot password link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /^Forgot\??$|Forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('Create account link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create.*account|Sign up/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('sign-in button POSTs /api/users/log-in and lands signed-in user off /login', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    const { email, password } = await signup(pageA, uniqueEmail('login'))
    await ctxA.close()

    const ctxB = await browser.newContext()
    const page = await ctxB.newPage()
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    })
    expect(page.url()).not.toMatch(/\/login/)
    expect(reqs.some((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')).toBeTruthy()
    await ctxB.close()
  })
})
