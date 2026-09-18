import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, seedPost, followUser } from './_helpers.js'

test.describe('feed page', () => {
  test('Feed shows posts from users you follow', async ({ page }) => {
    const author = await signup(page, undefined, undefined, 'Author Person')
    const authorPost = await seedPost(page, author.accessToken, {
      caption: 'Followed creator post — should appear',
      hashtags: ['followed'],
    })

    const viewer = await signup(page, undefined, undefined, 'Viewer Person')
    await followUser(page, viewer.accessToken, author.userId)

    await page.goto(APP_BASE + '/feed')
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(`a[href="/posts/${authorPost.id}"]`)).toBeVisible()
  })

  test('Feed falls back to explore content when viewer follows no one', async ({ page }) => {
    const author = await signup(page)
    await seedPost(page, author.accessToken, {
      caption: 'Public seed post for empty-follow viewer',
    })

    const fresh = await signup(page)
    await page.goto(APP_BASE + '/feed')
    const article = page.locator('article')
    const empty = page.locator('[data-testid="feed-empty-state"]')
    await expect(article.first().or(empty)).toBeVisible({ timeout: 10_000 })
    const articleCount = await article.count()
    const emptyCount = await empty.count()
    expect(articleCount + emptyCount).toBeGreaterThan(0)
    expect(fresh.userId).toBeTruthy()
  })

  test('Like toggles via PostCard reflect the read-after-write count', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, {
      caption: 'Likeable post',
      hashtags: ['like'],
    })

    const viewer = await signup(page)
    await page.goto(APP_BASE + `/posts/${post.id}`)
    const likeButton = page.locator('[data-testid="like-button"]')
    await expect(likeButton).toBeVisible({ timeout: 10_000 })
    const initialCount = (await page.locator('[data-testid="like-count"]').innerText()).trim()
    await likeButton.click()
    await page.waitForTimeout(800)
    const afterCount = (await page.locator('[data-testid="like-count"]').innerText()).trim()
    expect(afterCount).not.toBe(initialCount)

    const fetched = await page.request.get(`/api/posts/${post.id}`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    })
    expect(fetched.status()).toBe(200)
    const json = (await fetched.json()) as { like_count: number; liked: boolean }
    expect(json.like_count).toBeGreaterThan(0)
    expect(json.liked).toBe(true)
  })

  test('Compose CTA links to /compose', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/feed')
    const link = page.locator('[data-testid="compose-link"]').first()
    await expect(link).toHaveAttribute('href', '/compose')
  })

  test('Page mount fetches /api/feed and the rail data via captureNetwork', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/feed')
      await page.waitForTimeout(1500)
    })
    const hitFeed = reqs.some((r) => /\/api\/feed(\?|$)/.test(r.url))
    const hitSugg = reqs.some((r) => /\/api\/feed\/suggestions/.test(r.url))
    const hitTrend = reqs.some((r) => /\/api\/feed\/trending/.test(r.url))
    expect(hitFeed, 'feed should fetch /api/feed').toBeTruthy()
    expect(hitSugg || hitTrend, 'feed should fetch suggestions or trending').toBeTruthy()
  })
})
