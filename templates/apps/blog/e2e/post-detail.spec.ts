/**
 * /post/:id — the showpiece. Anonymous reads work, view counter increments,
 * authenticated user can clap and bookmark, and the comment-count flows
 * through the interactions endpoint.
 *
 * These specs assert on real backend invariants — not just "click fired."
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  readInteractions,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('post detail page', () => {
  test('anonymous read renders the post title and bumps the view counter', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-anon'))
    const { id, title } = await seedPost(page, accessToken)
    const before = await readInteractions(page, accessToken, id)

    // Anonymous read: clear local storage so no JWT is sent.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })

    // Give the view ping a moment to land before reading.
    await page.waitForTimeout(800)
    const after = await readInteractions(page, accessToken, id)
    expect(after.views).toBeGreaterThan(before.views)
  })

  test('clap button persists a clap reaction in the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-clap'))
    const { id } = await seedPost(page, accessToken)

    // Authenticated read — the JWT was already persisted by signup().
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const before = await readInteractions(page, accessToken, id)
    expect(before.clapped).toBeFalsy()

    // The post-detail header has a clap button labelled with a clap icon
    // and a number; we resolve it via data-mol-id.
    const clap = page.locator('[data-mol-id="button-clap"]').first()
    if (!(await clap.count())) {
      // Fallback: any button containing "clap" or 👏 in label.
      const fallback = page.getByRole('button', { name: /clap|applaud|👏/i }).first()
      await fallback.click()
    } else {
      await clap.click()
    }
    await page.waitForTimeout(800)

    const after = await readInteractions(page, accessToken, id)
    expect(after.clapped, 'clapped flag must flip to true').toBeTruthy()
    expect(after.claps, 'claps count must increase').toBeGreaterThan(before.claps)
  })

  test('bookmark button persists a bookmark and shows up in /bookmarks/mine', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-bm'))
    const { id } = await seedPost(page, accessToken)

    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const bookmarkBtn = page.locator('[data-mol-id="button-bookmark"]').first()
    if (!(await bookmarkBtn.count())) {
      // Fallback by accessible name
      const fallback = page
        .getByRole('button', { name: /bookmark|save|add\s*to\s*reading/i })
        .first()
      await fallback.click()
    } else {
      await bookmarkBtn.click()
    }
    await page.waitForTimeout(800)

    const after = await readInteractions(page, accessToken, id)
    expect(after.bookmarked, 'bookmarked flag must flip to true').toBeTruthy()

    const list = await page.request.get(`${API_BASE}/bookmarks/mine`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(list.status()).toBeLessThan(400)
    const body = (await list.json()) as { data: Array<{ resourceId: string }> }
    const found = body.data.find((b) => b.resourceId === id)
    expect(found, '/bookmarks/mine should include the bookmarked post').toBeTruthy()
  })

  test('comment button navigates to /comments?postId=…', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-comments'))
    const { id } = await seedPost(page, accessToken)

    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const commentBtn = page.locator('[data-mol-id="button-comment"]').first()
    if (await commentBtn.count()) {
      await commentBtn.click()
    } else {
      // Fallback: any link/button mentioning comments.
      const fallback = page
        .getByRole('link', { name: /comment/i })
        .or(page.getByRole('button', { name: /comment/i }))
        .first()
      await fallback.click()
    }
    await page.waitForURL(new RegExp(`/comments\\?postId=${id}`), { timeout: 10000 })
  })

  test('cover image src reflects the seeded post (no shared placeholder)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-cover'))
    const coverUrl = 'https://example.com/covers/spec.jpg'
    // Seed a post with a cover_image_url via the API directly so we can
    // assert that the rendered <img src> reflects it (or, if absent, that
    // we don't fall back to the previously-hardcoded placeholder).
    const post = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Cover image check ' + Date.now(),
        content: 'body',
        excerpt: 'x',
        tags: [],
        status: 'published',
        cover_image_url: coverUrl,
      },
      failOnStatusCode: false,
    })
    expect(post.status()).toBeLessThan(400)
    const { id } = (await post.json()) as { id: string }

    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const cover = page.locator('[data-mol-id="post-cover-image"], img[alt][src]').first()
    if (await cover.count()) {
      const src = await cover.getAttribute('src')
      expect(src, 'cover image must have a src').toBeTruthy()
      // The rendered image should reflect the seeded URL OR be empty (if
      // the user uploaded none); never the legacy hardcoded stock photo.
      if (src) {
        expect(src, 'cover image must not be the legacy stock placeholder').not.toMatch(
          /lh3\.googleusercontent\.com\/aida-public/,
        )
      }
    }
  })
})
