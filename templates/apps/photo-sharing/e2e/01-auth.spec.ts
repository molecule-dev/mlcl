import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, signup, login, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup → AuthGuard redirects to /explore and persists session', async ({ page }) => {
    const { email } = await signup(page)
    await expect(page).toHaveURL(/\/explore/)
    // /users/me reflects the authenticated session — use the page's
    // request context so cookies set during signup are sent.
    const me = await page.request.get(`${API_BASE}/users/me`)
    expect(me.status()).toBe(200)
    const body = await me.json()
    expect(body.props?.email).toBe(email)
    // Reload — session survives.
    await page.reload()
    await expect(page).toHaveURL(/\/explore/)
  })

  test('login replays existing credentials', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.context().clearCookies()
    await login(page, email, password)
    await expect(page).toHaveURL(/\/explore/)
  })

  test('forgot-password POST returns 200 even for unknown emails', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: uniqueEmail('forgot') },
      headers: { 'content-type': 'application/json' },
    })
    // Spec: even unknown emails should return success to avoid leaking
    // account existence.
    expect(r.status()).toBeLessThan(400)
  })

  test('forgot-password page renders & accepts input', async ({ page }) => {
    await page.goto(`${APP_BASE}/forgot-password`)
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('unauthenticated /upload → bounced to /login or landing', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`${APP_BASE}/upload`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/upload/)
  })
})
