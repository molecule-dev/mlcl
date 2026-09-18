import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, addFirstProductToCart, captureNetwork, signup } from './_helpers.js'

test.describe('/cart', () => {
  test('empty cart for fresh user shows empty-state', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/cart')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/cart\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your cart is empty/i })).toBeVisible()
  })

  test('adding via /api/cart/items shows up in /cart UI and survives reload', async ({ page }) => {
    await signup(page)
    const { product } = await addFirstProductToCart(page, 1)
    expect(product?.id).toBeTruthy()
    await page.goto(APP_BASE + '/cart')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('body')).toContainText(new RegExp(escape(String(product.name))))
    await page.reload()
    await expect(page.locator('body')).toContainText(new RegExp(escape(String(product.name))))
  })

  test('cart subtotal is non-zero after adding a real product (read-after-write)', async ({
    page,
    request,
  }) => {
    await signup(page)
    await addFirstProductToCart(page, 2)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const r = await request.get(API_BASE + '/cart', { headers: { Cookie: cookieHeader } })
    const body = (await r.json()) as { items: unknown[]; subtotal: number }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.subtotal).toBeGreaterThan(0)
  })
})

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
