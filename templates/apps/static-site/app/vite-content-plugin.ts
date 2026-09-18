import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { readContentDirectory, setProvider as setContentProvider } from '@molecule/api-content'
import { provider as markdownFiles } from '@molecule/api-content-markdown'
import { provider as markdown } from '@molecule/app-markdown-marked'

/**
 * The site's content, read from `content/posts/*.md` at build time and handed
 * to the app as the `virtual:site-content` module (see src/content.ts for the
 * types and the helpers that page over it).
 *
 * Every post is a markdown file with YAML front matter — `title`, `date` and
 * `description` are required; `tags` is a list; `draft: true` keeps a post out
 * of the site entirely. The body is rendered to sanitized HTML once, here, by
 * `@molecule/app-markdown-marked`; the browser never parses markdown.
 *
 * A malformed post fails the build (and the dev server's load) with the file
 * and line: a missing title, a bad date, a duplicate slug or an unclosed
 * front-matter fence is never silently skipped.
 *
 * The posts this template ships with are PLACEHOLDERS. Each carries
 * `templateDemo: true` in its front matter, and the moment the directory holds
 * one post WITHOUT that marker the marked ones stop being part of the site —
 * so real content never gets published alongside the samples. Nothing is
 * deleted; the files stay on disk and the build prints which ones it left out.
 * A post you write is never marked, so it can never be the one dropped.
 */

/** Where the posts live, relative to the app root. */
export const CONTENT_DIR = 'content/posts'

/** Front-matter flag marking a post as this template's placeholder content. */
export const DEMO_FIELD = 'templateDemo'

/** The module id the app imports the content from. */
export const VIRTUAL_ID = 'virtual:site-content'
const RESOLVED_ID = String.fromCharCode(0) + VIRTUAL_ID

/** Front-matter fields every post must carry. */
const REQUIRED_FIELDS = ['title', 'date', 'description']

const TAG_RE = /^[a-z0-9][a-z0-9-]*$/
const WORDS_PER_MINUTE = 200

/** A heading in a post, for a table of contents. */
export interface PostHeading {
  id: string
  text: string
  level: number
}

/** One published post, as the app receives it. */
export interface Post {
  /** URL slug — the file name, or the front matter's `slug`. */
  slug: string
  title: string
  /** ISO-8601 publication date. */
  date: string
  description: string
  /** Lowercase tag slugs, in the order the post lists them. */
  tags: string[]
  /** The body rendered to sanitized HTML. */
  html: string
  /** The headings in the body, in order. */
  headings: PostHeading[]
  /** The source file, front matter included — served at `/<slug>.md`. */
  markdown: string
  /** Estimated reading time in minutes, never below 1. */
  readingMinutes: number
}

/** Everything the content directory holds, newest post first. */
export interface SiteContent {
  posts: Post[]
}

setContentProvider(markdownFiles)

function readTags(raw: unknown, path: string): string[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== 'string')) {
    throw new Error(`${path}: tags must be a list of strings`)
  }
  const tags = (raw as string[]).map((t) => t.trim().toLowerCase())
  for (const tag of tags) {
    if (!TAG_RE.test(tag)) {
      throw new Error(
        `${path}: tag "${tag}" is not lowercase letters, digits and hyphens starting with a letter or digit`,
      )
    }
  }
  return [...new Set(tags)]
}

/**
 * Reads and renders every published post under `<root>/content/posts`.
 *
 * Posts marked `templateDemo: true` are the template's placeholder samples:
 * they are kept while they are ALL the site has, and left out as soon as one
 * unmarked post exists. An unmarked post is never left out.
 *
 * @param root - The app root (the directory holding `content/`).
 * @returns The posts, newest first; drafts and superseded samples excluded.
 * @throws When any post is malformed — the error names the file.
 */
export async function loadSiteContent(root: string): Promise<SiteContent> {
  const all = await readContentDirectory(join(root, CONTENT_DIR), {
    requiredFields: REQUIRED_FIELDS,
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
  const posts: Post[] = records.map((record) => {
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
      readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    }
  })
  return { posts }
}

/**
 * Serves `virtual:site-content` from `content/posts`, rebuilding it whenever
 * a post is added, edited or removed while the dev server runs.
 */
export function contentPlugin(): Plugin {
  let root = process.cwd()
  return {
    name: 'molecule-site-content',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined
      const content = await loadSiteContent(root)
      return `export default ${JSON.stringify(content)}`
    },
    configureServer(server: ViteDevServer) {
      const dir = join(root, CONTENT_DIR)
      server.watcher.add(dir)
      const onChange = (file: string): void => {
        if (!file.startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.hot.send({ type: 'full-reload', path: '*' })
      }
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}
