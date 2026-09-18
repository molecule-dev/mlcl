// Shared helpers for the static-site e2e specs. The site has no API and no
// login: every spec drives the dev server (`npm run dev`) or the built site
// (`npm run build && npm run preview`) at APP_BASE and asserts on the screen.
//
// Inside a molecule sandbox the specs drive the live preview as soon as a file
// is written. Run the WHOLE suite — `npm run test:e2e`: `workers: 1` puts every
// spec file in ONE worker process, so the suite costs one runner startup, while
// a file per command pays that startup again each time. Narrow it deliberately
// with `npm run test:e2e -- e2e/home.spec.ts` (a list of files is also one
// process) or `npm run test:e2e:changed` — which prints `Total: 0 tests in 0
// files` when nothing changed, and still exits 0.
//
// Everything the specs expect about the CONTENT — the site name, the posts
// per page, the newest post, its date, headings and tags, the draft — is read
// from the app's own files at test time (`src/branding.ts`, `src/content.ts`,
// `content/posts/*.md`), the same sources the site is generated from. Replace
// the sample posts with your own and the specs stay true; a spec that fails
// after a content change is reporting a real difference between the files and
// the screen.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page } from '@molecule/app-e2e-fixtures-default'

import './bonds.js'

/**
 * The site's base path, the same way app/vite.config.ts reads it: BASE_PATH
 * unset or `/` is the origin root; `/blog` and `/blog/` both mean `/blog/`.
 * A site built for a sub-path (`BASE_PATH=/blog/ npm run dev`) serves every
 * URL under it, so every spec's path is joined onto it here — a spec says
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

/** Posts per index page, from src/content.ts. */
export const PAGE_SIZE: number = Number(
  /export const PAGE_SIZE = (\d+)/.exec(read('src/content.ts'))?.[1] ?? 10,
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
  /** Level-2 heading texts, in order. */
  headings: string[]
  /** Bulleted list items (`- ` / `* ` lines). */
  bullets: number
  /** Whether the body carries inline code or a code fence. */
  hasCode: boolean
  /** The first sentence-ish run of body text, for "served / not served" checks. */
  excerpt: string
}

const unquote = (value: string): string => value.trim().replace(/^(['"])(.*)\1$/, '$2')

/** Minimal front-matter reader for the fields the sample posts use (see vite-content-plugin.ts). */
function readPost(file: string): SamplePost {
  const text = read(join('content', 'posts', file))
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!match) throw new Error(`content/posts/${file}: no front matter`)
  const [, head, body] = match
  const fields: Record<string, string> = {}
  for (const line of head.split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fields[kv[1]] = kv[2]
  }
  const tags = (fields.tags ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => unquote(t).toLowerCase())
    .filter(Boolean)
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].replace(/[*_`]/g, ''))
  const bullets = body.split(/\r?\n/).filter((l) => /^\s*[-*]\s+\S/.test(l)).length
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
    draft: /^true$/i.test((fields.draft ?? '').trim()),
    headings,
    bullets,
    hasCode: /`/.test(body),
    excerpt: (paragraph ?? '').replace(/[*_`\[\]]/g, '').slice(0, 40),
  }
}

/** Every sample post, newest first (by date, then slug — the order the site uses). */
export const ALL_POSTS: SamplePost[] = readdirSync(join(APP_ROOT, 'content', 'posts'))
  .filter((f) => f.endsWith('.md'))
  .map(readPost)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

/** The published posts, newest first — what the index, feeds and sitemap list. */
export const POSTS: SamplePost[] = ALL_POSTS.filter((p) => !p.draft)

/** The newest published post. */
export const FIRST_POST: SamplePost = POSTS[0]!

/** The newest published post that carries a tag (the tag specs drive this one). */
export const TAGGED_POST: SamplePost = POSTS.find((p) => p.tags.length > 0) ?? FIRST_POST

/** A draft, or null when the content has none — it must never be reachable. */
export const DRAFT: SamplePost | null = ALL_POSTS.find((p) => p.draft) ?? null

/** Distinct tags across the published posts. */
export const TAGS: string[] = [...new Set(POSTS.flatMap((p) => p.tags))]

/** Index pages the published posts fill (at least 1). */
export const PAGE_COUNT: number = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE))

/** The posts on one index page (1-based). */
export function postsOnPage(page: number): SamplePost[] {
  return POSTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

/** A post date the way the site renders it (src/components/PostDate.tsx). */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Navigate and wait for the app to mount (the layout carries data-mol-id) and
 * hydrate. Every route arrives prerendered — from the dev server as from the
 * build — and React hydrates it; a mismatch makes React throw the markup away
 * and render again with only what the client has, so a page counts as open
 * only once it has hydrated without one (src/main.tsx records them).
 */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(APP_BASE + path)
  await expect(page.locator('[data-mol-id="site-layout"]')).toBeVisible()
  await expect(page.locator('html[data-mol-mounted]')).toHaveCount(1)
  const hydration = await page.evaluate(
    () => (window as Window & { __molHydrationErrors?: string[] }).__molHydrationErrors ?? [],
  )
  expect(hydration, 'the page hydrated without a mismatch').toEqual([])
}

/** Fetch a non-HTML file the site publishes and return status + body. */
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
