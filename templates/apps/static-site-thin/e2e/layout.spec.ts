/**
 * The reading layout across pages: the front page's post list is no wider
 * than a post's prose, and the front page, tag pages and about page start
 * their content at the same left edge (see the `.site` rule in
 * app/public/styles.css).
 */
import { expect, type Page, test } from '@molecule/app-e2e-fixtures-default'

import { FIRST_POST, open } from './_helpers.js'

const box = async (page: Page, path: string, selector: string) => {
  await open(page, path)
  const b = await page.locator(selector).first().boundingBox()
  expect(b, `${selector} renders on ${path}`).not.toBeNull()
  return b!
}

test.describe('reading layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the front page list is no wider than a post body', async ({ page }) => {
    const card = await box(page, '/', '[data-mol-id^="post-card-"]')
    const post = await box(page, `/${FIRST_POST.slug}/`, '[data-mol-id="post"]')
    expect(card.width).toBeLessThanOrEqual(post.width + 1)
  })

  test('the front page, the tags page and the about page share one left edge', async ({ page }) => {
    const home = await box(page, '/', '[data-mol-id="post-list"]')
    const about = await box(page, '/about/', '[data-mol-id="about-page"]')
    const tags = await box(page, '/tags/', 'main')
    expect(Math.abs(about.x - home.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(tags.x - home.x)).toBeLessThanOrEqual(1)
  })
})
