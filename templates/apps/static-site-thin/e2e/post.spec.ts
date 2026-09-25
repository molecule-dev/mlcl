/**
 * `/<slug>/` — one post: title, date, reading time, tags, the rendered
 * markdown body, and the link to the raw markdown. Drafts are not pages.
 * What the body must show is read from the post's own markdown.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  DRAFT,
  FIRST_POST,
  formatDate,
  open,
  openNotFound,
  SITE_NAME,
  TAGGED_POST,
} from './_helpers.js'

test.describe('post page', () => {
  test('renders the post with its title, date, tags and body', async ({ page }) => {
    await open(page, `/${FIRST_POST.slug}/`)
    await expect(page).toHaveTitle(`${FIRST_POST.title} | ${SITE_NAME}`)
    await expect(page.locator('[data-mol-id="post-title"]')).toHaveText(FIRST_POST.title)
    await expect(page.locator('[data-mol-id="post-date"]')).toHaveText(formatDate(FIRST_POST.date))
    await expect(page.locator('[data-mol-id="post-reading-time"]')).toHaveText(/min read/)
    if (FIRST_POST.tag)
      await expect(page.locator('[data-mol-id="post-tags"]')).toContainText(FIRST_POST.tag)
    const body = page.locator('[data-mol-id="post-body"]')
    for (const heading of FIRST_POST.headings)
      await expect(body.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
    if (FIRST_POST.hasCode) await expect(body.locator('code').first()).toBeVisible()
  })

  test('the markdown link serves the post source', async ({ page }) => {
    await open(page, `/${FIRST_POST.slug}/`)
    const href = await page.locator('[data-mol-id="post-markdown"]').getAttribute('href')
    expect(href).toMatch(new RegExp(`/${FIRST_POST.slug}\\.md$`))
    // The href is site-absolute (it carries the base path when there is one),
    // so resolve it against the page's URL — never prefix it again.
    const response = await page.request.get(new URL(href!, page.url()).toString())
    expect(response.status()).toBe(200)
    const text = await response.text()
    expect(text.startsWith('---')).toBe(true)
    expect(text).toContain(FIRST_POST.title.replace(/'/g, "''"))
  })

  test('a tag on the post opens its tag page', async ({ page }) => {
    test.skip(!TAGGED_POST.tag, 'no published post carries a tag')
    await open(page, `/${TAGGED_POST.slug}/`)
    await page
      .locator('[data-mol-id="post-tags"]')
      .getByRole('link', { name: `#${TAGGED_POST.tag}` })
      .click()
    await page.waitForURL(new RegExp(`/tags/${TAGGED_POST.tag}/$`))
    await expect(page.locator('[data-mol-id="tag-title"]')).toHaveText(
      `Posts tagged #${TAGGED_POST.tag}`,
    )
  })

  test('a draft is not a page', async ({ page }) => {
    test.skip(!DRAFT, 'the content has no draft post')
    const response = await page.request.get(`${APP_BASE}/${DRAFT!.slug}/`)
    expect(response.status()).toBe(404)
    await openNotFound(page, `/${DRAFT!.slug}/`)
    await expect(page.locator('[data-mol-id="post-title"]')).toHaveCount(0)
  })

  test('an unknown slug is not found, with a way home', async ({ page }) => {
    await openNotFound(page, '/no-such-post/')
    await page.locator('[data-mol-id="not-found-home"]').click()
    await page.waitForURL(/\/$/)
    await expect(page.locator('[data-mol-id="post-list"]')).toBeVisible()
  })
})
