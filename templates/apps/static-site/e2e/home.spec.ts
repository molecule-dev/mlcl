/**
 * `/` and `/page/N/` — the paginated index: PAGE_SIZE posts per page, newest
 * first, with newer/older links; a page past the end is a 404. Counts come from
 * the content directory, so the spec holds for your posts as well as the samples.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  FIRST_POST,
  formatDate,
  open,
  PAGE_COUNT,
  POSTS,
  postsOnPage,
  SITE_NAME,
  TAGGED_POST,
} from './_helpers.js'

test.describe('index', () => {
  test('the front page arrives prerendered — its markup is in the HTML before any script runs', async ({
    page,
  }) => {
    // The dev server renders every route through src/entry-server.tsx the way
    // the build does, so the document itself carries the page; the client then
    // hydrates it (a mismatch fails `open()` in every spec).
    const response = await page.request.get(APP_BASE + '/')
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('data-mol-id="site-layout"')
    expect(html).toContain('data-mol-id="post-list"')
  })

  test('front page lists the first page of posts, newest first, under the site name', async ({
    page,
  }) => {
    await open(page, '/')
    // The index carries the site name in the header link (the pages with a title
    // of their own render it as an h1); assert what the page actually has.
    await expect(
      page.locator('[data-mol-id="site-header"]').getByRole('link', { name: SITE_NAME }),
    ).toBeVisible()
    const cards = page.locator('[data-mol-id="post-list"] > li')
    await expect(cards).toHaveCount(postsOnPage(1).length)
    await expect(cards.first().getByRole('link', { name: FIRST_POST.title })).toBeVisible()
    await expect(page.locator('[data-mol-id="pagination-position"]')).toHaveText(
      `Page 1 of ${PAGE_COUNT}`,
    )
    await expect(page.locator('[data-mol-id="pagination-newer"]')).toHaveCount(0)
  })

  test('older posts link goes to page 2, which holds the next page and links back', async ({
    page,
  }) => {
    test.skip(PAGE_COUNT < 2, `only ${POSTS.length} published post(s): a single index page`)
    await open(page, '/')
    await page.locator('[data-mol-id="pagination-older"]').click()
    await page.waitForURL(/\/page\/2\/?$/)
    const cards = page.locator('[data-mol-id="post-list"] > li')
    await expect(cards).toHaveCount(postsOnPage(2).length)
    await expect(page.locator('[data-mol-id="pagination-position"]')).toHaveText(
      `Page 2 of ${PAGE_COUNT}`,
    )
    await expect(page.locator('[data-mol-id="pagination-older"]')).toHaveCount(
      PAGE_COUNT > 2 ? 1 : 0,
    )
    await page.locator('[data-mol-id="pagination-newer"]').click()
    await page.waitForURL(/\/$/)
    await expect(page.locator('[data-mol-id="post-list"] > li')).toHaveCount(postsOnPage(1).length)
  })

  test('a page past the end is not found', async ({ page }) => {
    await open(page, `/page/${PAGE_COUNT + 97}/`)
    await expect(page.locator('[data-mol-id="not-found-page"]')).toBeVisible()
  })

  test('every post card links to its post and shows date, reading time and tags', async ({
    page,
  }) => {
    await open(page, '/')
    const first = page.locator(`[data-mol-id="post-card-${FIRST_POST.slug}"]`)
    await expect(first.locator('[data-mol-id="post-date"]')).toHaveText(formatDate(FIRST_POST.date))
    await expect(first).toContainText(/\d+ min read/)
    if (TAGGED_POST.slug === FIRST_POST.slug)
      await expect(first.locator('[data-mol-id="post-tags"] a').first()).toBeVisible()
    await first.getByRole('link', { name: FIRST_POST.title }).click()
    await page.waitForURL(new RegExp(`/${FIRST_POST.slug}/?$`))
    await expect(page.locator('[data-mol-id="post-title"]')).toHaveText(FIRST_POST.title)
  })
})
