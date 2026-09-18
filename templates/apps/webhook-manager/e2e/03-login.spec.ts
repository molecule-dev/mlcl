import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, login, signup } from './_helpers'

test.describe('/login', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login with valid credentials POSTs /api/users/log-in and redirects off /login', async ({
    page,
  }) => {
    const creds = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, creds.email, creds.password)
    })
    const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginCall, 'POST /api/users/log-in expected').toBeDefined()
    expect(loginCall!.status).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login with bad password keeps the user on /login', async ({ page }) => {
    const creds = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(creds.email)
    await page.locator('input[type="password"]').fill('WrongPass!!!')
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    expect(page.url()).toMatch(/\/login/)
  })
})
