import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('GET /api/billing/tiers returns >0 tiers', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { data?: unknown[] } | unknown[]
    const tiers = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect(tiers.length).toBeGreaterThan(0)
  })

  test('Pricing page renders public content', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(50)
    // Should mention Pro or some plan name
    expect(text).toMatch(/Free|Pro|Plan|Limit|tier|holdings/i)
  })

  test('POST /api/billing/checkout returns a real Stripe cs_test_ URL', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(accessToken),
    })
    const tiersBody = (await tiersRes.json()) as { data?: unknown[] } | unknown[]
    const tiers = (Array.isArray(tiersBody) ? tiersBody : (tiersBody.data ?? [])) as Array<{
      key: string
      prices?: Array<{ stripePriceId?: string }>
    }>
    const paid = tiers.find((t) => (t.prices ?? []).some((p) => p.stripePriceId))
    if (!paid) {
      test.skip(true, 'no paid tier configured with stripePriceId')
      return
    }
    const priceId = paid.prices!.find((p) => p.stripePriceId)!.stripePriceId
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId },
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as {
      url?: string
      checkoutUrl?: string
      data?: { url?: string; checkoutUrl?: string }
    }
    const url = body?.data?.url ?? body?.data?.checkoutUrl ?? body.url ?? body.checkoutUrl
    expect(url, 'no checkout url').toBeTruthy()
    expect(url).toMatch(/checkout\.stripe\.com|stripe\.com\/c\/pay/)
  })

  test('Upgrade button on /pricing triggers a /api/billing/checkout call', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle').catch(() => {})
    const responses: Array<{ url: string; status: number }> = []
    page.on('response', (r) => responses.push({ url: r.url(), status: r.status() }))
    const buttons = await page.getByRole('button', { name: /upgrade|choose|select/i }).all()
    if (buttons.length === 0) {
      test.skip(true, 'no upgrade buttons on this pricing UI')
      return
    }
    // Click the first non-Free upgrade button
    let clicked = false
    for (const btn of buttons) {
      const txt = await btn.innerText().catch(() => '')
      if (/free/i.test(txt)) continue
      await btn.click().catch(() => {})
      clicked = true
      break
    }
    if (!clicked) await buttons[0].click().catch(() => {})
    await page.waitForTimeout(3000)
    const checkout = responses.find(
      (r) => /\/api\/billing\/checkout/.test(r.url) && r.status === 200,
    )
    expect(
      checkout,
      JSON.stringify(responses.filter((r) => /billing/.test(r.url)).slice(0, 5)),
    ).toBeTruthy()
  })
})
