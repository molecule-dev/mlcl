/**
 * Cross-page kitchen-sink journey: a brand-new user signs up, sees the
 * feed, composes a post, follows another creator, likes / comments on a
 * post, posts a story, files a moderation report, opens a DM thread,
 * and signs out — all in one continuous flow against the real app +
 * real API. Also exercises the /api/moderation and /api/stories handler
 * surfaces so the coverage gate sees them.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  followUser,
  likePost,
  seedPost,
  signup,
} from './_helpers.js'

test('signed-in user composes a post, follows a creator, files a report, posts a story, signs out', async ({
  page,
}) => {
  // 1. Author user creates a public post the viewer can interact with
  const author = await signup(page, undefined, undefined, 'Journey Author')
  const authorPost = await seedPost(page, author.accessToken, {
    caption: 'Kitchen-sink journey post',
    hashtags: ['journey'],
  })

  // 2. Viewer signs up via the API + lands on /feed
  const viewer = await signup(page, undefined, undefined, 'Journey Viewer')
  await page.goto(APP_BASE + '/feed')
  await expect(page.locator('body')).toContainText('Journey Viewer'.split(' ')[0], {
    timeout: 10_000,
  })

  // 3. Compose a new post via the UI
  await page.goto(APP_BASE + '/compose')
  const caption = `Journey composed post ${Date.now()}`
  await page.locator('textarea').first().fill(caption)
  await page.locator('input').nth(0).fill('journey ui')
  await page.locator('input').nth(1).fill('Journeyville')
  await Promise.all([
    page.waitForURL(/\/posts\/[\w-]+/, { timeout: 15_000 }),
    page.getByRole('button', { name: /publish/i }).click(),
  ])
  await expect(page.locator(`text=${caption}`)).toBeVisible()

  // 4. Follow + like + comment on the author's post via API
  await followUser(page, viewer.accessToken, author.userId)
  const liked = await likePost(page, viewer.accessToken, authorPost.id)
  expect(liked.liked).toBe(true)

  const commentRes = await page.request.post(`${API_BASE}/posts/${authorPost.id}/comments`, {
    headers: apiHeaders(viewer.accessToken),
    data: { body: 'journey nice work' },
  })
  expect(commentRes.status()).toBeLessThan(300)

  // 5. Post a story (24h ephemeral) — exercises /api/stories POST
  const storyRes = await page.request.post(`${API_BASE}/stories`, {
    headers: apiHeaders(viewer.accessToken),
    data: { media_url: 'https://example.test/story.png', caption: 'Journey story' },
  })
  expect(storyRes.status()).toBe(201)
  const storyListRes = await page.request.get(`${API_BASE}/stories`, {
    headers: apiHeaders(viewer.accessToken),
  })
  expect(storyListRes.status()).toBe(200)

  // 6. File a moderation report on the author's post — exercises /api/moderation POST + GET
  const reportRes = await page.request.post(`${API_BASE}/moderation`, {
    headers: apiHeaders(viewer.accessToken),
    data: {
      target_type: 'post',
      target_id: authorPost.id,
      reason: 'kitchen-sink journey report',
    },
  })
  expect(reportRes.status()).toBe(201)
  const reportListRes = await page.request.get(`${API_BASE}/moderation`, {
    headers: apiHeaders(viewer.accessToken),
  })
  expect(reportListRes.status()).toBe(200)
  const reports = (await reportListRes.json()) as Array<{ target_id: string }>
  expect(reports.some((r) => r.target_id === authorPost.id)).toBe(true)

  // 7. Open a DM thread to the author and send a message
  const threadRes = await page.request.post(`${API_BASE}/messages/threads`, {
    headers: apiHeaders(viewer.accessToken),
    data: { user_id: author.userId },
  })
  expect(threadRes.status()).toBeLessThan(300)
  const thread = (await threadRes.json()) as { id: string }
  const sendRes = await page.request.post(`${API_BASE}/messages/threads/${thread.id}/messages`, {
    headers: apiHeaders(viewer.accessToken),
    data: { content: 'journey DM hi' },
  })
  expect(sendRes.status()).toBeLessThan(300)

  // 8. Sign out → both the in-memory/localStorage token copy AND the
  //    persistent httpOnly `token` cookie are cleared; /feed then 401s
  //    and the AuthGuard sends the viewer to /login. The cookie is the
  //    real credential (see _helpers.getAccessToken), so localStorage.clear()
  //    alone leaves the session alive — clearCookies() is what signs out.
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/feed')
  await page.waitForURL(/\/login/, { timeout: 10_000 })
})
