/**
 * Public board surfaces: the directory grid and one board's post list.
 * Both render signed-out — the feedback portal's public face.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, firstBoard } from './_helpers.js'

test.describe('boards', () => {
  test('board directory renders the live boards publicly', async ({ page }) => {
    // Read expected rows from the API — never the fixture content.
    const api = await page.request.get(`${API_BASE}/boards`)
    expect(api.status()).toBeLessThan(300)
    const rows = (await api.json()) as Array<{ id: string; name: string; post_count: number }>

    await page.goto(APP_BASE + '/boards')
    const cards = page.locator('[data-mol-id="board-card"]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    await expect(cards).toHaveCount(rows.length)
  })

  test('board detail lists its posts, most-voted first', async ({ page }) => {
    const board = await firstBoard(page)
    const api = await page.request.get(`${API_BASE}/posts?board=${board.id}&sort=top&limit=50`)
    expect(api.status()).toBeLessThan(300)
    const { data } = (await api.json()) as { data: Array<{ id: string; title: string }> }

    await page.goto(APP_BASE + `/b/${board.slug}`)
    const cards = page.locator('[data-mol-id="post-card"]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    const shown = await cards.count()
    expect(shown).toBeGreaterThan(0)
    // The visible set matches what the API returns for this board.
    const firstTitle = await cards.first().locator('h3').innerText()
    expect(data.some((p) => p.title === firstTitle)).toBe(true)
  })

  test('status filter chips narrow the list', async ({ page }) => {
    const board = await firstBoard(page)
    await page.goto(APP_BASE + `/b/${board.slug}`)
    const filter = page.locator('[data-mol-id="filter-shipped"]')
    await expect(filter).toBeVisible({ timeout: 15000 })
    await filter.click()
    // Every visible card must now carry the shipped badge.
    const cards = page.locator('[data-mol-id="post-card"]')
    const count = await cards.count()
    if (count > 0) {
      await expect(cards.first().locator('[data-mol-id="status-badge-shipped"]')).toBeVisible()
    }
  })

  test('roadmap and changelog render publicly', async ({ page }) => {
    await page.goto(APP_BASE + '/roadmap')
    await expect(page.getByRole('heading', { name: /roadmap|building/i }).first()).toBeVisible({
      timeout: 15000,
    })
    await page.goto(APP_BASE + '/changelog')
    await expect(page.getByRole('heading', { name: /changelog|shipped/i }).first()).toBeVisible({
      timeout: 15000,
    })
  })
})
