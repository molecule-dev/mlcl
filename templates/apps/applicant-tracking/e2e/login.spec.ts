import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password fields and Sign In button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('Forgot-password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Create-an-account link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create an account|sign up/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('valid credentials redirect to /dashboard and POST /users/log-in returns 200', async ({
    page,
    browser,
  }) => {
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
      await p2.waitForURL(/\/dashboard$/, { timeout: 20000 })
    })
    expect(
      requests.some(
        (r) => r.method === 'POST' && /\/users\/log-in\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    await fresh.close()
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    // The 403 from POST /users/log-in is the expected server response — the
    // browser logs it as a console error, which the console guard would fail
    // the test on without this annotation.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).fill(`nobody-${Date.now()}@example.com`)
    await page.getByLabel(/^password$/i).fill('WrongPassword!1')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('login page renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/login')
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
    })
  })
})
