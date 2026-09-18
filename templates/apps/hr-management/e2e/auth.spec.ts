/**
 * Auth bootstrap: a fresh user can sign up, lands on /dashboard, and
 * the JWT bearer token is attached to subsequent /api/* requests so the
 * decorated demo data appears immediately. Also covers the
 * /forgot-password + /reset-password recovery surfaces.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('auth + bootstrap', () => {
  test('GET /signup renders the signup form', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /create your workspace/i })).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm')).toBeVisible()
  })

  test('GET /forgot-password renders the recovery form and posts to the API', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/users\/forgot-password/.test(r.url()) && r.request().method() === 'POST',
      ),
      page
        .getByRole('button', { name: /send reset link|send/i })
        .first()
        .click(),
    ])
    expect(resp.status(), 'forgot-password POST').toBeLessThan(500)
    await expect(page.getByText(/check your inbox|sent|email/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('GET /reset-password renders the new-password form (token query)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token-test-only')
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })
  test('signup → dashboard → seed populates employees', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken.length).toBeGreaterThan(20)
    const res = await page.request.get(`${API_BASE}/employees`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ id: string; name: string; status: string }>
    expect(Array.isArray(body)).toBe(true)
    // Assert the SHAPE of the roster, not who is in it — the demo roster is
    // the first thing an app's owner replaces.
    expect(body.length, 'the seed must populate the roster').toBeGreaterThan(0)
    for (const employee of body) {
      expect(employee.id).toMatch(/[0-9a-f-]{36}/)
      expect(employee.name, 'every employee needs a name').toBeTruthy()
      expect(employee.status, 'every employee needs a status').toBeTruthy()
    }
  })

  test('seed runs once: no duplicate departments after concurrent first reads', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await Promise.all([
      page.request.get(`${API_BASE}/employees`, { headers: apiHeaders(accessToken) }),
      page.request.get(`${API_BASE}/departments`, { headers: apiHeaders(accessToken) }),
      page.request.get(`${API_BASE}/pto`, { headers: apiHeaders(accessToken) }),
      page.request.get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) }),
    ])
    const res = await page.request.get(`${API_BASE}/departments`, {
      headers: apiHeaders(accessToken),
    })
    const depts = (await res.json()) as Array<{ name: string }>
    const counts = new Map<string, number>()
    for (const d of depts) counts.set(d.name, (counts.get(d.name) ?? 0) + 1)
    for (const [name, count] of counts) {
      expect(count, `dept ${name} should be unique`).toBe(1)
    }
  })

  test('login form rejects bad credentials and accepts good ones', async ({ page }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass!1234'
    const reg = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'Login Test' },
      failOnStatusCode: false,
    })
    expect(reg.status()).toBeLessThan(400)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('totally wrong')
    await page.locator('form button[type="submit"]').first().click()
    // Should still be on /login; an inline error appears.
    await expect(page).toHaveURL(/\/login/)
    await page.locator('input#password').fill(password)
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
  })
})
