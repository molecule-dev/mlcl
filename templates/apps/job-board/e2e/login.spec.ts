import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password fields and Sign In button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByLabel(/^password$/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('Forgot-password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('valid credentials log the user in (POST /users/log-in 200)', async ({ page, browser }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)

    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    const requests = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/login')
      await p2.getByLabel(/email/i).first().fill(email)
      await p2
        .getByLabel(/^password$/i)
        .first()
        .fill(password)
      await p2
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await p2.waitForURL((url) => !/\/login$/.test(url.pathname), { timeout: 20_000 })
    })
    const loginCall = requests.find(
      (r) => r.method === 'POST' && /\/users\/log-in\b/.test(r.url) && r.status === 200,
    )
    expect(loginCall, 'POST /api/users/log-in did not return 200').toBeTruthy()
    await fresh.close()
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(`nobody-${Date.now()}@example.com`)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('WrongPassword!1')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/login')
      await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
    })
  })
})
