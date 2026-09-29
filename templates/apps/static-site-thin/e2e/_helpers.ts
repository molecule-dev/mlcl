// Shared helpers for the site's e2e specs. The site has no API and no login:
// every spec opens pages from the dev server (`npm run dev`) or the built site
// (`npm run build && npm run preview`) at APP_BASE and asserts on the screen.
// Both serve the same files — the dev server runs the real build — so a spec
// that passes against one passes against the other.
//
// Run the whole suite with `npm run test:e2e`, or one file with
// `npm run test:e2e -- e2e/home.spec.ts`.
//
// Everything the specs expect about the CONTENT — the site name, the posts per
// page, the newest post, its date, headings and tags, the draft — is read from
// the app's own files at test time (`src/branding.ts`, `src/config.ts`,
// `content/posts/*.md`), the same sources the site is built from. Replace the
// sample posts with your own and the specs stay true; a spec that fails after
// a content change is reporting a real difference between the files and the
// screen.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@molecule/app-e2e-fixtures-default'

import './bonds.js'

/**
 * The site's base path, read the way the build reads it: BASE_PATH unset or
 * `/` is the origin root; `/blog` and `/blog/` both mean `/blog/`. A spec says
 * `/about/` and the page opens `/blog/about/`.
 */
export const BASE_PATH = (() => {
  const raw = (process.env.BASE_PATH ?? '').trim()
  if (raw === '' || raw === '/') return '/'
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
})()

const ORIGIN = process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')

/** The origin plus the base path, without a trailing slash: `http://localhost:3000/blog`. */
export const APP_BASE = ORIGIN.replace(/\/+$/, '') + BASE_PATH.replace(/\/$/, '')

const here = dirname(fileURLToPath(import.meta.url))
/** The app root: `e2e/` sits inside the app once scaffolded, beside it in the template. */
const APP_ROOT =
  [resolve(here, '..'), resolve(here, '..', 'app')].find((dir) =>
    existsSync(join(dir, 'content', 'posts')),
  ) ?? resolve(here, '..')

const read = (relative: string): string => readFileSync(join(APP_ROOT, relative), 'utf8')

/** The site name from src/branding.ts, as rendered in the header and titles. */
export const SITE_NAME: string =
  /export const APP_NAME = ['"]([^'"]+)['"]/.exec(read('src/branding.ts'))?.[1] ?? 'Field Notes'

/** Posts per index page, from src/config.ts. */
export const PAGE_SIZE: number = Number(
  /export const PAGE_SIZE = (\d+)/.exec(read('src/config.ts'))?.[1] ?? 10,
)

/** One post as the specs see it: front matter plus what the body promises the page shows. */
export interface SamplePost {
  slug: string
  title: string
  /** ISO date from the front matter. */
  date: string
  /** Lowercase tag slugs, in the post's order. */
  tags: string[]
  /** The first tag, or '' when the post has none. */
  tag: string
  draft: boolean
  /** Placeholder post shipped with the template (`templateDemo: true`). */
  demo: boolean
  /** Level-2 heading texts, in order. */
  headings: string[]
  /** Whether the body carries inline code or a code fence. */
  hasCode: boolean
  /** The first sentence-ish run of body text, for "served / not served" checks. */
  excerpt: string
}

const unquote = (value: string): string =>
  value
    .replace(/\s+#.*$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')

/** Minimal front-matter reader for the fields the posts use. */
function readPost(file: string): SamplePost {
  const text = read(join('content', 'posts', file))
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!match) throw new Error(`content/posts/${file}: no front matter`)
  const [, head = '', body = ''] = match
  const fields: Record<string, string> = {}
  for (const line of head.split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fields[kv[1]!] = kv[2]!
  }
  const tags = unquote(fields.tags ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => unquote(t).toLowerCase())
    .filter(Boolean)
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]!.replace(/[*_`]/g, ''))
  const paragraph = body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^[#>\-*`\d|]/.test(p))
  return {
    slug: fields.slug ? unquote(fields.slug) : file.replace(/\.md$/, ''),
    title: unquote(fields.title ?? ''),
    date: unquote(fields.date ?? ''),
    tags,
    tag: tags[0] ?? '',
    draft: /^true$/i.test(unquote(fields.draft ?? '')),
    demo: /^true$/i.test(unquote(fields.templateDemo ?? '')),
    headings,
    hasCode: /`/.test(body),
    excerpt: (paragraph ?? '').replace(/[*_`[\]]/g, '').slice(0, 40),
  }
}

const EVERY_POST: SamplePost[] = readdirSync(join(APP_ROOT, 'content', 'posts'))
  .filter((f) => f.endsWith('.md'))
  .map(readPost)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

/**
 * Every post the site considers, newest first: the template's placeholder
 * posts drop out as soon as one real post exists (src/content.ts).
 */
export const ALL_POSTS: SamplePost[] = EVERY_POST.some((p) => !p.demo)
  ? EVERY_POST.filter((p) => !p.demo)
  : EVERY_POST

/** The published posts, newest first — what the index, feeds and sitemap list. */
export const POSTS: SamplePost[] = ALL_POSTS.filter((p) => !p.draft)

/** The newest published post. */
export const FIRST_POST: SamplePost = POSTS[0]!

/** The newest published post that carries a tag. */
export const TAGGED_POST: SamplePost = POSTS.find((p) => p.tags.length > 0) ?? FIRST_POST

/**
 * A draft, or null when the content has none — it must never be reachable.
 * With no draft in the content the draft checks SKIP, which is correct: the
 * build's own test (src/__tests__/build.test.ts) covers drafts with a fixture of
 * its own. Never mark one of the user's real posts `draft: true` to give these
 * checks a subject — that hides the post from the site.
 */
export const DRAFT: SamplePost | null = ALL_POSTS.find((p) => p.draft) ?? null

/** Distinct tags across the published posts. */
export const TAGS: string[] = [...new Set(POSTS.flatMap((p) => p.tags))]

/** Index pages the published posts fill (at least 1). */
export const PAGE_COUNT: number = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE))

/**
 * The posts on one index page.
 *
 * @param page - 1-based page number.
 * @returns That page's posts.
 */
export function postsOnPage(page: number): SamplePost[] {
  return POSTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

/**
 * A post date the way the site renders it (src/pages.ts `formatDate`).
 *
 * @param date - ISO date.
 * @returns `September 6, 2026`.
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Open a page and wait until the layout is on screen.
 *
 * @param page - The Playwright page.
 * @param path - Site-relative path (`/about/`).
 */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(APP_BASE + path)
  await expect(page.locator('[data-mol-id="site-layout"]')).toBeVisible()
}

/**
 * Open a URL the site has no page for, and wait for the not-found page. The
 * server answers 404 — as a static host does — and the browser logs that
 * status as a console error, which the fixtures' console guard would count as
 * a failure; here it is the expected outcome, so it is declared first.
 *
 * @param page - The Playwright page.
 * @param path - Site-relative path with no page.
 */
export async function openNotFound(page: Page, path: string): Promise<void> {
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
  await open(page, path)
  await expect(page.locator('[data-mol-id="not-found-page"]')).toBeVisible()
}

/**
 * Fetch a file the site publishes.
 *
 * @param page - The Playwright page.
 * @param path - Site-relative path.
 * @returns Status, body and content type.
 */
export async function fetchFile(
  page: Page,
  path: string,
): Promise<{ status: number; body: string; contentType: string }> {
  const response = await page.request.get(APP_BASE + path)
  return {
    status: response.status(),
    body: await response.text(),
    contentType: response.headers()['content-type'] ?? '',
  }
}
