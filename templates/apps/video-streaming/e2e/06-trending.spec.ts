import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, pickTrendingVideo, signup } from './_helpers.js'

test.describe('trending page', () => {
  test('renders trending videos sorted by view_count', async ({ page }) => {
    await signup(page)
    // The most-viewed video comes from the same sort=trending query the page
    // runs, so the spec holds whatever the catalog contains.
    const top = await pickTrendingVideo(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trending')
      await expect(page.getByText(top.title).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.some((r) => /\/api\/videos/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('GET /api/videos?sort=trending returns rows ordered by view_count desc', async ({
    page,
  }) => {
    await signup(page)
    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(
      page,
      '/api/videos?sort=trending&limit=10',
    )
    expect(status).toBe(200)
    const rows = (body ?? []) as Array<Record<string, unknown>>
    expect(rows.length).toBeGreaterThan(0)
    for (let i = 1; i < rows.length; i++) {
      expect((rows[i - 1].view_count as number) ?? 0).toBeGreaterThanOrEqual(
        (rows[i].view_count as number) ?? 0,
      )
    }
  })
})
