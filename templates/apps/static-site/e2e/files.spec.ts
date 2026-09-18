/**
 * The machine-readable copies of the site: RSS + Atom feeds, sitemap,
 * llms.txt, posts.json and the raw markdown per post. All are served by the
 * dev server and written into dist/ by the build, at the same paths. The
 * draft (when the content has one) is in none of them.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  DRAFT,
  fetchFile,
  FIRST_POST,
  open,
  PAGE_COUNT,
  POSTS,
  SITE_NAME,
  TAGGED_POST,
} from './_helpers.js'

/** A phrase every copy of the first post carries: its first heading, else its title. */
const FIRST_POST_PHRASE = FIRST_POST.headings[0] ?? FIRST_POST.title

const notTheDraft = (body: string): void => {
  if (DRAFT) expect(body).not.toContain(DRAFT.slug)
}

test.describe('site files', () => {
  test('feed.xml is an RSS 2.0 feed holding every published post, with full content', async ({
    page,
  }) => {
    const { status, body, contentType } = await fetchFile(page, '/feed.xml')
    expect(status).toBe(200)
    expect(contentType).toContain('xml')
    expect(body).toContain('<rss version="2.0"')
    expect(body).toContain(`<title>${SITE_NAME}</title>`)
    expect(body).toContain(`/${FIRST_POST.slug}/</link>`)
    expect(body).toContain(FIRST_POST_PHRASE)
    notTheDraft(body)
  })

  test('atom.xml is an Atom 1.0 feed', async ({ page }) => {
    const { status, body } = await fetchFile(page, '/atom.xml')
    expect(status).toBe(200)
    expect(body).toContain('<feed xmlns="http://www.w3.org/2005/Atom"')
    expect(body).toContain(`/${FIRST_POST.slug}/`)
    notTheDraft(body)
  })

  test('sitemap.xml lists the index, every post, the tag pages and about', async ({ page }) => {
    const { status, body } = await fetchFile(page, '/sitemap.xml')
    expect(status).toBe(200)
    expect(body).toContain('<urlset')
    expect(body).toContain(`/${FIRST_POST.slug}/</loc>`)
    expect(body).toContain('/tags/</loc>')
    if (TAGGED_POST.tag) expect(body).toContain(`/tags/${TAGGED_POST.tag}/</loc>`)
    expect(body).toContain('/about/</loc>')
    if (PAGE_COUNT > 1) expect(body).toContain('/page/2/</loc>')
    notTheDraft(body)
  })

  test('llms.txt links the markdown copy of every post', async ({ page }) => {
    const { status, body, contentType } = await fetchFile(page, '/llms.txt')
    expect(status).toBe(200)
    expect(contentType).toContain('text/plain')
    expect(body.startsWith(`# ${SITE_NAME}`)).toBe(true)
    for (const post of POSTS) expect(body).toContain(`/${post.slug}.md)`)
    notTheDraft(body)
  })

  test('posts.json is the index of every published post', async ({ page }) => {
    const { status, body } = await fetchFile(page, '/posts.json')
    expect(status).toBe(200)
    const index = JSON.parse(body) as {
      site: { name: string }
      posts: Array<{ slug: string; url: string; markdownUrl: string; tags: string[] }>
    }
    expect(index.site.name).toBe(SITE_NAME)
    expect(index.posts.map((p) => p.slug)).toEqual(POSTS.map((p) => p.slug))
  })

  test('every post is served as raw markdown, and the draft is not', async ({ page }) => {
    const post = await fetchFile(page, `/${FIRST_POST.slug}.md`)
    expect(post.status).toBe(200)
    expect(post.contentType).toContain('markdown')
    expect(post.body.startsWith('---')).toBe(true)
    expect(post.body).toContain(FIRST_POST_PHRASE)
    test.skip(!DRAFT, 'the content has no draft post')
    // The dev server answers an unknown path with the SPA shell (a static
    // host would 404), so assert on what comes back, not the status.
    const draft = await fetchFile(page, `/${DRAFT!.slug}.md`)
    expect(draft.contentType).not.toContain('markdown')
    if (DRAFT!.excerpt) expect(draft.body).not.toContain(DRAFT!.excerpt)
  })

  test('the footer links every file and the page head announces the feeds', async ({ page }) => {
    await open(page, '/')
    for (const id of ['rss', 'atom', 'json', 'llms', 'sitemap']) {
      await expect(page.locator(`[data-mol-id="footer-${id}"]`)).toBeVisible()
    }
    const href = await page.locator('[data-mol-id="nav-feed"]').getAttribute('href')
    expect(href).toMatch(/\/feed\.xml$/)
  })
})
