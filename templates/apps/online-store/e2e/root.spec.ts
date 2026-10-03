import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (storefront)', () => {
  test('renders without runtime errors and shows store branding', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    })
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: /Bazaar/i }).first()).toBeVisible({
      timeout: 10_000,
    })
    const fatal = consoleErrors.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
    expect(fatal).toEqual([])
  })

  test('storefront fetches real products from /api/products', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      // Arm the wait for the actual storefront response: under a cold vite /
      // busy machine the first mount fetch can land after a fixed
      // networkidle timeout has already closed the capture window (observed
      // as a deterministic-looking empty capture on fresh scaffolds).
      await page
        .waitForResponse((r) => /\/api\/(storefront|products)/.test(r.url()), { timeout: 30_000 })
        .catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/storefront\//.test(r.url) || /\/api\/products/.test(r.url)),
    ).toBeTruthy()
  })

  test('seeded products endpoint returns at least one product', async ({ request }) => {
    const res = await request.get(API_BASE + '/products?limit=5')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const list = body?.data ?? body?.products ?? body
    expect(Array.isArray(list) && list.length > 0).toBeTruthy()
  })
})
