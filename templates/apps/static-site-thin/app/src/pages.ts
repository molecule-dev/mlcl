/**
 * Every page of the site, as plain functions that return an HTML string.
 *
 * There is no framework here: a page is a template literal, the build writes it
 * to `dist/<path>/index.html`, and that file is exactly what the reader gets.
 * Nothing hydrates, so what the file says is what the browser shows. The only
 * script is `public/site.js`, a few lines of plain browser JavaScript.
 *
 * To change a page, edit its function. To add a page, write a function here,
 * add its path to `sitePages()` in src/build.ts (the build writes only what
 * that list names) and link to it where readers will find it (the nav below).
 *
 * Rules that keep the site correct:
 * - Every href and src goes through `site.withBase()` — BASE_PATH must keep working.
 * - Every piece of text that came from content goes through `escapeHtml()`
 *   (attributes too). `post.html` is the one exception: the markdown renderer
 *   already produced sanitized HTML.
 * - `data-mol-id` attributes are what the e2e specs find elements by — keep
 *   them when you restyle.
 */
import {
  type MarginNote,
  type MarginNotesBlock,
  marginNotesScriptTag,
  type RenderedMarginNotes,
  renderMarginNotes,
} from '@molecule/app-margin-notes-html'
import { provider as markdown } from '@molecule/app-markdown-marked'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './branding.js'
import { LANGUAGE } from './config.js'
import {
  ABOUT_PATH,
  FEED_ATOM_PATH,
  FEED_RSS_PATH,
  LLMS_PATH,
  pagePath,
  type Post,
  postMarkdownPath,
  postPath,
  POSTS_JSON_PATH,
  SITEMAP_PATH,
  tagPath,
  TAGS_PATH,
} from './content.js'
import { markdownBlocks, type Provenance } from './provenance.js'
import type { Site } from './site.js'

/**
 * Escape text for HTML content and attribute values.
 *
 * @param value - Any text.
 * @returns The escaped text.
 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * A date the way the site shows it: `September 6, 2026`.
 *
 * @param iso - An ISO-8601 date.
 * @returns The formatted date.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** What every page hands the layout. */
export interface PageInput {
  site: Site
  /** The page's own site-relative path (canonical link, current nav item). */
  path: string
  /** The title before ` | APP_NAME`; omit for the front page. */
  title?: string
  description?: string
  /** The page's `<main>` content. */
  main: string
  /** Extra `<head>` markup. */
  head?: string
}

/**
 * The document every page shares: head, header, main, footer.
 *
 * @param input - The page.
 * @returns The whole HTML document.
 */
export function layout({ site, path, title, description, main, head = '' }: PageInput): string {
  const fullTitle = title ? `${title} | ${APP_NAME}` : APP_NAME
  const nav = (href: string, label: string, id: string): string => {
    const current = href === '/' ? path === '/' || path.startsWith('/page/') : path.startsWith(href)
    return `<a href="${site.withBase(href)}" data-mol-id="nav-${id}"${current ? ' aria-current="page"' : ''}>${label}</a>`
  }
  const file = (href: string, label: string, id: string): string =>
    `<a href="${site.withBase(href)}" data-mol-id="footer-${id}">${label}</a>`
  return `<!doctype html>
<html lang="${LANGUAGE}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description || APP_DESCRIPTION)}" />
  <meta name="theme-color" content="${escapeHtml(BRAND_COLOR)}" />
  <link rel="canonical" href="${escapeHtml(site.absoluteUrl(path))}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(APP_NAME)}" href="${site.withBase(FEED_RSS_PATH)}" />
  <link rel="alternate" type="application/atom+xml" title="${escapeHtml(APP_NAME)}" href="${site.withBase(FEED_ATOM_PATH)}" />
  <link rel="icon" href="${site.withBase('/favicon.svg')}" type="image/svg+xml" />
  <link rel="stylesheet" href="${site.withBase('/styles.css')}" />
  <script src="${site.withBase('/site.js')}" defer></script>
  ${head}
</head>
<body>
  <div class="site" data-mol-id="site-layout">
    <header class="site-header" data-mol-id="site-header">
      <a class="site-name" href="${site.withBase('/')}" data-mol-id="site-name">${escapeHtml(APP_NAME)}</a>
      <nav class="site-nav" aria-label="Site">
        ${nav('/', 'Posts', 'posts')}
        ${nav(TAGS_PATH, 'Tags', 'tags')}
        ${nav(ABOUT_PATH, 'About', 'about')}
        ${nav(FEED_RSS_PATH, 'RSS', 'feed')}
      </nav>
    </header>
    <main class="site-main" id="main">
${main}
    </main>
    <footer class="site-footer">
      <p>${escapeHtml(APP_NAME)} · ${file(FEED_RSS_PATH, 'RSS', 'rss')} · ${file(FEED_ATOM_PATH, 'Atom', 'atom')} · ${file(POSTS_JSON_PATH, 'JSON', 'json')} · ${file(LLMS_PATH, 'llms.txt', 'llms')} · ${file(SITEMAP_PATH, 'Sitemap', 'sitemap')} · ${file(ABOUT_PATH, 'About', 'about')}</p>
    </footer>
  </div>
</body>
</html>
`
}

function tagList(site: Site, tags: string[]): string {
  if (tags.length === 0) return ''
  const items = tags
    .map(
      (tag) =>
        `<li><a href="${site.withBase(tagPath(tag))}" rel="tag">#${escapeHtml(tag)}</a></li>`,
    )
    .join('')
  return `<ul class="tags" aria-label="Tags" data-mol-id="post-tags">${items}</ul>`
}

function postMeta(post: Post): string {
  return `<p class="meta"><time datetime="${escapeHtml(post.date)}" data-mol-id="post-date">${formatDate(post.date)}</time> · <span data-mol-id="post-reading-time">${post.readingMinutes} min read</span></p>`
}

function postCard(site: Site, post: Post): string {
  return `<article class="post-card" data-mol-id="post-card-${escapeHtml(post.slug)}">
  <h2><a href="${site.withBase(postPath(post.slug))}">${escapeHtml(post.title)}</a></h2>
  ${postMeta(post)}
  <p>${escapeHtml(post.description)}</p>
  ${tagList(site, post.tags)}
</article>`
}

/**
 * The block indexes that start a section: 0 (the lead), then every heading at
 * the post's shallowest heading level. Summaries are keyed by these.
 *
 * @param blocks - The post's top-level markdown blocks (`markdownBlocks()`).
 * @returns The indexes, in order.
 */
export function sectionStarts(blocks: string[]): number[] {
  const level = (text: string): number => /^(#{1,6})\s/.exec(text)?.[1].length ?? 0
  const top = Math.min(...blocks.map((b) => level(b) || 7))
  return blocks.flatMap((b, i) => (i === 0 || level(b) === top ? [i] : []))
}

/**
 * The header line: the share of the post's words an AI wrote, from how many prompts.
 *
 * @param provenance - The post's provenance.
 * @returns The line, e.g. "41% of the words were written by an AI, from 12 prompts".
 */
export function aiShareLine(provenance: Provenance): string {
  const count = provenance.prompts.length
  if (count === 0) return 'Every word of this post was written by a person.'
  const percent = Math.round(provenance.aiShare * 100)
  return `${percent}% of the words were written by an AI, from ${count} ${count === 1 ? 'prompt' : 'prompts'}`
}

/**
 * The post body as a margin-notes layout: each top-level block of the post,
 * with the section's TL;DR and each AI block's prompt beside it
 * (`@molecule/app-margin-notes-html` — the switches, the gutter, the phone bar
 * and its script are all that package; do not rebuild any of them here).
 * Every post body goes through it, so every post shares one type scale; a
 * post with nothing to put beside it (`hasNotes` false) is plain centred prose,
 * with no gutter, bar or switches.
 *
 * @param post - The post.
 * @param provenance - Its provenance, when it has transcripts.
 * @param summaries - TL;DR per section start index.
 * @returns The layout, the switches for the header, and whether there are notes.
 */
export function postNotes(
  post: Post,
  provenance: Provenance | undefined,
  summaries: Record<number, string>,
): RenderedMarginNotes {
  const texts = provenance?.spans.map((s) => s.text) ?? markdownBlocks(post.markdown)
  const starts = new Set(sectionStarts(texts))
  const notes: MarginNote[] = []
  const promptIds = new Map<string, string>()
  let summaryId: string | undefined
  const blocks: MarginNotesBlock[] = texts.map((text, i) => {
    if (starts.has(i)) {
      summaryId = summaries[i] ? `summary-${i}` : undefined
      if (summaryId) {
        notes.push({
          id: summaryId,
          kind: 'summary',
          label: 'TL;DR',
          html: `<p>${escapeHtml(summaries[i])}</p>`,
        })
      }
    }
    const noteIds = summaryId ? [summaryId] : []
    const span = provenance?.spans[i]
    if (span?.origin === 'ai' && span.prompt) {
      let id = promptIds.get(span.prompt)
      if (!id) {
        id = `prompt-${promptIds.size}`
        promptIds.set(span.prompt, id)
        notes.push({
          id,
          kind: 'prompt',
          label: `Prompt · ${span.model ?? 'AI'}`,
          html: `<p>${escapeHtml(span.prompt)}</p>`,
        })
      }
      noteIds.push(id)
    }
    return {
      id: `block-${i}`,
      html: markdown.render(text).html,
      noteIds,
      marked: span?.origin === 'ai',
    }
  })
  return renderMarginNotes({
    blocks,
    notes,
    kinds: [
      { id: 'summary', label: 'Summary', defaultOn: true },
      { id: 'prompt', label: 'Prompt', defaultOn: false, panel: 'tap' },
    ],
    markLabel: 'Written with AI',
  })
}

/**
 * An index page: the front page (page 1) or an older page.
 *
 * @param input - The page's posts and where it sits in the paging.
 * @param input.site - URL helpers.
 * @param input.posts - This page's posts.
 * @param input.page - 1-based page number.
 * @param input.pages - How many index pages there are.
 * @returns The HTML document.
 */
export function indexPage({
  site,
  posts,
  page,
  pages,
}: {
  site: Site
  posts: Post[]
  page: number
  pages: number
}): string {
  const newer =
    page > 1
      ? `<a href="${site.withBase(pagePath(page - 1))}" rel="prev" data-mol-id="pagination-newer">Newer posts</a>`
      : ''
  const older =
    page < pages
      ? `<a href="${site.withBase(pagePath(page + 1))}" rel="next" data-mol-id="pagination-older">Older posts</a>`
      : ''
  const pager =
    pages > 1
      ? `<nav class="pager" aria-label="Pages" data-mol-id="pagination">${newer}<span data-mol-id="pagination-position">Page ${page} of ${pages}</span>${older}</nav>`
      : ''
  const intro =
    page === 1
      ? `<h1>${escapeHtml(APP_NAME)}</h1>\n<p class="lede">${escapeHtml(APP_DESCRIPTION)}</p>`
      : `<h1>Posts, page ${page}</h1>`
  return layout({
    site,
    path: pagePath(page),
    title: page === 1 ? undefined : `Page ${page}`,
    main: `${intro}
<section class="post-list" data-mol-id="post-list">
${posts.map((post) => postCard(site, post)).join('\n')}
</section>
${pager}`,
  })
}

/**
 * One post.
 *
 * @param input - The post.
 * @param input.site - URL helpers.
 * @param input.post - The post to render.
 * @returns The HTML document.
 */
export function postPage({
  site,
  post,
  provenance,
  summaries = {},
}: {
  site: Site
  post: Post
  /** The post's provenance (a post with transcripts): marks AI blocks and shows each prompt. */
  provenance?: Provenance
  /** TL;DR per section, keyed by the section's first block index (see `sectionStarts`). */
  summaries?: Record<number, string>
}): string {
  const notes = postNotes(post, provenance, summaries)
  const sections = post.headings.filter((h) => h.level === 2)
  const toc =
    sections.length > 1
      ? `<nav class="toc" aria-label="On this page"><ul>${sections
          .map((h) => `<li><a href="#${escapeHtml(h.id)}">${escapeHtml(h.text)}</a></li>`)
          .join('')}</ul></nav>`
      : ''
  return layout({
    site,
    path: postPath(post.slug),
    title: post.title,
    description: post.description,
    head: `<link rel="alternate" type="text/markdown" href="${site.withBase(postMarkdownPath(post.slug))}" />`,
    main: `<article class="post" data-mol-id="post">
  <header class="post-header">
    <h1 data-mol-id="post-title">${escapeHtml(post.title)}</h1>
    ${postMeta(post)}
    ${tagList(site, post.tags)}
    ${provenance ? `<p class="ai-share" data-mol-id="post-ai-share">${escapeHtml(aiShareLine(provenance))}</p>` : ''}
    ${notes.switchesHtml}
  </header>
  ${notes.hasNotes ? '' : toc}
  <div class="prose" data-mol-id="post-body">
${notes.html}
  </div>
  ${notes.hasNotes ? marginNotesScriptTag() : ''}
  <footer class="post-footer">
    <a href="${site.withBase(postMarkdownPath(post.slug))}" data-mol-id="post-markdown">View as markdown</a>
  </footer>
</article>`,
  })
}

/**
 * Every tag with its post count.
 *
 * @param input - The tags.
 * @param input.site - URL helpers.
 * @param input.tags - Each tag with its post count.
 * @returns The HTML document.
 */
export function tagsPage({
  site,
  tags,
}: {
  site: Site
  tags: Array<{ tag: string; count: number }>
}): string {
  const items = tags
    .map(
      ({ tag, count }) =>
        `<li><a href="${site.withBase(tagPath(tag))}" data-mol-id="tag-${escapeHtml(tag)}">#${escapeHtml(tag)}</a> <span class="count">${count} ${count === 1 ? 'post' : 'posts'}</span></li>`,
    )
    .join('\n')
  return layout({
    site,
    path: TAGS_PATH,
    title: 'Tags',
    main: `<section data-mol-id="tags-page">\n<h1>Tags</h1>\n<ul class="tag-index" data-mol-id="tag-list">\n${items}\n</ul>\n</section>`,
  })
}

/**
 * The posts carrying one tag.
 *
 * @param input - The tag and its posts.
 * @param input.site - URL helpers.
 * @param input.tag - The tag slug.
 * @param input.posts - The posts with that tag, newest first.
 * @returns The HTML document.
 */
export function tagPage({ site, tag, posts }: { site: Site; tag: string; posts: Post[] }): string {
  return layout({
    site,
    path: tagPath(tag),
    title: `#${tag}`,
    main: `<h1 data-mol-id="tag-title">Posts tagged #${escapeHtml(tag)}</h1>
<section class="post-list" data-mol-id="post-list">
${posts.map((post) => postCard(site, post)).join('\n')}
</section>
<p><a href="${site.withBase(TAGS_PATH)}">All tags</a></p>`,
  })
}

/**
 * The About page.
 *
 * @param input - URL helpers.
 * @param input.site - URL helpers.
 * @returns The HTML document.
 */
export function aboutPage({ site }: { site: Site }): string {
  return layout({
    site,
    path: ABOUT_PATH,
    title: 'About',
    main: `<article class="prose" data-mol-id="about-page">
<h1>About</h1>
<p>${escapeHtml(APP_DESCRIPTION)}</p>
<p>Every post is also published as markdown, and the whole site is listed in <a href="${site.withBase(LLMS_PATH)}">llms.txt</a> and <a href="${site.withBase(FEED_RSS_PATH)}">the RSS feed</a>.</p>
</article>`,
  })
}

/**
 * The page a static host shows for an unknown URL (`dist/404.html`).
 *
 * @param input - URL helpers.
 * @param input.site - URL helpers.
 * @returns The HTML document.
 */
export function notFoundPage({ site }: { site: Site }): string {
  return layout({
    site,
    path: '/404.html',
    title: 'Page not found',
    main: `<section data-mol-id="not-found-page">\n<h1>Page not found</h1>\n<p>There is no page at this address. <a href="${site.withBase('/')}" data-mol-id="not-found-home">Back to the posts</a>.</p>\n</section>`,
  })
}
