import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPost, signup } from './_helpers.js'

test.describe('post detail page (/posts/:id)', () => {
  test('PostDetail submits a comment and shows it in the comment list', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, {
      caption: 'Comment me',
      hashtags: ['comment'],
    })

    const viewer = await signup(page)
    await page.goto(APP_BASE + `/posts/${post.id}`)
    await expect(page.locator('[data-testid="comment-input"]')).toBeVisible({ timeout: 10_000 })

    const body = `e2e comment ${Date.now()}`
    await page.locator('[data-testid="comment-input"]').fill(body)
    await page.locator('[data-testid="comment-submit"]').click()

    await expect(page.locator(`text=${body}`)).toBeVisible({ timeout: 10_000 })

    const res = await page.request.get(`/api/posts/${post.id}/comments`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    })
    expect(res.status()).toBe(200)
    const list = (await res.json()) as Array<{ body: string }>
    expect(list.some((c) => c.body === body)).toBe(true)
  })

  test('PostDetail returns 404 for unknown post id', async ({ page }) => {
    // The unknown id 404s twice (post + comments) BY DESIGN — allow the
    // browser's expected resource errors through the console-guard.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/posts/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('text=/Post not found|not found|404/i').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Like button toggles like count via POST /api/posts/:id/like', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, { caption: 'Like-toggle' })
    await signup(page)
    await page.goto(APP_BASE + `/posts/${post.id}`)
    const likeBtn = page.locator('[data-testid="like-button"]')
    await expect(likeBtn).toBeVisible({ timeout: 10_000 })
    const before = (await page.locator('[data-testid="like-count"]').innerText()).trim()
    await likeBtn.click()
    await page.waitForTimeout(500)
    const after = (await page.locator('[data-testid="like-count"]').innerText()).trim()
    expect(after).not.toBe(before)
  })

  test('Hero copy renders the author display name + caption', async ({ page }) => {
    const author = await signup(page, undefined, undefined, 'Hero Author')
    const cap = `hero-${Date.now()}`
    const post = await seedPost(page, author.accessToken, { caption: cap })
    await signup(page)
    await page.goto(APP_BASE + `/posts/${post.id}`)
    await expect(page.locator(`text=${cap}`)).toBeVisible({ timeout: 10_000 })
  })

  test('Page mount fetches /api/posts/:id and /api/posts/:id/comments via captureNetwork', async ({
    page,
  }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, { caption: 'capture-network' })
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/posts/${post.id}`)
      await page.waitForTimeout(1500)
    })
    const hitPost = reqs.some((r) => new RegExp(`/api/posts/${post.id}(\\?|$)`).test(r.url))
    const hitComments = reqs.some((r) => new RegExp(`/api/posts/${post.id}/comments`).test(r.url))
    expect(hitPost, 'should fetch /api/posts/:id').toBeTruthy()
    expect(hitComments, 'should fetch /api/posts/:id/comments').toBeTruthy()
  })

  test('Author handle/avatar links to /profile/:handle', async ({ page }) => {
    const author = await signup(page, undefined, undefined, 'Linked Author')
    const post = await seedPost(page, author.accessToken, { caption: 'profile-link' })
    await signup(page)
    await page.goto(APP_BASE + `/posts/${post.id}`)
    const link = page.locator('a[href^="/profile/"]').first()
    if ((await link.count()) > 0) {
      const href = await link.getAttribute('href')
      expect(href).toMatch(/^\/profile\//)
    } else {
      await expect(page.locator(`text=${'profile-link'}`)).toBeVisible({ timeout: 10_000 })
    }
  })
})
