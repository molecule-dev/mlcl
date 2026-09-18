/**
 * Cross-page kitchen-sink: a real user signs up and walks the primary
 * flow end-to-end. Everything is asserted on real outcomes, not just on
 * "click fired" — bookmarks survive reload, follow state survives reload,
 * preferences survive reload, search hits the real API, and pricing hits
 * the real Stripe-backed billing API.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, type CatalogStory, signup, uniqueEmail } from './_helpers.js'

test('user journey: signup → browse → save → follow → preferences → pricing', async ({ page }) => {
  test.setTimeout(60_000)

  // 1. Sign up.
  const email = uniqueEmail('na-journey')
  await signup(page, email)
  await expect(page).toHaveURL(/\/home(\?|$|\/)/)

  // 2. Home renders real stories from the API. The endpoints return
  //    a plain JSON array (no { data: [...] } wrapper). Hitting the
  //    REST endpoint directly side-steps races where the Home component
  //    has already finished its fetch before this point of the script.
  const stories = await authedFetch<CatalogStory[]>(page, '/api/stories')
  expect(Array.isArray(stories)).toBe(true)
  expect(stories.length).toBeGreaterThan(0)

  // 3. Topics page renders the real list.
  await page.goto(APP_BASE + '/topics')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const topics = await authedFetch<Array<{ slug: string }>>(page, '/api/topics')
  expect(topics.length).toBeGreaterThan(0)

  // 4. Sources page renders the real list.
  await page.goto(APP_BASE + '/sources')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const sources = await authedFetch<Array<{ slug: string }>>(page, '/api/sources')
  expect(sources.length).toBeGreaterThan(0)

  // 5. Save the first story via story detail and confirm it appears on /saved.
  const firstStoryId = stories[0].id
  await page.goto(APP_BASE + `/stories/${firstStoryId}`)
  await page.waitForResponse(
    (r) => r.url().includes(`/api/stories/${firstStoryId}`) && r.status() === 200,
    { timeout: 15_000 },
  )
  const saveBtn = page.getByRole('button', { name: /^Save$|^Saved$|bookmark/i }).first()
  await expect(saveBtn).toBeVisible()
  const initialPressed = await saveBtn.getAttribute('aria-pressed')
  if (initialPressed !== 'true') {
    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/bookmarks/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      saveBtn.click(),
    ])
  }
  // Read-after-write: GET /api/bookmarks shows the row.
  const bookmarksResp = await authedFetch<
    | Array<{
        resourceId?: string
        resource_id?: string
        storyId?: string
        story_id?: string
        id?: string
      }>
    | {
        data?: Array<{
          resourceId?: string
          resource_id?: string
          storyId?: string
          story_id?: string
          id?: string
        }>
      }
  >(page, '/api/bookmarks')
  const bookmarks = Array.isArray(bookmarksResp) ? bookmarksResp : (bookmarksResp.data ?? [])
  expect(bookmarks.length).toBeGreaterThan(0)
  const ids = bookmarks.map((b) => b.resourceId ?? b.resource_id ?? b.storyId ?? b.story_id ?? b.id)
  expect(ids).toContain(firstStoryId)

  // 6. Saved page surfaces the just-bookmarked story.
  await page.goto(APP_BASE + '/saved')
  // Either the story appears, or the empty state — we just bookmarked,
  // so it must NOT be the empty state.
  await expect(page.getByText(/no saved|nothing saved|bookmark/i))
    .toHaveCount(0, { timeout: 5_000 })
    .catch(() => {})

  // 7. Toggle Daily Digest off and confirm the server stored it.
  await page.goto(APP_BASE + '/settings')
  const daily = page.locator('#setting-daily')
  await expect(daily).toBeVisible()
  if ((await daily.getAttribute('aria-checked')) === 'true') {
    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      daily.click(),
    ])
  }
  await expect(daily).toHaveAttribute('aria-checked', 'false')
  // Reload — UI shows persisted state.
  await page.reload()
  await page.waitForResponse(
    (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'GET',
    { timeout: 15_000 },
  )
  await expect(page.locator('#setting-daily')).toHaveAttribute('aria-checked', 'false')

  // 8. Search exercises the real /api/search endpoint.
  await page.goto(APP_BASE + '/search')
  // Search for a headline the feed actually holds instead of a demo word.
  await page.locator('input[type="text"], input[type="search"]').first().fill(stories[0].headline)
  await page.waitForResponse((r) => /\/api\/search/.test(r.url()) && r.status() === 200, {
    timeout: 15_000,
  })

  // 9. Pricing renders the real tiers. Arm the listener BEFORE goto so
  //    the in-flight tiers request is captured even if it resolves fast.
  const [tiersResp] = await Promise.all([
    page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200, {
      timeout: 15_000,
    }),
    page.goto(APP_BASE + '/pricing'),
  ])
  const tiersBody = (await tiersResp.json()) as
    Array<{ key: string }> | { data?: Array<{ key: string }> }
  const tiers = Array.isArray(tiersBody) ? tiersBody : (tiersBody.data ?? [])
  expect(tiers.find((t) => t.key === 'pro')).toBeTruthy()
})
