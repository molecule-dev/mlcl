import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

test.describe('/login', () => {
  test('renders login form fields and CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const f = page.getByLabel(/email/i)
    await f.fill('foo@example.com')
    await expect(f).toHaveValue('foo@example.com')
  })

  test('password field accepts and masks input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const f = page.getByLabel(/^password$/i)
    await f.fill('TestPass123!')
    await expect(f).toHaveAttribute('type', 'password')
  })

  test('"Remember me" checkbox toggles', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const cb = page.getByRole('checkbox', { name: /remember me/i })
    await expect(cb).not.toBeChecked()
    await cb.check()
    await expect(cb).toBeChecked()
  })

  test('"Forgot password" link points to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot password/i })
    expect(await link.getAttribute('href')).toBe('/forgot-password')
  })

  test('"Create your journal" link points to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /create your journal/i })
    expect(await link.getAttribute('href')).toBe('/signup')
  })

  test('successful login hits POST /api/users/log-in and redirects off /login', async ({
    page,
  }, testInfo) => {
    // Clearing cookies under the still-mounted SPA (below) can let an
    // in-flight journal refetch land unauthenticated — console 401 noise
    // that is a harness artifact of this test, not an app bug. Pushed FIRST
    // so it covers the entire flow; the functional assertions below (login
    // POST < 400, redirect off /login) still gate the real behavior.
    testInfo.annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const creds = await signup(page)
    // logout by clearing storage and revisiting /login
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.getByLabel(/email/i).fill(creds.email)
      await page.getByLabel(/^password$/i).fill(creds.password)
      await page.getByRole('button', { name: /^sign in$/i }).click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    })
    const login = reqs.find((r) => r.method === 'POST' && r.url.includes('/api/users/log-in'))
    expect(login, 'POST /api/users/log-in observed').toBeDefined()
    expect(login!.status, 'login returned 2xx').toBeLessThan(300)
  })
})
