/**
 * /wishlist — saved stays grid.
 *
 * Real outcomes asserted:
 *   - GET /api/bookmarks fires on mount and 200s
 *   - every bookmark the API holds renders as a card
 *   - removing a bookmark via the heart actually DELETEs and the row
 *     disappears from the page; the API confirms it on next GET
 *   - "Browse stays" empty-state CTA links back to /search
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, ensureBookmark, signup } from './_helpers'

test('wishlist renders every bookmark the API holds', async ({ page }) => {
  await signup(page)
  // Whatever a fresh account starts with is demo content an owner replaces, so
  // save a stay through the product first and assert the page against the API.
  const saved = await ensureBookmark(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/wishlist')
    await page.waitForLoadState('networkidle')
  })
  const bookmarks = reqs.find((r) => r.url.includes('/api/bookmarks') && r.method === 'GET')
  expect(bookmarks?.status).toBe(200)

  const cards = page.locator('a[href^="/listings/"]')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
  await expect(cards).toHaveCount(saved.length)
  for (const row of saved) {
    await expect(page.locator(`a[href="/listings/${row.listing_id}"]`)).toBeAttached()
  }
})

test('removing a bookmark from /wishlist deletes the row (read-after-write)', async ({ page }) => {
  await signup(page)
  // Save a stay first rather than assuming a seeded bookmark is there to remove.
  const before = await ensureBookmark(page)
  await page.goto(APP_BASE + '/wishlist')
  await page.waitForLoadState('networkidle')

  const targetListingId = before[0].listing_id

  const heart = page
    .locator(`a[href="/listings/${targetListingId}"]`)
    .locator('button[aria-label*="save" i], button[aria-label*="bookmark" i]')
    .first()
  await heart.click()
  await page.waitForTimeout(800)

  // The card should disappear (optimistic update + DELETE).
  await expect(page.locator(`a[href="/listings/${targetListingId}"]`)).toHaveCount(0)

  // Read-after-write: GET confirms it.
  const after = await page.request.get(`${API_BASE}/bookmarks`)
  const afterBody = (await after.json()) as { data: Array<{ listing_id: string }> }
  expect(afterBody.data.map((r) => r.listing_id)).not.toContain(targetListingId)
})

test('empty wishlist shows browse-stays CTA that navigates to /search', async ({ page }) => {
  await signup(page)
  // Strip whatever bookmarks the account starts with, via the API.
  const r = await page.request.get(`${API_BASE}/bookmarks`)
  const body = (await r.json()) as { data: Array<{ listing_id: string }> }
  for (const row of body.data) {
    await page.request.delete(`${API_BASE}/bookmarks/${row.listing_id}`)
  }

  await page.goto(APP_BASE + '/wishlist')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('a[href^="/listings/"]')).toHaveCount(0)
  await page
    .getByRole('link', { name: /browse stays/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/search$/)
})
