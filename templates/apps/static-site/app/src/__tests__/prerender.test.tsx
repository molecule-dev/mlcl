import { describe, expect, it } from 'vitest'

import { APP_DESCRIPTION, APP_NAME } from '../branding.js'
import { ABOUT_PATH, FEED_RSS_PATH, pagePath, postPath, posts } from '../content.js'
import { getStaticFiles, render } from '../entry-server.js'

describe('static rendering with lazy routes', () => {
  it('writes the first index page before its lazy route has been loaded', async () => {
    const page = await render('/')
    expect(page.html).toContain('data-mol-id="post-list"')
    expect(page.html).toContain(posts[0].title)
    expect(page.html).not.toContain('<!--$!-->')
    expect(page.title).toBe(APP_NAME)
    expect(page.description).toBe(APP_DESCRIPTION)
  })

  it('waits for a different cold route and reads its metadata after that route renders', async () => {
    const page = await render(ABOUT_PATH)
    expect(page.html).toContain('data-mol-id="about-page"')
    expect(page.title).toBe(`About ${APP_NAME} | ${APP_NAME}`)
    expect(page.description).toBe(APP_DESCRIPTION)
  })

  it('keeps titles and descriptions local to concurrent page renders', async () => {
    const paths = [ABOUT_PATH, pagePath(2), postPath(posts[0].slug)]
    const expected = [
      `About ${APP_NAME} | ${APP_NAME}`,
      `Page 2 | ${APP_NAME}`,
      `${posts[0].title} | ${APP_NAME}`,
    ]
    const pages = await Promise.all(paths.map((path) => render(path)))
    expect(pages.map((page) => page.title)).toEqual(expected)
    expect(pages.map((page) => page.description)).toEqual([
      APP_DESCRIPTION,
      APP_DESCRIPTION,
      posts[0].description,
    ])
    expect(pages.every((page) => !page.html.includes('<!--$!-->'))).toBe(true)
  })

  it('still renders unknown routes and publishes the normal non-HTML files', async () => {
    const page = await render('/a-page-that-does-not-exist/')
    expect(page.html).toContain('data-mol-id="not-found-page"')
    const files = await getStaticFiles()
    expect(files.find((file) => file.path === FEED_RSS_PATH)?.content).toContain('<rss')
  })
})
