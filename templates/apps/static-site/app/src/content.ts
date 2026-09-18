/**
 * The site's content and the URL space built on it. The posts come from
 * `content/posts/*.md` through the `virtual:site-content` module (see
 * ../vite-content-plugin.ts); everything here is pure: the same helpers drive
 * the pages in the browser and the route list the build prerenders.
 *
 * URL shape — every page is a directory with a trailing slash, so a static
 * host serves `dist/<path>/index.html` at exactly that path:
 *   `/`               the newest posts (page 1)
 *   `/page/2/`        older posts, PAGE_SIZE per page
 *   `/<slug>/`        one post
 *   `/tags/`          every tag with its post count
 *   `/tags/<tag>/`    the posts carrying one tag
 *   `/about/`         the About page
 * Files (no trailing slash): `/feed.xml`, `/atom.xml`, `/sitemap.xml`,
 * `/llms.txt`, `/posts.json` and `/<slug>.md` (the raw markdown of a post).
 *
 * The posts under `content/posts/` are the template's PLACEHOLDERS — see
 * content/README.md. Real content replaces them; it is never published beside
 * them (`templateDemo: true` in ../vite-content-plugin.ts).
 */

import content from 'virtual:site-content'

import type { Post, PostHeading, SiteContent } from '../vite-content-plugin.js'

export type { Post, PostHeading, SiteContent }

/** Posts per index page. */
export const PAGE_SIZE = 10

export const TAGS_PATH = '/tags/'
export const ABOUT_PATH = '/about/'
export const FEED_RSS_PATH = '/feed.xml'
export const FEED_ATOM_PATH = '/atom.xml'
export const SITEMAP_PATH = '/sitemap.xml'
export const LLMS_PATH = '/llms.txt'
export const POSTS_JSON_PATH = '/posts.json'

/** Every published post, newest first. */
export const posts: Post[] = content.posts

/** The path of one post. */
export function postPath(slug: string): string {
  return `/${slug}/`
}

/** The path of a post's raw markdown. */
export function postMarkdownPath(slug: string): string {
  return `/${slug}.md`
}

/** The path of an index page; page 1 is the front page. */
export function pagePath(page: number): string {
  return page <= 1 ? '/' : `/page/${page}/`
}

/** The path of one tag's page. */
export function tagPath(tag: string): string {
  return `/tags/${tag}/`
}

/** How many index pages a list of posts needs (at least 1). */
export function pageCount(list: Post[]): number {
  return Math.max(1, Math.ceil(list.length / PAGE_SIZE))
}

/** The posts on one index page (1-based); an empty list past the end. */
export function postsOnPage(list: Post[], page: number): Post[] {
  const start = (page - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
}

/** One post by slug, or `undefined`. */
export function findPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug)
}

/** The posts carrying a tag, newest first. */
export function postsWithTag(tag: string): Post[] {
  return posts.filter((post) => post.tags.includes(tag))
}

/** Every tag with its post count, most used first, then alphabetical. */
export function tagCounts(list: Post[] = posts): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const post of list) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : 1))
}

/** Every HTML page the site has — what the build prerenders. */
export function sitePaths(list: Post[] = posts): string[] {
  const paths = [pagePath(1)]
  for (let page = 2; page <= pageCount(list); page++) paths.push(pagePath(page))
  for (const post of list) paths.push(postPath(post.slug))
  paths.push(TAGS_PATH)
  for (const { tag } of tagCounts(list)) paths.push(tagPath(tag))
  paths.push(ABOUT_PATH)
  return paths
}
