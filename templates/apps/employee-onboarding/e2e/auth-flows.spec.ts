/**
 * Theme toggle, login round-trip, and forgot-password + signup/me
 * persistence — feature flows the basic auth.spec.ts smoke doesn't cover.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth flows', () => {
  test('signup persists the user name and is reflected on GET /onboardings/me', async ({
    page,
  }) => {
    const { accessToken, firstName, lastName } = await signup(
      page,
      uniqueEmail('auth-name'),
      'TestPass123!',
      'Avery',
      'Walker',
    )
    expect(firstName).toBe('Avery')
    expect(lastName).toBe('Walker')
    const r = await page.request.get(`${API_BASE}/onboardings/me`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const me = (await r.json()) as { user: { name?: string | null; firstName?: string | null } }
    expect(me.user.name).toBe('Avery Walker')
    expect(me.user.firstName).toBe('Avery')
  })

  test('after signup, log out and log back in lands on /dashboard', async ({ page }) => {
    const creds = await signup(page, uniqueEmail('auth-roundtrip'))
    await page.evaluate(() => window.localStorage.clear())
    await login(page, creds.email, creds.password)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('forgot-password POST returns 2xx (no user enumeration) for unknown + known email', async ({
    page,
  }) => {
    // Unknown email — must not 404 (would leak that email isn't registered).
    const unknown = await page.request.post(`${API_BASE}/users/forgot-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: 'nobody-' + Date.now() + '@example.com' },
    })
    expect([200, 201, 202, 204].includes(unknown.status())).toBe(true)

    const creds = await signup(page, uniqueEmail('auth-forgot'))
    const known = await page.request.post(`${API_BASE}/users/forgot-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: creds.email },
    })
    expect([200, 201, 202, 204].includes(known.status())).toBe(true)
  })

  test('Forgot-password page form posts to /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.waitForLoadState('networkidle')
    const calls: { url: string; status: number; method: string }[] = []
    page.on('response', (r) =>
      calls.push({ url: r.url(), status: r.status(), method: r.request().method() }),
    )
    await page
      .locator('input[type=email]')
      .first()
      .fill('forgot+' + Date.now() + '@example.com')
    await page
      .getByRole('button', { name: /send|reset/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    const fp = calls.find((c) => /\/users\/forgot-password/.test(c.url) && c.method === 'POST')
    expect(fp, 'forgot-password POST should fire from the form').toBeTruthy()
    expect(fp!.status).toBeLessThan(400)
  })

  test('reset-password full lifecycle: forgot → DB token → reset → login with new pw', async ({
    page,
  }) => {
    // Regression: prior to this test the per-app router was missing the
    // `POST /users/reset-password` route and `authConfig` was missing
    // `resetPasswordEndpoint`, so the whole reset flow 404'd silently.
    //
    // The platform now stores only sha256(token) at rest — the RAW token is
    // delivered solely by email and can never be read back from the DB
    // (submitting the stored digest must fail: that is the takeover vector
    // digest-at-rest exists to block). So: verify the digest was persisted,
    // prove the digest itself does NOT reset, then mint our own raw token,
    // persist its digest the same way forgot-password does, and submit the
    // raw token — the exact path the email link drives.
    const { createHash, randomBytes } = await import('node:crypto')
    const { Client } = await import('pg')
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgres://molecule:molecule@127.0.0.1:5432/employee_onboarding_test'
    const creds = await signup(page, uniqueEmail('auth-reset-lifecycle'))

    const fp = await page.request.post(`${API_BASE}/users/forgot-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: creds.email },
    })
    expect(fp.status()).toBeLessThan(400)

    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    let digest: string | null = null
    let rawToken = ''
    try {
      const r = await client.query<{ passwordResetToken: string | null }>(
        'SELECT "passwordResetToken" FROM "usersSecrets" WHERE id = (SELECT id FROM users WHERE email = $1)',
        [creds.email],
      )
      digest = r.rows[0]?.passwordResetToken ?? null
      expect(digest, 'forgot-password must persist a reset-token digest').toMatch(/[a-f0-9]{64}/)

      // The at-rest digest must NOT work as a token (DB dump != takeover).
      const digestAttempt = await page.request.post(`${API_BASE}/users/reset-password`, {
        headers: { 'Content-Type': 'application/json' },
        data: { token: digest!, password: 'BrandNewPwd!' + Date.now() },
        failOnStatusCode: false,
      })
      expect(digestAttempt.status(), 'the stored digest must NOT complete a reset').toBe(401)

      // Seed a known raw token exactly the way forgot-password does.
      rawToken = randomBytes(32).toString('hex')
      const seededDigest = createHash('sha256').update(rawToken).digest('hex')
      await client.query(
        'UPDATE "usersSecrets" SET "passwordResetToken" = $1, "passwordResetTokenAt" = now() WHERE id = (SELECT id FROM users WHERE email = $2)',
        [seededDigest, creds.email],
      )
    } finally {
      await client.end()
    }

    const newPassword = 'BrandNewPwd!' + Date.now()
    const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { token: rawToken, password: newPassword },
    })
    expect(reset.status(), await reset.text()).toBe(200)

    // Old password no longer works
    const oldLogin = await page.request.post(`${API_BASE}/users/log-in`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: creds.email, password: creds.password },
      failOnStatusCode: false,
    })
    expect(oldLogin.status()).toBeGreaterThanOrEqual(400)

    // New password works
    const newLogin = await page.request.post(`${API_BASE}/users/log-in`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: creds.email, password: newPassword },
    })
    expect(newLogin.status()).toBe(200)
  })
})

test.describe('theme', () => {
  test('toggling theme flips data-mol-mode AND persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('theme'))
    await page.waitForLoadState('networkidle')
    // The CSS-variables theme bond writes data-mol-mode (light/dark) and
    // data-mol-theme (theme name) on <html>. The mode is what flips on toggle.
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    const themeBtn = page.getByRole('button', { name: /(theme|dark|light)/i }).first()
    await expect(themeBtn).toBeVisible()
    await themeBtn.click()
    await page.waitForTimeout(400)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    expect(['light', 'dark']).toContain(after)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after)
  })
})
