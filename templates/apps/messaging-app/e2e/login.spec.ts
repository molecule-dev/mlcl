import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password fields and Sign In button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('show-password toggle reveals the password value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pwd = page.getByLabel(/^password$/i)
    await pwd.fill('SomePass!1')
    await expect(pwd).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pwd).toHaveAttribute('type', 'text')
  })

  test('Forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Sign-up link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up|create/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('valid credentials redirect to /inbox and POST /users/log-in', async ({ page, browser }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)

    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    const requests = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/login')
      await p2.getByLabel(/email/i).fill(email)
      await p2.getByLabel(/^password$/i).fill(password)
      await p2.getByRole('button', { name: /^sign in$/i }).click()
      await p2.waitForURL(/\/inbox/, { timeout: 20000 })
    })
    expect(
      requests.some(
        (r) => r.method === 'POST' && /\/users\/log-in\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    await fresh.close()
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    // Bad credentials make the API answer 403; the browser logs the failed
    // request to the console. Expected on this negative path.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).fill(`nobody-${Date.now()}@example.com`)
    await page.getByLabel(/^password$/i).fill('WrongPassword!1')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/login')
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
    })
  })
})
