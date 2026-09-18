import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, signup } from './_helpers.js'

test('Billing page renders the current plan and tier matrix', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/billing')
  await expect(page.locator('[data-test="billing-title"]')).toBeVisible()
  await expect(page.locator('[data-test="billing-tier-free"]')).toBeVisible()
  await expect(page.locator('[data-test="billing-tier-pro"]')).toBeVisible()
  await expect(page.locator('[data-test="billing-tier-team"]')).toBeVisible()
})

test('Billing status defaults to free + exposes weather-specific limits', async ({ page }) => {
  await signup(page)
  const status = await api<{
    planKey: string
    isFree: boolean
    limits: { maxLocations?: number; maxAlerts?: number; retentionDays?: number }
  }>(page, 'GET', '/billing/status')
  expect(status.planKey).toBe('free')
  expect(status.isFree).toBe(true)
  expect(status.limits.maxLocations).toBeGreaterThan(0)
  expect(status.limits.maxAlerts).toBeGreaterThan(0)
  expect(typeof status.limits.retentionDays).toBe('number')
})

test('Billing tiers expose real Stripe priceIds for paid plans', async ({ page }) => {
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const pro = tiers.data.find((t) => t.key === 'pro')
  expect(pro, 'pro tier present').toBeTruthy()
  const hasRealPrice = (pro!.prices ?? []).some(
    (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
  )
  expect(hasRealPrice, 'pro tier has at least one price_ id').toBe(true)
})

test('Clicking Upgrade on /billing posts to /api/billing/checkout with a real priceId', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/billing')
  const upgradeBtn = page.locator('[data-test^="billing-buy-pro-"]').first()
  await expect(upgradeBtn).toBeVisible()

  const reqs = await captureNetwork(page, async () => {
    await upgradeBtn.click()
    await page.waitForTimeout(1500)
  })
  const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
  expect(checkout, 'POST /api/billing/checkout fired').toBeTruthy()
  expect(checkout!.requestBody).toBeTruthy()
  let postedPriceId: string | null = null
  try {
    const parsed = JSON.parse(checkout!.requestBody as string) as { priceId?: string }
    postedPriceId = parsed.priceId ?? null
  } catch {
    /* swallow */
  }
  expect(postedPriceId, 'frontend posted a priceId').toMatch(/^price_/)
})

test('POST /api/billing/checkout returns a real Stripe Checkout URL for a paid priceId', async ({
  page,
}) => {
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const proPriceId =
    tiers.data.find((t) => t.key === 'pro')?.prices.find((p) => typeof p.stripePriceId === 'string')
      ?.stripePriceId ?? null
  expect(proPriceId).toMatch(/^price_/)

  const created = await api<{ checkoutUrl?: string; url?: string }>(
    page,
    'POST',
    '/billing/checkout',
    { priceId: proPriceId },
  )
  const url = created.checkoutUrl ?? created.url
  expect(url).toMatch(/checkout\.stripe\.com|cs_(test|live)_/)
})

test('Checkout endpoint rejects unknown priceId with 4xx', async ({ page }) => {
  await signup(page)
  const resp = await apiRaw(page, 'POST', '/billing/checkout', { priceId: 'price_NOT_REAL' })
  expect(resp.status()).toBeGreaterThanOrEqual(400)
})

test('SettingsPanel Upgrade button navigates to /billing', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.locator('[aria-label="Open user menu"]').click()
  await page.getByRole('button', { name: 'Upgrade', exact: true }).click()
  await expect(page).toHaveURL(/\/billing$/)
})
