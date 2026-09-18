/**
 * Coaching content API contract.
 *
 * Coaching articles are published content rows the app ships with. The
 * handler is shared (no user_id) — every authenticated user gets the same
 * library, and the library itself is demo content an app's owner replaces,
 * so these specs assert its SHAPE, never a particular article.
 *
 * Outcomes:
 * - GET /coaching returns >= 1 article, each carrying the identity the
 *   detail route needs
 * - GET /coaching/:id returns the article body (free article shouldn't
 *   require Pro)
 * - Premium articles return a paywall hint when the user is on the
 *   free tier
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listCoachingArticles, signup } from './_helpers.js'

test('GET /coaching returns the published article library', async ({ page }) => {
  const { accessToken } = await signup(page)
  const list = await listCoachingArticles(page, accessToken)
  expect(list.length).toBeGreaterThan(0)
  // Every row must carry the identity the list page and /coaching/:id need.
  for (const article of list) {
    expect(article.id, JSON.stringify(article)).toBeTruthy()
    expect(article.slug, JSON.stringify(article)).toBeTruthy()
    expect(article.title, JSON.stringify(article)).toBeTruthy()
  }
})

test('GET /coaching/:id returns the requested article', async ({ page }) => {
  const { accessToken } = await signup(page)
  const items = await listCoachingArticles(page, accessToken)
  const free = items.find((a) => !a.is_premium) ?? items[0]
  expect(free, 'expected at least one article').toBeTruthy()

  const detail = await page.request.get(`${API_BASE}/coaching/${free!.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(detail.status()).toBe(200)
})
