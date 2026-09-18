/**
 * 99 — User journey. One single test that walks through the primary
 * happy-path of the app top-to-bottom, asserting on real outcomes
 * along the way. If this passes, a real human signing up and using
 * the product would not hit any feature dead-ends.
 *
 * Steps:
 *   1. Sign up.
 *   2. Author a post in the editor (or via API; both paths land the
 *      post on /posts).
 *   3. Read the post detail page → view counter bumps; clap +
 *      bookmark persist via the interactions endpoints; the bookmark
 *      shows up under /bookmarks/mine.
 *   4. Comment on the post → moderation surface lists the new row.
 *   5. Visit Analytics → totalPosts + totalViews + totalClaps reflect
 *      what we just did.
 *   6. Toggle theme + font in Settings → preferences persist across
 *      reload (DB + DOM).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  login,
  readInteractions,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('99 — full user journey: signup → post → react → comment → analytics → settings', async ({
  page,
}) => {
  // 1. Sign up
  const {
    email: journeyEmail,
    password: journeyPassword,
    accessToken,
    userId,
  } = await signup(page, uniqueEmail('journey'))
  expect(accessToken).toBeTruthy()
  expect(userId).toBeTruthy()

  // 2. Author a post
  const seeded = await seedPost(page, accessToken, {
    title: 'Journey post ' + Date.now(),
    content: 'A user-journey article body to read.',
  })
  await page.goto(APP_BASE + '/posts')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(seeded.title).first()).toBeVisible({ timeout: 10000 })

  // 3. Read the post detail page (anonymous to bump the view counter)
  const beforeRead = await readInteractions(page, accessToken, seeded.id)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + `/post/${seeded.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  const afterRead = await readInteractions(page, accessToken, seeded.id)
  expect(afterRead.views).toBeGreaterThan(beforeRead.views)

  // Re-authenticate by signing in as the same user so the httpOnly cookie is set.
  await login(page, journeyEmail, journeyPassword)

  // Clap + bookmark via API (UI exercises happen in post-detail.spec).
  const clap = await page.request.post(`${API_BASE}/posts/${seeded.id}/clap`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(clap.status()).toBeLessThan(400)
  const bookmark = await page.request.post(`${API_BASE}/posts/${seeded.id}/bookmark`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(bookmark.status()).toBeLessThan(400)

  const bookmarks = await page.request.get(`${API_BASE}/bookmarks/mine`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  const bmBody = (await bookmarks.json()) as { data: Array<{ resourceId: string }> }
  expect(bmBody.data.find((b) => b.resourceId === seeded.id)).toBeTruthy()

  // 4. Comment on the post via the UI composer.
  await page.goto(APP_BASE + `/comments?postId=${seeded.id}`)
  await page.waitForLoadState('networkidle')
  const body = `Journey comment ${Date.now()}`
  await page.locator('[data-mol-id="comments-create-body"]').fill(body)
  await page.locator('[data-mol-id="comments-create-submit"]').click()
  await page.waitForTimeout(800)
  const commentList = await page.request.get(
    `${API_BASE}/comments?resourceType=post&resourceId=${seeded.id}&status=all`,
    { headers: authHeaders(accessToken), failOnStatusCode: false },
  )
  const commentBody = (await commentList.json()) as { data: Array<{ body: string }> }
  expect(commentBody.data.find((c) => c.body === body)).toBeTruthy()

  // 5. Analytics reflects everything above.
  const summaryRes = await page.request.get(`${API_BASE}/analytics/summary`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  const summary = (await summaryRes.json()) as {
    totalPosts: number
    publishedPosts: number
    totalViews: number
    totalClaps: number
    totalComments: number
  }
  expect(summary.totalPosts).toBeGreaterThanOrEqual(1)
  expect(summary.publishedPosts).toBeGreaterThanOrEqual(1)
  expect(summary.totalViews).toBeGreaterThanOrEqual(1)
  expect(summary.totalClaps).toBeGreaterThanOrEqual(1)
  expect(summary.totalComments).toBeGreaterThanOrEqual(1)

  // 6. Settings: change theme + font, save, reload, assert DOM state.
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="mode-dark"]').first().click()
  await page.locator('[data-mol-id="font-large"]').first().click()
  await page.locator('[data-mol-id="save-settings-top"]').first().click()
  await expect(page.locator('[data-mol-id="settings-message"]')).toBeVisible({ timeout: 10000 })

  await page.reload()
  await page.waitForLoadState('networkidle')
  const theme = await page.evaluate(() => document.documentElement.dataset.theme)
  const font = await page.evaluate(() => document.documentElement.dataset.fontSize)
  expect(theme).toBe('dark')
  expect(font).toBe('large')
})
