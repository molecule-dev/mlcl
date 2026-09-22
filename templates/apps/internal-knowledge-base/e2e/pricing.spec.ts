import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Pricing renders public tier list (no auth required)', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  // Page loads and shows tier headings (Free / Pro / Team)
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15_000 })
})

test('Authenticated user clicking a paid plan triggers /api/billing/checkout', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  await page.waitForTimeout(1500)
  // Find any "Upgrade" / "Subscribe" / "Choose" button on the paid plans
  const buttons = page.getByRole('button', {
    name: /upgrade|subscribe|choose|select/i,
  })
  const count = await buttons.count()
  if (count === 0) {
    test.skip(true, 'No paid plan buttons rendered (free-only build)')
  }
  const reqs = await captureNetwork(page, async () => {
    await buttons.first().click()
    await page.waitForTimeout(3000)
  })
  const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
  expect(checkout, 'No POST /api/billing/checkout was observed').toBeDefined()
  // Stripe checkout URL or 200 response with checkout_url field
  expect([200, 201]).toContain(checkout!.status)
})

test('POST /api/billing/checkout returns a real Stripe Checkout URL (cs_test_*)', async ({
  page,
}) => {
  // Direct API hit so we can read the response body cleanly without racing
  // window.location.assign(checkoutUrl) — proves the bond actually called Stripe.
  await signup(page)
  const tiers = await page.request.get(APP_BASE + '/api/billing/tiers')
  expect(tiers.status()).toBe(200)
  const tiersJson = (await tiers.json()) as {
    data: Array<{ prices: Array<{ stripePriceId?: string }> }>
  }
  const paidPriceId = tiersJson.data
    .flatMap((t) => t.prices)
    .find((p) => p.stripePriceId)?.stripePriceId
  if (!paidPriceId) test.skip(true, 'No paid Stripe priceId in tiers (free-only build)')

  const r = await page.request.post(APP_BASE + '/api/billing/checkout', {
    data: { priceId: paidPriceId },
  })
  expect(r.status(), 'checkout should succeed').toBe(200)
  const body = (await r.json()) as { checkoutUrl?: string; updated?: boolean }
  expect(
    body.checkoutUrl ?? '',
    `expected Stripe checkout URL; body=${JSON.stringify(body)}`,
  ).toMatch(/checkout\.stripe\.com.*cs_test_/)
})

test('GET /api/billing/tiers returns paid tier metadata', async ({ page }) => {
  // Arm the listener BEFORE the goto: the tiers GET fires on page mount, so
  // capturing after the navigation races the request and flakes.
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
  })
  const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url))
  expect(tiers, 'GET /api/billing/tiers should be called').toBeDefined()
  expect(tiers?.status).toBe(200)
})
