import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login /login', () => {
  test('valid credentials log in and stamp the access token', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const body = await login(page, email, password)
    expect(body.accessToken.length).toBeGreaterThan(40)
  })

  test('invalid credentials produce a non-200 response', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email: uniqueEmail('login-fail'), password: 'wrong-password!' },
      failOnStatusCode: false,
    })
    expect(res.status()).not.toBe(200)
  })

  test('login form renders with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('signup link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('button', { name: /sign\s*up/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/signup/)
    } else {
      const altLink = page.getByRole('link', { name: /sign\s*up/i }).first()
      await altLink.click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })

  test('forgot-password button routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('button', { name: /forgot/i }).first()
    if ((await link.count()) === 0) {
      const altLink = page.getByRole('link', { name: /forgot/i }).first()
      await altLink.click()
    } else {
      await link.click()
    }
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('login hits POST /api/users/log-in via captureNetwork', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      const res = await page.request.post(`${API_BASE}/users/log-in`, {
        data: { email, password },
        failOnStatusCode: false,
      })
      expect(res.status()).toBe(200)
    })
    const call = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(call?.status).toBe(200)
  })
})
