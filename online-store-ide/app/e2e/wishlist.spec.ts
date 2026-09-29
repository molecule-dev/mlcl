import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/wishlist', () => {
  test('wishlist page renders for signed-in user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/wishlist')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/wishlist/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page).toHaveURL(/\/wishlist/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('POST /api/wishlist persists; GET reflects the new item', async ({ page, request }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const products = await request.get(API_BASE + '/products?limit=1').then((r) => r.json())
    const list = (products?.data ?? products?.products ?? products) as Array<{ id: string }>
    const productId = list[0].id
    const create = await request.post(API_BASE + '/wishlist', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { productId },
    })
    expect([200, 201].includes(create.status())).toBeTruthy()
    const get = await request.get(API_BASE + '/wishlist', { headers: { Cookie: cookieHeader } })
    expect(get.ok()).toBeTruthy()
    const body = await get.json()
    const items = body?.data ?? body
    expect(Array.isArray(items)).toBeTruthy()
    expect(
      (items as Array<{ product_id?: string; productId?: string }>).some(
        (i) => i.product_id === productId || i.productId === productId,
      ),
    ).toBeTruthy()
  })
})
