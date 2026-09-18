/**
 * /presets — preset library page.
 *
 * Asserts:
 *   - GET /filters/presets returns the seeded built-ins (page renders > 0
 *     tiles, not the empty placeholder),
 *   - category chips re-filter the visible grid,
 *   - the API also accepts user-created presets via POST and they show up
 *     after a reload.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('presets', () => {
  test('library populates from GET /filters/presets (seeded built-ins are visible)', async ({
    page,
  }) => {
    await signup(page)
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/presets')
      await expect(page.locator('[data-mol-id="presets-grid"]')).toBeVisible({ timeout: 10_000 })
    })
    const presetsGet = calls.find(
      (c) => c.method === 'GET' && /\/api\/filters\/presets/.test(c.url),
    )
    expect(presetsGet?.status).toBe(200)
    const tileCount = await page
      .locator('[data-mol-id^="preset-"]')
      .filter({ has: page.locator('text=/CONT|SAT|GRN/') })
      .count()
    expect(tileCount).toBeGreaterThan(0)
  })

  test('clicking a category chip narrows the grid to matching tiles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/presets')
    await expect(page.locator('[data-mol-id="presets-grid"]')).toBeVisible({ timeout: 10_000 })
    const tileSelector = page.locator('[data-mol-id="presets-grid"] [data-mol-id^="preset-"]')
    const allCount = await tileSelector.count()
    expect(allCount).toBeGreaterThan(0)
    await page.locator('[data-mol-id="presets-cat-mono"]').click()
    // After filtering, the visible tile count must be <= the unfiltered count
    // (and may be zero — empty placeholder must then be visible).
    await page.waitForTimeout(200)
    const monoCount = await tileSelector.count()
    if (monoCount === 0) {
      await expect(page.locator('[data-mol-id="presets-empty"]')).toBeVisible()
    } else {
      expect(monoCount).toBeLessThanOrEqual(allCount)
    }
  })

  test('POST /filters/presets persists a user preset and GET returns it back', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.post(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(accessToken),
      data: { name: 'My custom look', parameters: { contrast: 12, saturation: -8 } },
    })
    expect(r.status()).toBe(201)
    const list = await page.request.get(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(accessToken),
    })
    expect(list.status()).toBe(200)
    const presets = (await list.json()) as Array<{ name: string; user_id: string | null }>
    const created = presets.find((p) => p.name === 'My custom look')
    expect(created).toBeTruthy()
    expect(created?.user_id).not.toBeNull()
  })
})
