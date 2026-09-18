import { describe, expect, it } from 'vitest'

import {
  ABOUT_PATH,
  findPost,
  PAGE_SIZE,
  pageCount,
  pagePath,
  postMarkdownPath,
  postPath,
  posts,
  postsOnPage,
  postsWithTag,
  sitePaths,
  tagCounts,
  tagPath,
  TAGS_PATH,
} from '../content.js'

// `posts` comes from content/posts/*.md through the content plugin (vitest
// loads vite.config.ts), so these tests run against the real sample content.
describe('site content', () => {
  it('reads every published post, newest first, and never a draft', () => {
    expect(posts.length).toBeGreaterThan(PAGE_SIZE)
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1]!.date >= posts[i]!.date).toBe(true)
    }
    expect(posts.some((post) => post.slug === 'unfinished-thoughts-on-editors')).toBe(false)
    for (const post of posts) {
      expect(post.title).not.toBe('')
      expect(post.description).not.toBe('')
      expect(post.html).toContain('<')
      expect(post.markdown.startsWith('---')).toBe(true)
      expect(post.readingMinutes).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders markdown to HTML with heading ids', () => {
    const post = findPost('hello-field-notes')
    expect(post).toBeDefined()
    expect(post!.html).toContain('<h2 id="how-it-is-built">How it is built</h2>')
    expect(post!.headings.map((h) => h.id)).toEqual(['how-it-is-built', 'what-to-expect'])
  })

  it('paginates PAGE_SIZE posts per page', () => {
    const pages = pageCount(posts)
    expect(pages).toBe(Math.ceil(posts.length / PAGE_SIZE))
    expect(postsOnPage(posts, 1)).toHaveLength(PAGE_SIZE)
    expect(postsOnPage(posts, pages)).toHaveLength(posts.length - PAGE_SIZE * (pages - 1))
    expect(postsOnPage(posts, pages + 1)).toHaveLength(0)
    expect(pagePath(1)).toBe('/')
    expect(pagePath(2)).toBe('/page/2/')
  })

  it('collects tags with counts and finds posts by tag', () => {
    const tags = tagCounts()
    expect(tags.length).toBeGreaterThan(0)
    for (const { tag, count } of tags) {
      expect(postsWithTag(tag)).toHaveLength(count)
    }
    expect(postsWithTag('no-such-tag')).toHaveLength(0)
    expect(tagPath('web')).toBe('/tags/web/')
  })

  it('lists every page the build writes, each once, with trailing slashes', () => {
    const paths = sitePaths()
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths[0]).toBe('/')
    expect(paths).toContain(ABOUT_PATH)
    expect(paths).toContain(TAGS_PATH)
    for (const post of posts) expect(paths).toContain(postPath(post.slug))
    for (const path of paths) expect(path.endsWith('/')).toBe(true)
    expect(postMarkdownPath('x')).toBe('/x.md')
  })
})
