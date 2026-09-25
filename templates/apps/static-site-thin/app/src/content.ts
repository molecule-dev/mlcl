/**
 * The site's content and the URL space built on it.
 *
 * Posts are `content/posts/*.md`, markdown with YAML front matter, read by
 * `@molecule/api-content` (+ its markdown bond) and rendered to sanitized HTML
 * by `@molecule/app-markdown-marked`. `title`, `date` and `description` are
 * required; `tags` is a list; `draft: true` keeps a post out of the site
 * entirely. A malformed post fails the build with the file named — nothing is
 * skipped silently. Front-matter fields you add yourself are on
 * `post.frontMatter`.
 *
 * URL shape — every page is a directory with a trailing slash, so a static host
 * serves `dist/<path>/index.html` at exactly that path:
 *   `/`             the newest posts (page 1)       `/page/2/`      older posts
 *   `/<slug>/`      one post                        `/tags/`        every tag
 *   `/tags/<tag>/`  the posts with one tag          `/about/`       the About page
 * Files: `/feed.xml`, `/atom.xml`, `/sitemap.xml`, `/llms.txt`, `/posts.json`,
 * `/<slug>.md` (a post's raw markdown) and, for a post with transcripts,
 * `/<slug>/provenance.json` (see src/provenance.ts).
 *
 * The posts under `content/posts/` are the template's PLACEHOLDERS: each carries
 * `templateDemo: true`, and as soon as one post WITHOUT that marker exists the
 * marked ones stop being published (the files stay on disk). A post you write
 * is never marked, so it can never be the one dropped.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readContentDirectory, setProvider as setContentProvider } from '@molecule/api-content'
import { provider as markdownFiles } from '@molecule/api-content-markdown'
import { provider as markdown } from '@molecule/app-markdown-marked'

import { PAGE_SIZE } from './config.js'

setContentProvider(markdownFiles)

/** Where the posts live, relative to the app root. */
export const POSTS_DIR = 'content/posts'
/** Where each post's transcript exports live: `content/transcripts/<slug>/`. */
export const TRANSCRIPTS_DIR = 'content/transcripts'
/** Front-matter flag marking a template placeholder post. */
export const DEMO_FIELD = 'templateDemo'

export const TAGS_PATH = '/tags/'
export const ABOUT_PATH = '/about/'
export const FEED_RSS_PATH = '/feed.xml'
export const FEED_ATOM_PATH = '/atom.xml'
export const SITEMAP_PATH = '/sitemap.xml'
export const LLMS_PATH = '/llms.txt'
export const POSTS_JSON_PATH = '/posts.json'

const TAG_RE = /^[a-z0-9][a-z0-9-]*$/
const WORDS_PER_MINUTE = 200

/** A heading in a post, for a table of contents. */
export interface PostHeading {
  id: string
  text: string
  level: number
}

/** One published post. */
export interface Post {
  /** URL slug: the file name, or the front matter's `slug`. */
  slug: string
  title: string
  /** ISO-8601 publication date. */
  date: string
  description: string
  /** Lowercase tag slugs, in the post's order. */
  tags: string[]
  /** The body rendered to sanitized HTML. */
  html: string
  /** The body's headings, in order. */
  headings: PostHeading[]
  /** The source file, front matter included — served at `/<slug>.md`. */
  markdown: string
  /** The markdown body, front matter removed. */
  body: string
  /** The source file's path. */
  file: string
  /** Estimated reading time in minutes, never below 1. */
  readingMinutes: number
  /** Every front-matter field, including ones you add. */
  frontMatter: Record<string, unknown>
}

function readTags(raw: unknown, path: string): string[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== 'string')) {
    throw new Error(`${path}: tags must be a list of strings`)
  }
  const tags = (raw as string[]).map((t) => t.trim().toLowerCase())
  for (const tag of tags) {
    if (!TAG_RE.test(tag)) {
      throw new Error(`${path}: tag "${tag}" must be lowercase letters, digits and hyphens`)
    }
  }
  return [...new Set(tags)]
}

/**
 * Read and render every published post under `<root>/content/posts`.
 *
 * @param root - The app root (the directory holding `content/`).
 * @returns Newest first; drafts and superseded samples excluded.
 */
export async function loadPosts(root: string): Promise<Post[]> {
  const all = await readContentDirectory(join(root, POSTS_DIR), {
    requiredFields: ['title', 'date', 'description'],
  })
  const real = all.filter((record) => record.frontMatter[DEMO_FIELD] !== true)
  const records = real.length > 0 ? real : all
  if (records.length !== all.length) {
    const left = all.filter((record) => !records.includes(record))
    console.info(
      `[content] ${left.length} template sample post(s) left out — the site has real posts now. ` +
        `Delete them when you like: ${left.map((record) => record.path).join(', ')}`,
    )
  }
  return records.map((record) => {
    const { html, toc } = markdown.render(record.body)
    const words = record.body.split(/\s+/).filter(Boolean).length
    return {
      slug: record.slug,
      title: String(record.title),
      date: String(record.date),
      description: String(record.frontMatter.description),
      tags: readTags(record.frontMatter.tags, record.path),
      html,
      headings: toc ?? [],
      markdown: readFileSync(record.path, 'utf8'),
      body: record.body,
      file: record.path,
      readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
      frontMatter: record.frontMatter,
    }
  })
}

/**
 * The path of one post.
 *
 * @param slug - The post's slug.
 * @returns `/<slug>/`.
 */
export function postPath(slug: string): string {
  return `/${slug}/`
}

/**
 * The path of a post's raw markdown.
 *
 * @param slug - The post's slug.
 * @returns `/<slug>.md`.
 */
export function postMarkdownPath(slug: string): string {
  return `/${slug}.md`
}

/**
 * The path of an index page; page 1 is the front page.
 *
 * @param page - 1-based page number.
 * @returns `/` or `/page/<n>/`.
 */
export function pagePath(page: number): string {
  return page <= 1 ? '/' : `/page/${page}/`
}

/**
 * The path of one tag's page.
 *
 * @param tag - The tag slug.
 * @returns `/tags/<tag>/`.
 */
export function tagPath(tag: string): string {
  return `/tags/${tag}/`
}

/**
 * How many index pages a list of posts needs.
 *
 * @param posts - The posts.
 * @returns At least 1.
 */
export function pageCount(posts: Post[]): number {
  return Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
}

/**
 * The posts on one index page.
 *
 * @param posts - Every post, newest first.
 * @param page - 1-based page number.
 * @returns That page's posts; empty past the end.
 */
export function postsOnPage(posts: Post[], page: number): Post[] {
  return posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

/**
 * Every tag with its post count, most used first, then alphabetical.
 *
 * @param posts - The posts to count.
 * @returns The tags and their counts.
 */
export function tagCounts(posts: Post[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const post of posts) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : 1))
}
