import { test, expect, request } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup, signupAndGetToken, captureNetwork } from './_helpers'

// Cross-page flow exercising the primary contract: a developer signs up,
// creates an API key, calls the playground, persists profile changes,
// toggles an integration, and starts a real Stripe checkout session.

test.describe('developer end-to-end journey', () => {
  test('signup → create + reveal API key → playground call → profile save (persists) → integration toggle (persists) → real Stripe checkout', async ({
    page,
  }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/docs/)

    // ---- /settings/api-keys: create + reveal plaintext exactly once ----
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.getByRole('button', { name: /create key/i }).click()
    const labelInput = page.locator('input[placeholder*="Key label" i]').first()
    await labelInput.fill('CI pipeline')
    const apiKeyResps = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^create$/i }).click()
      // Wait for the reveal panel
      await page.locator('[data-revealed-key]').waitFor({ timeout: 10_000 })
    })
    const createCall = apiKeyResps.find(
      (r) => /\/api\/api_keys$/.test(r.url) && r.method === 'POST',
    )
    expect(createCall, 'POST /api/api_keys should fire').toBeTruthy()
    expect(createCall!.status).toBe(201)
    const revealedSecret = await page
      .locator('[data-revealed-key]')
      .first()
      .getAttribute('data-revealed-key')
    expect(revealedSecret, 'plaintext key must be surfaced once').toMatch(/^sk_live_[a-f0-9]{48}$/)

    // The key shows up in the table by its masked form.
    await expect(page.getByText(/sk_live_…/).first()).toBeVisible()

    // ---- /playground: fire a real backend call, see the response ----
    await page.goto(APP_BASE + '/playground')
    // Environment select (header) is the first <select>; method select (toolbar) is the second.
    const selects = page.locator('select')
    await selects.nth(0).selectOption('test')
    await selects.nth(1).selectOption('GET')
    // Use a public endpoint that always responds 200 so the upstream call succeeds.
    await page
      .getByRole('textbox', { name: /request url/i })
      .fill(`http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`)
    const playgroundResps = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^send$/i }).click()
      // Response panel appears with status code 200 when upstream call lands.
      await page
        .locator('pre')
        .filter({ hasText: /status|timestamp/ })
        .first()
        .waitFor({ timeout: 30_000 })
    })
    const tryItCall = playgroundResps.find(
      (r) => /\/api\/try-it$/.test(r.url) && r.method === 'POST',
    )
    expect(tryItCall, 'POST /api/try-it should fire').toBeTruthy()
    expect(tryItCall!.status).toBe(200)

    // ---- /settings: save display name + handle, then reload, confirm persistence ----
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^account$/i }).click()
    await page.locator('input[name="display_name"]').fill('Casey Curl')
    await page.locator('input[name="handle"]').fill('casey_dev')
    const saveResps = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await page.locator('[data-account-saved-at]').first().waitFor({ timeout: 10_000 })
    })
    const profilePatch = saveResps.find(
      (r) => /\/api\/profile$/.test(r.url) && r.method === 'PATCH',
    )
    expect(profilePatch, 'PATCH /api/profile should fire').toBeTruthy()
    expect(profilePatch!.status).toBe(200)

    // Reload — settings must persist (server-backed, not just local state).
    await page.reload()
    await page.getByRole('button', { name: /^account$/i }).click()
    await expect(page.locator('input[name="display_name"]')).toHaveValue('Casey Curl')
    await expect(page.locator('input[name="handle"]')).toHaveValue('casey_dev')

    // ---- /settings (integrations): toggle GitHub, reload, must remain connected ----
    await page.getByRole('button', { name: /^integrations$/i }).click()
    const integrationToggleResps = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^connect$/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const toggleCall = integrationToggleResps.find(
      (r) => /\/api\/integrations\/[^/]+\/toggle$/.test(r.url) && r.method === 'POST',
    )
    expect(toggleCall).toBeTruthy()
    expect(toggleCall!.status).toBe(200)
    await page.reload()
    await page.getByRole('button', { name: /^integrations$/i }).click()
    // After reload at least one Disconnect button should exist (means at least one is connected).
    await expect(page.getByRole('button', { name: /^disconnect$/i }).first()).toBeVisible({
      timeout: 10_000,
    })

    // ---- /settings/billing: change plan → real Stripe checkout URL ----
    await page.goto(APP_BASE + '/settings/billing')
    await page.getByRole('button', { name: /change plan/i }).click()
    await page.locator('[data-testid="plan-picker"]').waitFor({ timeout: 10_000 })

    // Block navigation away from the app so we can read the JSON response
    // before the page redirects to Stripe.
    await page.route(/checkout\.stripe\.com/, (route) => route.abort('aborted'))

    const [checkoutResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/billing\/checkout(\?|$)/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.locator('[data-testid="plan-picker"] button:not([disabled])').first().click(),
    ])
    expect(checkoutResp.status(), 'checkout endpoint must succeed').toBe(200)
    const checkoutBody = await checkoutResp.json()
    expect(
      checkoutBody?.checkoutUrl,
      'POST /api/billing/checkout must return a real Stripe Checkout URL',
    ).toMatch(/https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/)
  })

  test('signup creates a real users row, login round-trips it, and PATCH /api/profile is read-back consistent', async ({
    page,
  }) => {
    const { creds, token } = await signupAndGetToken(page)
    expect(token, 'token must be captured after signup').toBeTruthy()

    // Direct API verification: GET /api/profile must return the new user's email.
    // Use absolute URLs — Playwright's baseURL resolution treats '/profile'
    // as root-relative and would strip the '/api' suffix from API_BASE.
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const me = await ctx.get(API_BASE + '/profile')
    expect(me.status()).toBe(200)
    const meBody = await me.json()
    expect(meBody.email).toBe(creds.email)

    // PATCH and re-GET — the new bio must round-trip.
    const patch = await ctx.patch(API_BASE + '/profile', {
      data: { bio: 'I read every endpoint twice.' },
    })
    expect(patch.status()).toBe(200)
    const after = await ctx.get(API_BASE + '/profile')
    const afterBody = await after.json()
    expect(afterBody.bio).toBe('I read every endpoint twice.')

    await ctx.dispose()
  })
})
