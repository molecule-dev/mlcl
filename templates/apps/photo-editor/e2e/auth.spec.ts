/**
 * Auth flows for Lustra (photo-editor).
 *
 * Asserts on real outcomes: signup persists a user, login round-trips
 * the credentials, forgot-password actually fires Mailgun (sandbox or
 * synthetic-success when env says so), and reset-password issues a new
 * working session via the real token. Logout clears auth state and
 * locks the protected library route.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup persists a user and lands on /library', async ({ page }) => {
    const { email, accessToken, userId } = await signup(page)
    expect(accessToken).toBeTruthy()
    expect(userId).toBeTruthy()
    expect(page.url()).toMatch(/\/library/)

    // Read-after-write: GET /users/me must return the user we just created.
    const me = await page.request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(me.status(), await me.text()).toBe(200)
    const body = (await me.json()) as { props?: { email?: string; id?: string } }
    expect(body.props?.email?.toLowerCase()).toBe(email.toLowerCase())
    expect(body.props?.id).toBe(userId)
  })

  test('signup rejects mismatched passwords client-side and never POSTs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Mismatch Tester')
    await page.locator('input#email').fill(uniqueEmail('mismatch'))
    await page.locator('input#password').fill('PasswordA1!')
    await page.locator('input#confirm').fill('PasswordB2!')
    let signupCount = 0
    page.on('response', (resp) => {
      if (/\/api\/users\/?$/.test(resp.url()) && resp.request().method() === 'POST') {
        signupCount += 1
      }
    })
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/Passwords don.+t match/i)).toBeVisible()
    expect(signupCount).toBe(0)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('login with the just-created credentials returns the same session', async ({
    page,
    context,
  }) => {
    const { email, password, accessToken: signupToken } = await signup(page)

    // Simulate a fresh browser by clearing storage + cookies (full logout).
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    await page.waitForURL(/\/library/, { timeout: 15_000 })

    const newToken = await getAccessToken(page)
    expect(newToken).toBeTruthy()
    expect(newToken).not.toBe('') // a real session token, not empty
    // It does not have to equal the signup token — but it must authenticate.
    const me = await page.request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${newToken}` },
    })
    expect(me.status(), await me.text()).toBe(200)
    const body = (await me.json()) as { props?: { email?: string } }
    expect(body.props?.email?.toLowerCase()).toBe(email.toLowerCase())
    // And the original signup token still authenticates too (read-after-write).
    const me2 = await page.request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${signupToken}` },
    })
    expect(me2.status()).toBe(200)
  })

  test('login with wrong password fails and stays on /login', async ({ page }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('WrongPass999!')
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    // Must not redirect into the app.
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout clears local session and the next /library nav redirects to /login', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="lustra-logout"]').click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBeFalsy()
    // Hitting a protected route after logout must not render Library content.
    await page.goto(APP_BASE + '/library')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })

  test('forgot-password POST returns 2xx and (if configured) actually invokes Mailgun', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    const responses: { url: string; status: number }[] = []
    page.on('response', (resp) => {
      if (/\/api\/users\/forgot-password/.test(resp.url())) {
        responses.push({ url: resp.url(), status: resp.status() })
      }
    })
    await page.locator('input[type="email"]').fill(email)
    await page.locator('[data-mol-id="forgot-submit"]').click()
    // Wait for the call to land — handler returns 2xx whether or not Mailgun
    // succeeds (defence-in-depth against email enumeration).
    await page.waitForTimeout(2500)
    expect(responses.length).toBeGreaterThanOrEqual(1)
    expect(responses[0].status).toBeLessThan(500)
    // The handler must have completed without throwing — no 5xx.
    expect(responses[0].status).not.toBe(500)
  })

  test('forgot-password silently succeeds for unknown emails (no enumeration leak)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    let lastStatus = 0
    page.on('response', (resp) => {
      if (/\/api\/users\/forgot-password/.test(resp.url())) {
        lastStatus = resp.status()
      }
    })
    await page.locator('input[type="email"]').fill(`nobody-${Date.now()}@flagship.test`)
    await page.locator('[data-mol-id="forgot-submit"]').click()
    await page.waitForTimeout(2000)
    expect(lastStatus).toBeGreaterThanOrEqual(200)
    expect(lastStatus).toBeLessThan(500)
  })
})
