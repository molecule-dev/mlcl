import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  type CatalogVideo,
  authedFetch,
  captureNetwork,
  pickTwoDistinctTitles,
  signup,
} from './_helpers.js'

test.describe('search page', () => {
  test('typing into the search box hits /api/videos/search and renders results', async ({
    page,
  }) => {
    await signup(page)
    // Search for a title the catalog actually holds — and check the other,
    // unrelated title is filtered out — rather than naming a demo video.
    const { target, other } = await pickTwoDistinctTitles(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      const input = page
        .locator('input[type="search"], input[type="text"], input[placeholder*="search" i]')
        .first()
      await expect(input).toBeVisible()
      await input.fill(target.title)
      await page.waitForTimeout(800)
      await expect(page.getByText(target.title).first()).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByText(other.title)).toHaveCount(0)
    })
    expect(reqs.some((r) => /\/api\/videos\/search/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('GET /api/videos/search?q= returns enriched matches', async ({ page }) => {
    await signup(page)
    const { target, other } = await pickTwoDistinctTitles(page)
    const { status, body } = await authedFetch<CatalogVideo[]>(
      page,
      `/api/videos/search?q=${encodeURIComponent(target.title)}`,
    )
    expect(status).toBe(200)
    const rows = (body ?? []) as CatalogVideo[]
    expect(rows.length, 'searching a real title must match it').toBeGreaterThan(0)
    expect(rows.some((v) => v.id === target.id)).toBe(true)
    expect(rows.some((v) => v.id === other.id)).toBe(false)
    // enrichVideo applies in the search handler too.
    expect(rows[0].channel_name).toBeTruthy()
  })

  test('Search with no results renders an empty state without errors', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page
      .locator('input[type="search"], input[type="text"], input[placeholder*="search" i]')
      .first()
    await input.fill('zzzzzz-no-such-video')
    await page.waitForTimeout(800)
    await expect(page.locator('main')).toBeVisible()
  })
})
