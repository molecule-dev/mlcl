/**
 * `/tags/` and `/tags/<tag>/` — every tag with its count, and the posts
 * carrying one tag. An unknown tag is a 404. The tags come from the content
 * directory.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, open, openNotFound, SITE_NAME, TAGGED_POST, TAGS } from './_helpers.js'

test.describe('tags', () => {
  test('the tags page lists every tag with a count and links to its page', async ({ page }) => {
    await open(page, '/tags/')
    await expect(page).toHaveTitle(`Tags | ${SITE_NAME}`)
    await expect(page.locator('[data-mol-id="tag-list"] > li')).toHaveCount(TAGS.length)
    test.skip(!TAGGED_POST.tag, 'no published post carries a tag')
    const item = page.locator('[data-mol-id="tag-list"] > li', {
      has: page.locator(`[data-mol-id="tag-${TAGGED_POST.tag}"]`),
    })
    await expect(item).toContainText(/\d+ posts?/)
    await page.locator(`[data-mol-id="tag-${TAGGED_POST.tag}"]`).click()
    await page.waitForURL(new RegExp(`/tags/${TAGGED_POST.tag}/$`))
  })

  test('a tag page lists exactly the posts carrying the tag', async ({ page }) => {
    test.skip(!TAGGED_POST.tag, 'no published post carries a tag')
    await open(page, `/tags/${TAGGED_POST.tag}/`)
    await expect(page.locator('[data-mol-id="tag-title"]')).toHaveText(
      `Posts tagged #${TAGGED_POST.tag}`,
    )
    const cards = page.locator('[data-mol-id="post-list"] > article')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('[data-mol-id="post-tags"]')).toContainText(TAGGED_POST.tag)
    }
    await expect(page.locator(`[data-mol-id="post-card-${TAGGED_POST.slug}"]`)).toBeVisible()
  })

  test('the header Tags link reaches the tags page', async ({ page }) => {
    await open(page, '/')
    await page.locator('[data-mol-id="nav-tags"]').click()
    await page.waitForURL(/\/tags\/$/)
    await expect(page.locator('[data-mol-id="tags-page"]')).toBeVisible()
  })

  test('an unknown tag is not found', async ({ page }) => {
    const response = await page.request.get(`${APP_BASE}/tags/no-such-tag/`)
    expect(response.status()).toBe(404)
    await openNotFound(page, '/tags/no-such-tag/')
  })
})
