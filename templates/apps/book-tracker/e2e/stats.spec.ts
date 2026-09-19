/**
 * Stats: the page loads its three stat endpoints and renders the
 * monthly chart + rating distribution for a seeded finished book.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedBook, signup } from './_helpers.js'

test('stats page fetches monthly/genres/ratings on load', async ({ page }) => {
  const { accessToken } = await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/stats')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/stats\/monthly/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/stats\/genres/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/stats\/ratings/.test(r.url))?.status).toBe(200)
})

test('stats render a finished + rated book', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Stats Book', { shelf: 'read' })

  // Rate it 5 so the distribution has a nonzero bar.
  const review = await page.request.patch(`${API_BASE}/books/${book.id}/review`, {
    headers: apiHeaders(accessToken),
    data: { rating: 5 },
  })
  expect(review.status()).toBe(200)

  await page.goto(APP_BASE + '/stats')
  await expect(page.getByRole('heading', { name: /reading stats/i })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(/rating distribution/i)).toBeVisible()
  await expect(page.getByText(/★ 5\.0 average/).first()).toBeVisible({ timeout: 10_000 })
})
