import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE } from './_helpers.js'

test.describe('storefront API', () => {
  test('GET /api/storefront/categories returns a list', async ({ request }) => {
    const r = await request.get(API_BASE + '/storefront/categories')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    const list = body?.data ?? body
    expect(Array.isArray(list)).toBeTruthy()
  })

  test('GET /api/storefront/bestsellers returns products', async ({ request }) => {
    const r = await request.get(API_BASE + '/storefront/bestsellers?limit=3')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    const list = body?.data ?? body
    expect(Array.isArray(list)).toBeTruthy()
  })

  test('GET /api/storefront/new-arrivals returns products', async ({ request }) => {
    const r = await request.get(API_BASE + '/storefront/new-arrivals?limit=3')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    const list = body?.data ?? body
    expect(Array.isArray(list)).toBeTruthy()
  })

  test('search route renders without errors', async ({ page }) => {
    await page.goto(APP_BASE + '/search?q=shirt')
    await expect(page).toHaveURL(/\/search/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('category route renders for a known slug', async ({ page, request }) => {
    const cats = await request.get(API_BASE + '/storefront/categories').then((r) => r.json())
    const list = (cats?.data ?? cats) as Array<{ slug?: string; name?: string }>
    const slug =
      list?.[0]?.slug ||
      (list?.[0]?.name && list[0].name!.toLowerCase().replace(/\s+/g, '-')) ||
      'apparel'
    await page.goto(APP_BASE + '/category/' + slug)
    await expect(page.locator('body')).toBeVisible()
  })
})
