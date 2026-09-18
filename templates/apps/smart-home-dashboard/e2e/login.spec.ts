import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByPlaceholder(/email/i).first()
    await tb.fill('test@example.com')
    await expect(tb).toHaveValue('test@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const tb = page.getByPlaceholder(/password/i).first()
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('logging in with the wrong password shows an error', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByPlaceholder(/email/i).first().fill(uniqueEmail('wrongpw'))
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill('definitely-wrong')
    await page
      .getByRole('button', { name: /^log in$/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    const errorTexts = await page.locator('body').textContent()
    expect(errorTexts).toMatch(/invalid|incorrect|not found|fail|wrong/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Forgot?" button routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('button', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('valid credentials log the user in and POST /api/users/log-in', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    const { email, password } = await signup(pageA, uniqueEmail('login'))
    await ctxA.close()

    const ctxB = await browser.newContext()
    const page = await ctxB.newPage()
    await page.goto(APP_BASE + '/login')
    await page.getByPlaceholder(/email/i).first().fill(email)
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^log in$/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15_000 })
    })
    expect(page.url()).not.toMatch(/\/login/)
    expect(
      whereUrl(reqs, /\/api\/users\/log-in/, 'POST').length,
      'POST /api/users/log-in must be observed',
    ).toBeGreaterThan(0)
    await ctxB.close()
  })
})
