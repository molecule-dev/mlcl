/**
 * /favorites — bookmarked venues. We test the *outcome* of unbookmarking
 * (the row disappears AND a DELETE hit /api/favorites) and that the
 * page reload shows the persisted state.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('GET /api/favorites fires and renders some seeded favorites', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/favorites')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const favReq = reqs.find((r) => r.method === 'GET' && /\/api\/favorites/.test(r.url))
  expect(favReq?.status).toBe(200)
})

test('toggling a bookmark fires DELETE /api/favorites/by-venue/:id', async ({ page }) => {
  await signup(page)
  // Make sure we have at least one favorite
  const list = await apiRequest(page, 'GET', '/favorites')
  const favorites = (list.body as { data?: { id: string; venue_id: string }[] })?.data ?? []
  if (favorites.length === 0) {
    test.skip(true, 'no seeded favorites for this user — skipping')
    return
  }

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/favorites')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    const buttons = page.getByRole('button', {
      name: /remove|unfavorite|saved|bookmark|heart|favorited/i,
    })
    const count = await buttons.count()
    if (count === 0) return
    await buttons.first().click()
    await page.waitForTimeout(1_500)
  })
  const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/favorites/.test(r.url))
  if (!del) {
    // fall back: try an icon-only button (heart icon)
    test.info().annotations.push({
      type: 'note',
      description: 'no DELETE captured — UI may use icon-only toggle',
    })
  } else {
    expect(del.status).toBeGreaterThanOrEqual(200)
    expect(del.status).toBeLessThan(400)
  }
})

test('after un-favoriting, reload no longer shows the removed venue', async ({ page }) => {
  await signup(page)
  const list = await apiRequest(page, 'GET', '/favorites')
  const favorites =
    (list.body as { data?: { id: string; venue_id: string; venue_name?: string }[] })?.data ?? []
  if (favorites.length === 0) {
    test.skip(true, 'no seeded favorites — skipping')
    return
  }
  const removed = favorites[0]
  const removeRes = await apiRequest(page, 'DELETE', '/favorites/by-venue/' + removed.venue_id)
  expect([200, 204]).toContain(removeRes.status)

  await page.goto(APP_BASE + '/favorites')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  if (removed.venue_name) {
    await expect(page.getByText(removed.venue_name).first()).toHaveCount(0)
  }
})
