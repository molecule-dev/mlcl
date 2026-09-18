import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE } from './_helpers.js'

test.describe('product detail', () => {
  test('GET /api/products returns paginated results', async ({ request }) => {
    const r = await request.get(API_BASE + '/products?limit=10')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    const list = body?.data ?? body?.products ?? body
    expect(Array.isArray(list)).toBeTruthy()
    expect(list.length).toBeGreaterThan(0)
  })

  test('product detail page renders for the first seeded product', async ({ page, request }) => {
    const r = await request.get(API_BASE + '/products?limit=1')
    const body = await r.json()
    const list = (body?.data ?? body?.products ?? body) as Array<{ id: string; name: string }>
    const first = list[0]
    await page.goto(APP_BASE + '/product/' + first.id)
    await expect(page.locator('body')).toContainText(first.name, { timeout: 10_000 })
  })

  test('GET /api/products/:id returns the requested product', async ({ request }) => {
    const list = await request.get(API_BASE + '/products?limit=1').then((r) => r.json())
    const items = list?.data ?? list?.products ?? list
    const id = items[0].id
    const detail = await request.get(API_BASE + '/products/' + id).then((r) => r.json())
    const product = detail?.data ?? detail
    expect(product.id).toBe(id)
  })
})
