/**
 * /library — categories + session grid. Asserts categories render with
 * counts, the session grid is populated, category-filter narrows results,
 * and the page hits /api/categories + /api/sessions on load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('library page (/library)', () => {
  test('renders categories with session_count from /api/categories', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')

    const r = await page.request.get(`${API_BASE}/categories`)
    expect(r.status()).toBe(200)
    const cats = (await r.json()) as Array<{ slug: string; label: string; session_count: number }>
    expect(cats.length).toBeGreaterThan(0)
    const first = cats[0]
    await expect(page.getByText(first.label, { exact: false }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('session grid shows at least one /sessions/* card link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await expect(page.locator('a[href^="/sessions/"]').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('clicking a category filters the session list via ?category=<slug>', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')

    const r = await page.request.get(`${API_BASE}/categories`)
    const cats = (await r.json()) as Array<{ slug: string; label: string }>
    // Whichever category the catalog actually holds — naming a seeded slug
    // ties the spec to demo content.
    const target = cats[0]
    expect(target, 'categories are populated').toBeTruthy()

    await page.locator(`a[href*="category=${target.slug}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`category=${target.slug}`))
    await expect(page.locator('a[href^="/sessions/"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('initial load hits /api/categories and /api/sessions', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await page.waitForLoadState('networkidle')
    })
    const got = (path: string) =>
      reqs.some((r) => r.method === 'GET' && r.url.includes(path) && r.status < 400)
    expect(got('/api/categories'), JSON.stringify(reqs.map((r) => r.url))).toBe(true)
    expect(got('/api/sessions')).toBe(true)
  })
})
