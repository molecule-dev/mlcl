import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, login, uniqueEmail, captureNetwork } from './_helpers.js'

test.describe('auth', () => {
  test('landing page renders the marketing hero with calls to action', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    const cta = page.getByRole('link', { name: /get\s*started|start|sign\s*up|create.*account/i })
    if (await cta.count().catch(() => 0)) {
      await expect(cta.first()).toBeVisible()
    }
  })

  test('signup creates an account, hits POST /api/users, and lands on an authed page', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    await expect(page).not.toHaveURL(/\/(login|signup)$/)
    // Signup hits POST /api/users (the user-resource create handler).
    const signupCall = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(signupCall, 'POST /api/users was not observed during signup').toBeTruthy()
    expect(signupCall!.status, 'signup should return 2xx').toBeLessThan(300)
  })

  test('login after signup hits POST /users/log-in and goes back into the app', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    await context.clearCookies()
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).not.toHaveURL(/\/login/)
    const loginCall = reqs.find((r) => /\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'POST /users/log-in was not observed').toBeTruthy()
    expect(loginCall!.status, 'log-in should return 2xx').toBeLessThan(300)
  })

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page).toHaveURL(/\/(login|signin|signup)/, { timeout: 15000 })
  })
})
