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
  openNotFound,
  PAGE_COUNT,
  POSTS,
  postsOnPage,
  SITE_NAME,
} from './_helpers.js'

const CARDS = '[data-mol-id="post-list"] > article'

test.describe('index', () => {
  test('the front page is plain HTML — the posts are in the document itself', async ({ page }) => {
    const response = await page.request.get(APP_BASE + '/')
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('data-mol-id="post-list"')
    expect(html).toContain(FIRST_POST.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;'))
  })

  test('front page lists the first page of posts, newest first, under the site name', async ({
    page,
  }) => {
    await open(page, '/')
    await expect(page).toHaveTitle(SITE_NAME)
    await expect(page.locator('[data-mol-id="site-name"]')).toHaveText(SITE_NAME)
    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(postsOnPage(1).length)
    await expect(cards.first().getByRole('link', { name: FIRST_POST.title })).toBeVisible()
    if (PAGE_COUNT > 1) {
      await expect(page.locator('[data-mol-id="pagination-position"]')).toHaveText(
        `Page 1 of ${PAGE_COUNT}`,
      )
    }
    await expect(page.locator('[data-mol-id="pagination-newer"]')).toHaveCount(0)
  })

  test('older posts link goes to page 2, which holds the next page and links back', async ({
    page,
  }) => {
    test.skip(PAGE_COUNT < 2, `only ${POSTS.length} published post(s): a single index page`)
    await open(page, '/')
    await page.locator('[data-mol-id="pagination-older"]').click()
    await page.waitForURL(/\/page\/2\/$/)
    await expect(page.locator(CARDS)).toHaveCount(postsOnPage(2).length)
    await expect(page.locator('[data-mol-id="pagination-position"]')).toHaveText(
      `Page 2 of ${PAGE_COUNT}`,
    )
    await page.locator('[data-mol-id="pagination-newer"]').click()
    await page.waitForURL(/\/$/)
    await expect(page.locator(CARDS)).toHaveCount(postsOnPage(1).length)
  })

  test('a page past the end is not found', async ({ page }) => {
    const response = await page.request.get(`${APP_BASE}/page/${PAGE_COUNT + 97}/`)
    expect(response.status()).toBe(404)
    await openNotFound(page, `/page/${PAGE_COUNT + 97}/`)
  })

  test('a post card shows the date and reading time and links to its post', async ({ page }) => {
    await open(page, '/')
    const first = page.locator(`[data-mol-id="post-card-${FIRST_POST.slug}"]`)
    await expect(first.locator('[data-mol-id="post-date"]')).toHaveText(formatDate(FIRST_POST.date))
    await expect(first.locator('[data-mol-id="post-reading-time"]')).toHaveText(/\d+ min read/)
    await first.getByRole('link', { name: FIRST_POST.title }).click()
    await page.waitForURL(new RegExp(`/${FIRST_POST.slug}/$`))
    await expect(page.locator('[data-mol-id="post-title"]')).toHaveText(FIRST_POST.title)
  })
})
