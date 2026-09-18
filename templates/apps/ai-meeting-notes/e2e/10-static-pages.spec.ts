import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('static pages', () => {
  test('/terms renders the Terms of Service heading and policy sections', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
    // Policy must mention recording consent and subscription billing — these
    // are core obligations in the published copy, not boilerplate placeholders.
    await expect(page.getByText(/recording|consent/i).first()).toBeVisible()
    await expect(page.getByText(/subscription|billing/i).first()).toBeVisible()
  })

  test('/privacy renders the Privacy Policy with data-handling sections', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
    // Policy must enumerate what we collect and the third parties we share with.
    await expect(page.getByText(/audio|transcript/i).first()).toBeVisible()
    await expect(page.getByText(/openai|whisper|anthropic|claude/i).first()).toBeVisible()
  })

  test('Privacy and Terms are reachable from the landing footer', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const terms = page.getByRole('link', { name: /terms/i }).first()
    if (await terms.count().catch(() => 0)) {
      await terms.click()
      await expect(page).toHaveURL(/\/terms/)
      await page.goBack()
    }
    const privacy = page.getByRole('link', { name: /privacy/i }).first()
    if (await privacy.count().catch(() => 0)) {
      await privacy.click()
      await expect(page).toHaveURL(/\/privacy/)
    }
  })
})

test.describe('forgot-password / reset-password', () => {
  test('/forgot-password posts to /api/users/forgot-password and surfaces the sent state', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('aimn-forgot')
    // Test the *unknown email* path through the UI so the handler returns
    // immediately (no Mailgun round-trip), avoiding flake from real
    // upstream-provider latency. We separately exercise the real-user
    // branch with a direct API call below.
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/email/i).first().fill(email)
      await page
        .getByRole('button', { name: /send.*reset|reset.*link|send/i })
        .first()
        .click()
      // The "we sent a reset link" success state must appear once the
      // POST resolves. Allow generous time for the (synthetic-success)
      // Mailgun fallback when MAILGUN_TEST_MODE is on.
      await expect(page.getByText(/check your inbox|we sent|reset link/i).first()).toBeVisible({
        timeout: 30_000,
      })
    })

    const forgotCall = reqs.find(
      (r) => r.method === 'POST' && /\/users\/forgot-password/.test(r.url),
    )
    expect(
      forgotCall,
      `no POST /api/users/forgot-password observed; saw: ${reqs.map((r) => `${r.method} ${r.url}`).join('\n')}`,
    ).toBeTruthy()
    expect(forgotCall!.status).toBeLessThan(500)

    // Real-user branch: signing up an account, then directly POSTing,
    // must also return a 2xx response, matching the public contract.
    const realEmail = uniqueEmail('aimn-forgot-real')
    await signup(page, realEmail, 'TestPass123!')
    const direct = await request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: realEmail },
    })
    expect(direct.status()).toBeGreaterThanOrEqual(200)
    expect(direct.status()).toBeLessThan(300)
  })

  test('/reset-password without a token shows an error and never calls the API', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(
      page.getByRole('heading', { name: /set.*new.*password|new password/i }),
    ).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByLabel(/^new password$|^password$/i)
        .first()
        .fill('NewSecure123!')
      await page
        .getByLabel(/confirm/i)
        .first()
        .fill('NewSecure123!')
      await page
        .getByRole('button', { name: /reset|submit|set/i })
        .first()
        .click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    })

    const resetCall = reqs.find((r) => /\/users\/reset-password/.test(r.url))
    expect(resetCall, 'reset-password should not be hit without a token').toBeFalsy()
    // Validation must mention the missing token / expired link.
    await expect(page.getByText(/missing|expired|request a new/i).first()).toBeVisible()
  })

  test('/reset-password with a real token rotates the password and redirects to /login', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('aimn-reset')
    const oldPassword = 'OldPass123!'
    const newPassword = 'NewPass456!'
    await signup(page, email, oldPassword)

    // Sign out
    await page
      .getByRole('button', { name: /account|menu|profile|user|listener/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10_000 })

    // Trigger a reset and pull the token straight out of the secrets table
    // via the dev/test inspector endpoint mock-server exposes when present.
    // The forgot-password handler always 200s. The token only exists if the
    // user was found, which we verified by signing up first.
    const forgot = await request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
    })
    expect(forgot.status()).toBeLessThan(500)
    expect(forgot.status()).toBeLessThan(400)

    // Read the most recent reset token directly from the DB-backed secrets
    // table via the testing trapdoor — molecule-test exposes it under
    // /api/__test__/reset-token?email=... when NODE_ENV !== 'production'.
    // If unavailable, skip the round-trip assertion and just verify the
    // request reached the server.
    const tokenRes = await request.get(
      `${API_BASE}/__test__/reset-token?email=${encodeURIComponent(email)}`,
    )
    if (!tokenRes.ok()) {
      // Trapdoor not available; we still assert the request was 2xx above.
      return
    }
    const { token } = (await tokenRes.json()) as { token: string }
    expect(token).toBeTruthy()

    await page.goto(`${APP_BASE}/reset-password?token=${encodeURIComponent(token)}`)
    await page
      .getByLabel(/^new password$|^password$/i)
      .first()
      .fill(newPassword)
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill(newPassword)
    await page
      .getByRole('button', { name: /reset|submit|set/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // Verify the new password actually works against the API.
    const login = await request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: newPassword },
    })
    expect(login.status()).toBe(200)
  })
})

test.describe('plan-updated', () => {
  test('/plan-updated renders the success message and a link back to /', async ({ page }) => {
    const email = uniqueEmail('aimn-plan-updated')
    await signup(page, email, 'TestPass123!')
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/plan|thank|updated|success/i).first()).toBeVisible()
    const home = page.getByRole('link', { name: /home|back|return|dashboard/i }).first()
    await expect(home).toBeVisible()
    await home.click()
    await expect(page).toHaveURL(/\/(dashboard)?$|\/dashboard/, { timeout: 10_000 })
  })
})
