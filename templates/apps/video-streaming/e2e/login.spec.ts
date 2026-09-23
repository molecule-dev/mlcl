import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders the sign-in form (heading + email + password + submit)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i }).first()).toBeVisible()
  })

  test('Sign-up link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up|create.*account|don't.*have/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 5_000 })
  })

  test('Forgot password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 5_000 })
  })

  test('Submit with valid credentials POSTs /api/users/log-in and routes off /login', async ({
    page,
  }) => {
    // Pre-create the user.
    const email = uniqueEmail('login-flow')
    const password = 'TestPass123!'
    let r = await page.request.post(API_BASE + '/users', {
      data: { email, password, name: 'Login Flow' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(r.status()).toBe(201)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill(password)
      const [resp] = await Promise.all([
        page.waitForResponse(
          (rs) =>
            /\/api\/(users\/log-in|sessions)/.test(rs.url()) && rs.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page
          .getByRole('button', { name: /sign in|log in/i })
          .first()
          .click(),
      ])
      expect(resp.status()).toBe(200)
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    })
    expect(
      reqs.some(
        (rq) =>
          /\/api\/(users\/log-in|sessions)/.test(rq.url) &&
          rq.method === 'POST' &&
          rq.status === 200,
      ),
    ).toBe(true)
  })

  test('Submit with bad credentials surfaces an error and stays on /login', async ({ page }) => {
    // The expected 403 from /api/users/log-in is the contract under test —
    // not a page bug — so the console-guard must not fail on it.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('nobody+nobad@example.com')
    await page.locator('input[type="password"]').first().fill('NotARealPassword!')
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/login/)
    // Some error should be visible (toast or inline).
    await expect(page.locator('body')).toContainText(
      /invalid|incorrect|wrong|error|could not|failed/i,
    )
  })
})
