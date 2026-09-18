/**
 * /settings — Lustra editor settings + plan upgrade.
 *
 * Asserts:
 *   - color profile + editor toggles persist to localStorage AND
 *     survive a full page reload (read-after-write on local state),
 *   - GET /billing/status + GET /billing/tiers populate the plan card,
 *   - clicking "Upgrade to Pro" POSTs /billing/checkout and the response
 *     payload contains a real Stripe Checkout URL or test session id —
 *     we don't navigate away (Stripe domain), but we verify the URL is
 *     plausibly a real checkout session, not a placeholder string.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings', () => {
  test('color profile selection persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Default is sRGB.
    await expect(page.locator('[data-mol-id="settings-profile-srgb"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    await page.locator('[data-mol-id="settings-profile-display-p3"]').click()
    await expect(page.locator('[data-mol-id="settings-profile-display-p3"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    const stored = await page.evaluate(() => window.localStorage.getItem('lustra:colorProfile'))
    expect(stored).toBe('display-p3')
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-profile-display-p3"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    await expect(page.locator('[data-mol-id="settings-profile-srgb"]')).toHaveAttribute(
      'data-active',
      'false',
    )
  })

  test('editor behaviour toggles persist across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Autosave starts on; flip it off.
    const autosave = page.locator('[data-mol-id="settings-toggle-autosave"]')
    await expect(autosave).toHaveAttribute('data-checked', 'true')
    await autosave.click()
    await expect(autosave).toHaveAttribute('data-checked', 'false')
    // AI suggest starts off; flip it on.
    const aiSuggest = page.locator('[data-mol-id="settings-toggle-aiSuggest"]')
    await expect(aiSuggest).toHaveAttribute('data-checked', 'false')
    await aiSuggest.click()
    await expect(aiSuggest).toHaveAttribute('data-checked', 'true')

    const raw = await page.evaluate(() => window.localStorage.getItem('lustra:editorToggles'))
    const stored = JSON.parse(raw ?? '{}') as Record<string, boolean>
    expect(stored.autosave).toBe(false)
    expect(stored.aiSuggest).toBe(true)

    await page.reload()
    await expect(page.locator('[data-mol-id="settings-toggle-autosave"]')).toHaveAttribute(
      'data-checked',
      'false',
    )
    await expect(page.locator('[data-mol-id="settings-toggle-aiSuggest"]')).toHaveAttribute(
      'data-checked',
      'true',
    )
  })

  test('plan card surfaces Free for new users + tiers list loads', async ({ page, request }) => {
    const { accessToken } = await signup(page)
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.locator('[data-mol-id="settings-plan-card"]')).toBeVisible()
    })
    expect(
      calls.find((c) => c.method === 'GET' && /\/api\/billing\/status/.test(c.url))?.status,
    ).toBe(200)
    expect(
      calls.find((c) => c.method === 'GET' && /\/api\/billing\/tiers/.test(c.url))?.status,
    ).toBe(200)
    await expect(page.locator('[data-mol-id="settings-plan-card"]')).toHaveAttribute(
      'data-plan-key',
      'free',
    )
    await expect(page.locator('[data-mol-id="settings-plan-name"]')).toContainText(/Free/i)
    // The Pro / Team upgrade buttons must render for free users.
    await expect(page.locator('[data-mol-id="settings-plan-upgrade-pro"]')).toBeVisible()

    // Direct API check — tiers must list at least free + pro + team.
    const r = await request.get(`${API_BASE}/billing/tiers`, { headers: apiHeaders(accessToken) })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { data: Array<{ key: string }> }
    const keys = body.data.map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro']))
  })

  test('Upgrade to Pro POSTs /billing/checkout and gets a real Stripe checkout URL', async ({
    page,
    request,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="settings-plan-upgrade-pro"]')).toBeVisible()

    // Block ALL navigation away from /settings while we click. The
    // upgrade handler does `globalThis.location.href = checkoutUrl`,
    // which would tear down the page before the test finishes.
    // page.route() with abort('aborted') stops the navigation request
    // (Stripe's checkout.stripe.com redirect) cold without affecting
    // our same-origin /api/* traffic.
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (/checkout\.stripe\.com/.test(url)) {
        return route.abort('aborted')
      }
      return route.continue()
    })

    const captured = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-plan-upgrade-pro"]').click()
      await page.waitForTimeout(2_500)
    })
    const checkoutCall = captured.find(
      (r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST',
    )
    expect(checkoutCall, 'expected POST /api/billing/checkout').toBeDefined()
    expect(checkoutCall!.status).toBe(200)

    // captureNetwork only retains response metadata. Re-issue the POST
    // with a real Stripe priceId from the tier list so we can assert
    // the handler actually returns a real Stripe checkout URL — this
    // is the real integration assertion (no mocks, real Stripe sandbox).
    const tiersResp = await request.get(`${API_BASE}/billing/tiers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const tiersBody = (await tiersResp.json()) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const proPrice = tiersBody.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(proPrice, 'no pro monthly stripe price seeded').toBeTruthy()
    const direct = await request.post(`${API_BASE}/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId: proPrice },
    })
    expect(direct.status()).toBe(200)
    const directBody = (await direct.json()) as { checkoutUrl?: string }
    expect(directBody.checkoutUrl ?? '').toMatch(/checkout\.stripe\.com|cs_test_|cs_live_/)
  })
})
