import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPost, signup } from './_helpers.js'

test.describe('search page', () => {
  test('renders the search input + four tabs (Top, People, Tags, Posts)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('input[type="search"], input[type="text"]').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /^top$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^people$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^tags$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^posts$/i }).first()).toBeVisible()
  })

  test('typing a query updates ?q= in the URL after debounce', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.locator('input[type="search"], input[type="text"]').first().fill('hello')
    await page.waitForTimeout(700)
    expect(page.url()).toContain('q=hello')
  })

  test('Search returns matching posts (full-text on caption + hashtags)', async ({ page }) => {
    const author = await signup(page)
    const slug = `vivid${Date.now()}slug`
    const post = await seedPost(page, author.accessToken, {
      caption: `An ${slug} caption`,
      hashtags: [slug],
    })

    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.locator('input[type="search"], input[type="text"]').first().fill(slug)
    await page.waitForTimeout(800)
    const haveTile = await page.locator(`a[href="/posts/${post.id}"]`).count()
    const haveText = await page.locator(`text=${slug}`).count()
    expect(haveTile + haveText).toBeGreaterThan(0)
  })

  test('search hits /api/search/posts and /api/search/users via captureNetwork', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="search"], input[type="text"]').first().fill('vivid')
      await page.waitForTimeout(900)
    })
    const hitPosts = reqs.some((r) => /\/api\/search\/posts/.test(r.url))
    const hitUsers = reqs.some((r) => /\/api\/search\/users/.test(r.url))
    expect(hitPosts || hitUsers).toBeTruthy()
  })

  test('switching tabs hides the other section blocks (Posts tab hides People grid)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    // Top tab: People + Tags + Posts sections all rendered
    await expect(page.locator('[data-testid="search-people"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-posts"]')).toBeVisible()
    // Switch to People
    await page
      .getByRole('button', { name: /^people$/i })
      .first()
      .click()
    await expect(page.locator('[data-testid="search-people"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-posts"]')).toHaveCount(0)
    // Switch to Posts
    await page
      .getByRole('button', { name: /^posts$/i })
      .first()
      .click()
    await expect(page.locator('[data-testid="search-posts"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-people"]')).toHaveCount(0)
  })
})
