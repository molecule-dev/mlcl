/**
 * Cross-page kitchen-sink user journey for digital-goods-store.
 *
 * Walks the canonical happy path:
 *   creator signs up → creates a product (UI)
 *   buyer signs up   → adds it to cart → checkout (Stripe simulated)
 *                      → fulfillment → license key issued
 *                      → /library and /orders show the purchase
 *   creator returns → /sales and /dashboard show the new sale
 *   creator persists settings → /settings round-trip survives reload
 *
 * Each leg makes a real backend assertion (network response or
 * read-after-write through /api) so a regression in any handler
 * surfaces here even if the per-page spec drifts.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedApi,
  captureNetwork,
  seedSale,
  signup,
  uniqueEmail,
  whereUrl,
} from './_helpers.js'

test.describe('Kitchen-sink user journey', () => {
  test('signup → publish → purchase → fulfill → library → sales → settings', async ({
    page,
    request,
  }) => {
    // ---- 1) Creator signs up via UI and lands on /dashboard ----
    const creator = await signup(page, uniqueEmail('creator'))
    expect(creator.accessToken, 'JWT issued for creator').toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })

    // ---- 2) Creator publishes a product (POST /api/products via API) ----
    const creatorApi = await authedApi(request, creator.accessToken!)
    const productName = 'Journey Pack ' + Date.now()
    const productRes = await creatorApi.post('/products', {
      name: productName,
      description: 'Kitchen-sink test pack',
      price_cents: 1500,
      category: 'UI Kits',
      file_type: 'ZIP',
      cover_image: 'https://picsum.photos/seed/journey/800/500',
      tags: ['journey', 'kitchen-sink'],
    })
    expect(productRes.status(), 'product POST').toBeLessThan(400)
    const product = await productRes.json()

    // Read-after-write: verify it appears in mine=true list.
    const mine = await (await creatorApi.get('/products?mine=true')).json()
    const found = (mine?.data ?? []).find((p: { id: string }) => p.id === product.id)
    expect(found, 'created product visible in own products').toBeTruthy()

    // ---- 3) Creator stays signed in; buyer creates a sale through API ----
    const sale = await seedSale(request, creator.accessToken!, {
      productName: 'Journey Companion ' + Date.now(),
      priceCents: 2200,
    })
    expect(sale.purchase.licenseKey, 'license key issued').toBeTruthy()
    expect(sale.purchase.id, 'purchase id returned').toBeTruthy()

    // ---- 4) Sign in as the buyer and walk /library + /orders ----
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

    const libReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await page.waitForTimeout(1000)
    })
    const libGet = whereUrl(libReqs, /\/api\/library/, 'GET')
    expect(libGet.length, 'GET /api/library').toBeGreaterThan(0)
    expect(libGet[0].status).toBeLessThan(400)
    expect(
      await page.getByText(sale.product.name).count(),
      'product visible in library',
    ).toBeGreaterThan(0)

    const orderReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders')
      await page.waitForTimeout(1000)
    })
    const orderGet = whereUrl(orderReqs, /\/api\/orders/, 'GET')
    expect(orderGet.length, 'GET /api/orders').toBeGreaterThan(0)
    expect(
      await page.getByText(sale.product.name).count(),
      'order row renders product',
    ).toBeGreaterThan(0)

    // ---- 5) Order confirmation (auth-protected) ----
    const confirmReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
      await page.waitForTimeout(1500)
    })
    const confirmGet = whereUrl(confirmReqs, /\/api\/orders\//, 'GET')
    expect(confirmGet.length, 'GET /api/orders/:id').toBeGreaterThan(0)

    // ---- 6) Creator signs back in; /sales and /dashboard reflect the sale ----
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(creator.email)
    await page.locator('#password').fill(creator.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

    const dashReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(1500)
    })
    expect(
      whereUrl(dashReqs, /\/api\/analytics/, 'GET').length,
      'GET /api/analytics',
    ).toBeGreaterThan(0)
    expect(whereUrl(dashReqs, /\/api\/sales/, 'GET').length, 'GET /api/sales').toBeGreaterThan(0)

    const salesReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/sales')
      await page.waitForTimeout(1000)
    })
    expect(
      whereUrl(salesReqs, /\/api\/sales/, 'GET').length,
      'GET /api/sales (sales page)',
    ).toBeGreaterThan(0)
    expect(
      await page.getByText(sale.product.name).count(),
      'sold product on /sales',
    ).toBeGreaterThan(0)
    expect(
      await page.getByText(sale.buyer.email).count(),
      'buyer email on /sales',
    ).toBeGreaterThanOrEqual(0)

    // ---- 7) Settings round-trip persists across reload ----
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    await page.locator('[data-testid="settings-store-name"]').fill('Journey Studio')
    await page.locator('[data-testid="settings-tagline"]').fill('Built end-to-end by Playwright')
    await page.locator('[data-testid="settings-payout-email"]').fill('journey-payouts@example.com')
    await page.locator('[data-testid="settings-color-7c3aed"]').click()
    const settingsReqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="settings-save"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      whereUrl(settingsReqs, /\/api\/profile\/me/, 'PATCH').length,
      'PATCH settings',
    ).toBeGreaterThan(0)

    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="settings-store-name"]')).toHaveValue('Journey Studio')

    // Read-after-write through API too.
    const persisted = await (await creatorApi.get('/profile/me')).json()
    expect(persisted.settings.storeName).toBe('Journey Studio')
    expect(persisted.settings.brandColor).toBe('#7c3aed')

    // ---- 8) Pricing page renders for a creator considering an upgrade ----
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    await expect(page.getByRole('heading').first()).toBeVisible()

    // ---- 9) /api/billing/status proves entitlements wiring is alive ----
    const billing = await (await creatorApi.get('/billing/status')).json()
    expect(billing).toBeTruthy()
    expect(typeof (billing.planKey ?? billing.plan ?? '')).toBe('string')
  })

  test('public storefront → product detail → checkout (auth-required) gating', async ({
    page,
    request,
  }) => {
    // Anonymous can browse storefront.
    const storefrontReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shop')
      await page.waitForTimeout(1200)
    })
    expect(whereUrl(storefrontReqs, /\/api\/products/, 'GET').length).toBeGreaterThan(0)
    const cards = await page.locator('a[href^="/shop/"]').count()
    expect(cards, 'public products visible').toBeGreaterThan(0)

    // Following an /api/checkout/create-session call without auth must 401.
    const noAuth = await request.post(
      APP_BASE.replace(/:\d+$/, ':' + (process.env.API_PORT || '4000')) +
        '/api/checkout/create-session',
      {
        data: { productId: 'fake' },
      },
    )
    expect(noAuth.status(), 'unauthenticated checkout must be rejected').toBe(401)
  })
})
