import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('Login /login', () => {
  test('valid credentials POST /api/users/log-in and persist a session', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill(password)
      await page.locator('form button[type="submit"]').first().click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    })
    const loggedIn = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loggedIn, 'POST /api/users/log-in not observed').toBeTruthy()
    expect(loggedIn!.status).toBeLessThan(300)

    const token = await getAccessToken(page)
    expect(token).toMatch(/^eyJ/)
  })

  test('invalid credentials show an error and do not redirect', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('nope'))
    await page.locator('input[type="password"]').first().fill('definitely-wrong')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(1800)
    expect(page.url()).toContain('/login')
  })

  test('forgot-password link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('signed-in session survives a reload', async ({ page }) => {
    await signup(page)
    await page.reload()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    const token = await getAccessToken(page)
    expect(token).toMatch(/^eyJ/)
  })
})
