import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login (Login)', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const inp = page.locator('input[type=email]').first()
    await inp.fill('me@example.com')
    await expect(inp).toHaveValue('me@example.com')
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const inp = page.locator('input[type=password]').first()
    await inp.fill('Pa55word!')
    await expect(inp).toHaveValue('Pa55word!')
  })

  test('Sign-in with valid creds POSTs /api/users/log-in and lands away from /login', async ({
    page,
  }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type=email]').first().fill(email)
      await page.locator('input[type=password]').first().fill(password)
      await page
        .getByRole('button', { name: /sign\s*in/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15_000 })
    })
    const loginCall = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'POST /api/users/log-in fired').toBeTruthy()
    expect(loginCall!.status, 'login response 2xx').toBeLessThan(300)
    expect(page.url(), 'redirected away from /login').not.toMatch(/\/login/)
  })
})
