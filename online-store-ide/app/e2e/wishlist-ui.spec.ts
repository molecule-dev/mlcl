import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

async function authedRequest(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies()
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

test.describe('wishlist UI', () => {
  test('clicking the heart on a product detail page persists to /api/wishlist', async ({
    page,
    request,
  }) => {
    await signup(page)
    const cookieHeader = await authedRequest(page)
    const products = (await request.get(API_BASE + '/products?limit=1').then((r) => r.json())) as {
      data: Array<{ id: string }>
    }
    const productId = products.data[0].id

    await page.goto(APP_BASE + '/product/' + productId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    const heart = page.locator('[data-mol-id="add-to-wishlist"]')
    await expect(heart).toBeVisible({ timeout: 10_000 })
    await expect(heart).toHaveAttribute('data-wishlisted', 'false')

    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/wishlist\b/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      heart.click(),
    ])

    await expect(heart).toHaveAttribute('data-wishlisted', 'true', { timeout: 10_000 })

    const wl = (await request
      .get(API_BASE + '/wishlist', { headers: { Cookie: cookieHeader } })
      .then((r) => r.json())) as
      | { data: Array<{ product_id?: string; productId?: string }> }
      | Array<{ product_id?: string; productId?: string }>
    const list = Array.isArray(wl) ? wl : (wl.data ?? [])
    expect(
      list.some((row) => String(row.product_id ?? row.productId) === String(productId)),
    ).toBeTruthy()
  })

  test('reload preserves the wishlisted state on product page', async ({ page, request }) => {
    await signup(page)
    const cookieHeader = await authedRequest(page)
    const products = (await request.get(API_BASE + '/products?limit=1').then((r) => r.json())) as {
      data: Array<{ id: string }>
    }
    const productId = products.data[0].id

    await request.post(API_BASE + '/wishlist', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { productId },
    })

    await page.goto(APP_BASE + '/product/' + productId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const heart = page.locator('[data-mol-id="add-to-wishlist"]')
    await expect(heart).toHaveAttribute('data-wishlisted', 'true', { timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(heart).toHaveAttribute('data-wishlisted', 'true', { timeout: 10_000 })
  })

  test('un-favoriting removes the entry from /api/wishlist', async ({ page, request }) => {
    await signup(page)
    const cookieHeader = await authedRequest(page)
    const products = (await request.get(API_BASE + '/products?limit=1').then((r) => r.json())) as {
      data: Array<{ id: string }>
    }
    const productId = products.data[0].id

    await request.post(API_BASE + '/wishlist', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { productId },
    })

    await page.goto(APP_BASE + '/product/' + productId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const heart = page.locator('[data-mol-id="add-to-wishlist"]')
    await expect(heart).toHaveAttribute('data-wishlisted', 'true', { timeout: 10_000 })

    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/wishlist\//.test(r.url()) && r.request().method() === 'DELETE',
        { timeout: 15_000 },
      ),
      heart.click(),
    ])

    await expect(heart).toHaveAttribute('data-wishlisted', 'false', { timeout: 10_000 })

    const wl = (await request
      .get(API_BASE + '/wishlist', { headers: { Cookie: cookieHeader } })
      .then((r) => r.json())) as
      | { data: Array<{ product_id?: string; productId?: string }> }
      | Array<{ product_id?: string; productId?: string }>
    const list = Array.isArray(wl) ? wl : (wl.data ?? [])
    expect(
      list.some((row) => String(row.product_id ?? row.productId) === String(productId)),
    ).toBeFalsy()
  })
})
