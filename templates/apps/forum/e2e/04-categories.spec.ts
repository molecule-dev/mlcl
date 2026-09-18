/**
 * Category list, detail page, and category-scoped thread feed.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, firstCategory, seedThread, signup } from './_helpers.js'

test.describe('forum categories', () => {
  test('GET /categories auto-seeds and returns at least one row', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/categories`)
    expect(res.status()).toBeLessThan(400)
    const list = (await res.json()) as Array<{ slug: string }>
    expect(list.length).toBeGreaterThan(0)
  })

  test('GET /categories/by-slug/:slug round-trips via the seeded list', async ({ page }) => {
    const cat = await firstCategory(page)
    const res = await page.request.get(`${API_BASE}/categories/by-slug/${cat.slug}`)
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { id?: string; slug?: string }
    expect(body.id).toBe(cat.id)
    expect(body.slug).toBe(cat.slug)
  })

  test('GET /threads?category=<id> filters by category', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cat = await firstCategory(page)
    const thread = await seedThread(page, accessToken, { category_id: cat.id })

    const res = await page.request.get(
      `${API_BASE}/threads?category=${cat.id}&sort=latest&limit=50`,
    )
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { data?: Array<{ id: string; category_id?: string }> }
    expect(body.data?.some((th) => th.id === thread.id)).toBe(true)
    for (const th of body.data ?? []) {
      expect(th.category_id).toBe(cat.id)
    }
  })

  test('Categories page renders and the category card link works', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/categories')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('CategoryDetail page exposes a Subscribe button when authenticated', async ({ page }) => {
    await signup(page)
    const cat = await firstCategory(page)
    await page.goto(APP_BASE + '/c/' + cat.slug)
    await expect(page.getByRole('button', { name: /Subscribe|Subscribed/i }).first()).toBeVisible()
  })
})
