import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('test@example.com')
    await expect(tb).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByLabel(/^Password$/i)
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('"Show password" toggle reveals plaintext', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/^Password$/i)
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('"Forgot?" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Create an account" link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create an account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" submits credentials and lands authenticated user away from /login', async ({
    browser,
  }) => {
    // Use an isolated context so we can sign up (which auto-logs in), then
    // open a fresh context to re-login from scratch.
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    const { email, password } = await signup(pageA, uniqueEmail('login'))
    await ctxA.close()

    const ctxB = await browser.newContext()
    const page = await ctxB.newPage()
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/Email address/i).fill(email)
    await page.getByLabel(/^Password$/i).fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Sign in/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15_000 })
    })
    expect(page.url()).not.toMatch(/\/login/)
    expect(
      reqs.some((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST'),
      'POST /api/users/log-in must be observed',
    ).toBeTruthy()
    await ctxB.close()
  })

  test('brand "Pylon" link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /^Pylon ?\.?$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })
})
