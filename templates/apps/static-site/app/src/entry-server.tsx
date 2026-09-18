import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'

import { type Feed, serializeAtom1, serializeRss2 } from '@molecule/api-feed-rss'
import { createProvider as createSitemap } from '@molecule/api-sitemap-xml'

import type { StaticFile } from '../vite-static-site-plugin.js'
import { App } from './App.js'
import { setupProviders } from './bonds/index.js'
import { APP_DESCRIPTION, APP_NAME } from './branding.js'
import { readPageMeta, resetPageMeta } from './components/PageMeta.js'
import {
  ABOUT_PATH,
  FEED_ATOM_PATH,
  FEED_RSS_PATH,
  LLMS_PATH,
  pageCount,
  pagePath,
  type Post,
  postMarkdownPath,
  postPath,
  posts,
  POSTS_JSON_PATH,
  SITEMAP_PATH,
  sitePaths,
  tagCounts,
  tagPath,
  TAGS_PATH,
} from './content.js'
import { absoluteUrl, ROUTER_BASENAME, withBase } from './site.js'

/**
 * The build-time entry — what scripts/prerender.mjs calls to write `dist/`,
 * and what the dev server's static-site plugin loads to serve the feeds.
 * It runs in Node, not a browser: nothing here may touch `window` or
 * `document`. The same `<App />` the browser mounts renders here, so a page
 * is never written twice.
 *
 * Pages come from src/content.ts (`sitePaths`): the paginated index, one page
 * per post, the tag pages and About. Files come from `getStaticFiles()`: the
 * RSS and Atom feeds (`@molecule/api-feed-rss`), the sitemap
 * (`@molecule/api-sitemap-xml`), `llms.txt`, `posts.json` and the raw
 * markdown of every post. Drafts are already excluded — the content plugin
 * never reads them in.
 */

/** One rendered page, as the prerender writes it into the shell. */
export interface RenderedPage {
  html: string
  title: string
  description: string
  /** Extra `<head>` markup: the canonical link and the feed alternates. */
  head: string
}

setupProviders()

/** Every HTML page the build writes. */
export function getStaticPaths(): string[] {
  return sitePaths(posts)
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function feed(): Feed {
  return {
    title: APP_NAME,
    link: absoluteUrl('/'),
    description: APP_DESCRIPTION,
    feedUrl: absoluteUrl(FEED_RSS_PATH),
    language: 'en',
    updatedAt: posts[0]?.date,
    items: posts.map((post) => ({
      id: absoluteUrl(postPath(post.slug)),
      title: post.title,
      link: absoluteUrl(postPath(post.slug)),
      summary: post.description,
      content: post.html,
      contentIsHtml: true,
      publishedAt: post.date,
      categories: post.tags,
    })),
  }
}

async function sitemap(): Promise<string> {
  const provider = createSitemap({ pretty: true })
  const newest = posts[0]?.date
  const lastmodOf = (path: string): string | undefined => {
    const post = posts.find((p) => postPath(p.slug) === path)
    return post ? post.date : newest
  }
  for (const path of sitePaths(posts)) {
    const lastmod = lastmodOf(path)
    provider.addUrl({
      loc: absoluteUrl(path),
      ...(lastmod ? { lastmod } : {}),
      changefreq: path === pagePath(1) ? 'daily' : 'weekly',
      priority: path === pagePath(1) ? 1 : path.startsWith(TAGS_PATH) ? 0.4 : 0.7,
    })
  }
  return provider.generate()
}

function llmsTxt(): string {
  const lines = [
    `# ${APP_NAME}`,
    '',
    `> ${APP_DESCRIPTION}`,
    '',
    `Every post is available as markdown at the same path with a \`.md\` extension; the full index is at ${absoluteUrl(POSTS_JSON_PATH)}.`,
    '',
    '## Posts',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${absoluteUrl(postMarkdownPath(post.slug))}): ${post.description}`,
    ),
    '',
    '## Pages',
    '',
    `- [About](${absoluteUrl(ABOUT_PATH)})`,
    `- [Tags](${absoluteUrl(TAGS_PATH)})`,
    '',
  ]
  return lines.join('\n')
}

function postsJson(): string {
  const index = {
    site: { name: APP_NAME, description: APP_DESCRIPTION, url: absoluteUrl('/') },
    feeds: { rss: absoluteUrl(FEED_RSS_PATH), atom: absoluteUrl(FEED_ATOM_PATH) },
    pages: pageCount(posts),
    tags: tagCounts(posts).map(({ tag, count }) => ({
      tag,
      count,
      url: absoluteUrl(tagPath(tag)),
    })),
    posts: posts.map((post: Post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      tags: post.tags,
      readingMinutes: post.readingMinutes,
      url: absoluteUrl(postPath(post.slug)),
      markdownUrl: absoluteUrl(postMarkdownPath(post.slug)),
    })),
  }
  return JSON.stringify(index, null, 2) + '\n'
}

/** The feeds, the sitemap, llms.txt, posts.json and every post's markdown. */
export async function getStaticFiles(): Promise<StaticFile[]> {
  const site = feed()
  return [
    { path: FEED_RSS_PATH, content: serializeRss2(site, { pretty: true }) },
    { path: FEED_ATOM_PATH, content: serializeAtom1(site, { pretty: true }) },
    { path: SITEMAP_PATH, content: await sitemap() },
    { path: LLMS_PATH, content: llmsTxt() },
    { path: POSTS_JSON_PATH, content: postsJson() },
    ...posts.map((post) => ({ path: postMarkdownPath(post.slug), content: post.markdown })),
  ]
}

/**
 * Render one route to markup plus its document metadata.
 *
 * @param path - Site-relative path, as listed by `getStaticPaths()`.
 * @returns The page for scripts/prerender.mjs to write.
 */
export function render(path: string): RenderedPage {
  resetPageMeta()
  // renderToString, not renderToStaticMarkup: the page is HYDRATED (src/main.tsx),
  // and only renderToString writes the text-node separators (`<!-- -->`)
  // hydration needs. Static markup merges adjacent text nodes — `{" · "}{model}`
  // becomes one node — so the client finds a mismatch, throws the markup away
  // and renders again with only what it has on the client.
  const html = renderToString(
    <StaticRouter basename={ROUTER_BASENAME} location={withBase(path)}>
      <App />
    </StaticRouter>,
  )
  const meta = readPageMeta()
  const head = [
    `<link rel="canonical" href="${escapeAttr(absoluteUrl(path))}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(APP_NAME)}" href="${escapeAttr(withBase(FEED_RSS_PATH))}" />`,
    `<link rel="alternate" type="application/atom+xml" title="${escapeAttr(APP_NAME)}" href="${escapeAttr(withBase(FEED_ATOM_PATH))}" />`,
  ].join('\n  ')
  return {
    html,
    title: meta.title ? `${meta.title} | ${APP_NAME}` : APP_NAME,
    description: meta.description || APP_DESCRIPTION,
    head,
  }
}
