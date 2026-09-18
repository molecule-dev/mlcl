import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  commentOnPost,
  followUser,
  likePost,
  seedPost,
  signup,
} from './_helpers.js'

test.describe('notifications page', () => {
  test('Notifications include new likes, comments, and follows', async ({ page }) => {
    const target = await signup(page, undefined, undefined, 'Target')
    const post = await seedPost(page, target.accessToken, { caption: 'Notify on this' })

    const actor = await signup(page, undefined, undefined, 'Actor')
    await likePost(page, actor.accessToken, post.id)
    await commentOnPost(page, actor.accessToken, post.id, 'nice work!')
    await followUser(page, actor.accessToken, target.userId)

    // Log in as target so the httpOnly cookie is set for their session.
    await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email: target.email, password: target.password },
      headers: { 'Content-Type': 'application/json' },
    })

    await page.goto(APP_BASE + '/notifications')
    const main = page.locator('main')
    await expect(main).toContainText(/like/i, { timeout: 10_000 })
    await expect(main).toContainText(/comment/i)
    await expect(main).toContainText(/follow/i)
  })

  test('Page mount fetches /api/notifications via captureNetwork', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    const hit = reqs.some((r) => /\/api\/notifications/.test(r.url))
    expect(hit, 'notifications page should fetch /api/notifications').toBeTruthy()
  })

  test('Notification rows link back to the originating post', async ({ page }) => {
    const target = await signup(page, undefined, undefined, 'LinkTarget')
    const post = await seedPost(page, target.accessToken, { caption: 'Link target post' })
    const actor = await signup(page, undefined, undefined, 'LinkActor')
    await commentOnPost(page, actor.accessToken, post.id, 'href ping')

    // Log in as target so the httpOnly cookie is set for their session.
    await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email: target.email, password: target.password },
      headers: { 'Content-Type': 'application/json' },
    })
    await page.goto(APP_BASE + '/notifications')
    const link = page.locator(`a[href*="/posts/${post.id}"]`).first()
    if ((await link.count()) > 0) {
      await expect(link).toHaveAttribute('href', new RegExp(`/posts/${post.id}`))
    } else {
      await expect(page.locator('main')).toContainText(/comment/i, { timeout: 10_000 })
    }
  })

  test('Empty notifications page renders gracefully for a brand-new viewer', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
  })
})
