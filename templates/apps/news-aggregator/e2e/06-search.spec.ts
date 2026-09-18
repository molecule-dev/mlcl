import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickStory, signup, uniqueEmail } from './_helpers.js'

test.describe('search', () => {
  test('typing a query hits /api/search and shows real story matches', async ({ page }) => {
    await signup(page, uniqueEmail('na-search'))
    // Search for a headline the feed actually holds instead of a demo word.
    const story = await pickStory(page)
    await page.goto(APP_BASE + '/search')

    const input = page.getByRole('searchbox').or(page.locator('input[type="search"]')).first()
    const reqs = await captureNetwork(page, async () => {
      await input.fill(story.headline)
      const resp = await page.waitForResponse(
        (r) => /\/api\/search\?q=/.test(r.url()) && r.status() === 200,
        { timeout: 10_000 },
      )
      const body = (await resp.json()) as Array<{ kind: string; headline?: string }>
      const stories = body.filter((b) => b.kind === 'story')
      expect(stories.length).toBeGreaterThan(0)
      await expect(page.getByText(story.headline).first()).toBeVisible({ timeout: 5_000 })
    })
    expect(reqs.some((r) => /\/api\/search/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('clearing the search returns to the empty state (no fake results)', async ({ page }) => {
    await signup(page, uniqueEmail('na-search-clear'))
    await page.goto(APP_BASE + '/search')

    const input = page.getByRole('searchbox').or(page.locator('input[type="search"]')).first()
    await input.fill('zzznoresult')
    await page.waitForTimeout(500)
    // The empty-state for stories scope.
    await expect(page.getByText(/No matches yet|No matches/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })
})
