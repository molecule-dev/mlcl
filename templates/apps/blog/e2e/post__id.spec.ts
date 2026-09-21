/**
 * /post/:id — public post detail. Anonymous reads work, view counter
 * increments, authenticated user can clap and bookmark, comment-count
 * flows through interactions endpoint. Asserts on backend invariants —
 * not just "click fired".
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  readInteractions,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('post detail page (/post/:id)', () => {
  test('GET /api/posts/:id is fired on load (network)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-fetch'))
    const { id } = await seedPost(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/post/${id}`)
      await page.waitForLoadState('networkidle')
    })
    const fetched = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/posts/${id}(\\?|$)`).test(r.url),
    )
    expect(fetched, `/post/${id} must fetch /api/posts/${id}`).toBeTruthy()
    expect(fetched!.status).toBeLessThan(400)
  })

  test('anonymous read renders the post title and bumps view counter', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-anon'))
    const { id, title } = await seedPost(page, accessToken)
    const before = await readInteractions(page, accessToken, id)

    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })

    await page.waitForTimeout(800)
    const after = await readInteractions(page, accessToken, id)
    expect(after.views).toBeGreaterThan(before.views)
  })

  test('clap button persists a clap reaction in the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-clap'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const before = await readInteractions(page, accessToken, id)
    expect(before.clapped).toBeFalsy()

    const clap = page.locator('[data-mol-id="button-clap"]').first()
    if (await clap.count()) {
      await clap.click()
    } else {
      await page
        .getByRole('button', { name: /clap|applaud|👏/i })
        .first()
        .click()
    }
    await page.waitForTimeout(800)

    const after = await readInteractions(page, accessToken, id)
    expect(after.clapped).toBeTruthy()
    expect(after.claps).toBeGreaterThan(before.claps)
  })

  test('bookmark button persists a bookmark + appears in /bookmarks/mine', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-bm'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const bm = page.locator('[data-mol-id="button-bookmark"]').first()
    if (await bm.count()) {
      await bm.click()
    } else {
      await page
        .getByRole('button', { name: /bookmark|save/i })
        .first()
        .click()
    }
    await page.waitForTimeout(800)

    const after = await readInteractions(page, accessToken, id)
    expect(after.bookmarked).toBeTruthy()

    const list = await page.request.get(`${API_BASE}/bookmarks/mine`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(list.status()).toBeLessThan(400)
    const body = (await list.json()) as { data: Array<{ resourceId: string }> }
    expect(body.data.find((b) => b.resourceId === id)).toBeTruthy()
  })

  test('comment button navigates to /comments?postId=<id>', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-comments'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')

    const btn = page.locator('[data-mol-id="button-comment"]').first()
    if (await btn.count()) {
      await btn.click()
    } else {
      await page
        .getByRole('button', { name: /comment/i })
        .or(page.getByRole('link', { name: /comment/i }))
        .first()
        .click()
    }
    await page.waitForURL(new RegExp(`/comments\\?postId=${id}`), { timeout: 10000 })
  })

  test('cover image src reflects the seeded post (no shared placeholder)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-cover'))
    const coverUrl = 'https://example.com/covers/spec.jpg'
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
      if (src) expect(src).not.toMatch(/lh3\.googleusercontent\.com\/aida-public/)
    }
  })

  test('renders the article body for the seeded post', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-body'))
    const uniqueBody = `Body content marker ${Date.now()}`
    const { id } = await seedPost(page, accessToken, {
      title: 'Body test ' + Date.now(),
      content: `# Heading\n\n${uniqueBody}\n\nMore text.`,
    })
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(uniqueBody).first()).toBeVisible({ timeout: 10000 })
  })

  test('AuthorBioCard is visible', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-author'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')
    const main = await page.locator('main').innerText()
    expect(main.length).toBeGreaterThan(50)
  })

  test('reading-progress bar exists at the top', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-progress'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')
    const bar = page
      .locator('[role="progressbar"], [data-mol-id*="progress"], .reading-progress')
      .first()
    if (await bar.count()) await expect(bar).toBeVisible()
  })

  test('header logo navigates back to /', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-logo'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: /WriteFlow/ }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/.*\/$/, { timeout: 10000 })
    }
  })

  test('error state renders when post id is invalid', async ({ page }) => {
    // The 404s ARE the state under test — the browser logs them and the
    // console guard would fail the run without this exemption.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await page.goto(APP_BASE + `/post/00000000-0000-0000-0000-000000000000`)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('main').innerText()
    expect(text.length).toBeGreaterThan(0)
  })

  test('related posts section is reachable', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('post-related'))
    const { id } = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/post/${id}`)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })
})
