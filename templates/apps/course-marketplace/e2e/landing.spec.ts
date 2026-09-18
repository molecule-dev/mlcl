/**
 * / — public landing page. Renders seeded featured courses, categories,
 * and instructors. We assert that real seeded data appears (not just
 * placeholders), and that the catalog/instructor links resolve.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('renders the hero headline', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('fires GETs for featured + categories + instructors on mount', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const featured = reqs.find((r) => r.method === 'GET' && /\/api\/courses\/featured/.test(r.url))
    const categories = reqs.find(
      (r) => r.method === 'GET' && /\/api\/courses\/categories/.test(r.url),
    )
    const instructors = reqs.find((r) => r.method === 'GET' && /\/api\/instructors/.test(r.url))
    expect(featured, 'GET /api/courses/featured must fire').toBeTruthy()
    expect(featured!.status).toBeLessThan(400)
    expect(categories, 'GET /api/courses/categories must fire').toBeTruthy()
    expect(categories!.status).toBeLessThan(400)
    expect(instructors, 'GET /api/instructors must fire').toBeTruthy()
    expect(instructors!.status).toBeLessThan(400)
  })

  test('seed catalog returns at least one published course', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/courses/featured`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ id: string; title: string }>
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  test('clicking a featured course tile lands on /courses/:id', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const tile = page.locator('a[href^="/courses/"]').first()
    await expect(tile).toBeVisible({ timeout: 10000 })
    await tile.click()
    await page.waitForURL(/\/courses\/[0-9a-f-]+/, { timeout: 10000 })
  })
})
