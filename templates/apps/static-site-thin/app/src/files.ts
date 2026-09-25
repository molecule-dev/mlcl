/**
 * The site's non-HTML files: RSS + Atom feeds (`@molecule/api-feed-rss`), the
 * sitemap (`@molecule/api-sitemap-xml`), `llms.txt`, `posts.json` and each
 * post's raw markdown. The build writes them into `dist/` at these paths, and
 * the dev server serves the same build. Drafts never reach any of them — the
 * content loader never reads them in.
 */
import { type Feed, serializeAtom1, serializeRss2 } from '@molecule/api-feed-rss'
import { createProvider as createSitemap } from '@molecule/api-sitemap-xml'

import { APP_DESCRIPTION, APP_NAME } from './branding.js'
import { LANGUAGE } from './config.js'
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
  POSTS_JSON_PATH,
  SITEMAP_PATH,
  tagCounts,
  tagPath,
  TAGS_PATH,
} from './content.js'
import type { Site } from './site.js'

/** One file the site publishes, at a site-relative path. */
export interface SiteFile {
  path: string
  content: string
}

function feed(site: Site, posts: Post[]): Feed {
  return {
    title: APP_NAME,
    link: site.absoluteUrl('/'),
    description: APP_DESCRIPTION,
    feedUrl: site.absoluteUrl(FEED_RSS_PATH),
    language: LANGUAGE,
    updatedAt: posts[0]?.date,
    items: posts.map((post) => ({
      id: site.absoluteUrl(postPath(post.slug)),
      title: post.title,
      link: site.absoluteUrl(postPath(post.slug)),
      summary: post.description,
      content: post.html,
      contentIsHtml: true,
      publishedAt: post.date,
      categories: post.tags,
    })),
  }
}

async function sitemap(site: Site, posts: Post[], pagePaths: string[]): Promise<string> {
  const provider = createSitemap({ pretty: true })
  const newest = posts[0]?.date
  for (const path of pagePaths) {
    const lastmod = posts.find((p) => postPath(p.slug) === path)?.date ?? newest
    provider.addUrl({
      loc: site.absoluteUrl(path),
      ...(lastmod ? { lastmod } : {}),
      changefreq: path === pagePath(1) ? 'daily' : 'weekly',
      priority: path === pagePath(1) ? 1 : path.startsWith(TAGS_PATH) ? 0.4 : 0.7,
    })
  }
  return provider.generate()
}

function llmsTxt(site: Site, posts: Post[]): string {
  return [
    `# ${APP_NAME}`,
    '',
    `> ${APP_DESCRIPTION}`,
    '',
    `Every post is available as markdown at the same path with a \`.md\` extension; the full index is at ${site.absoluteUrl(POSTS_JSON_PATH)}.`,
    '',
    '## Posts',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${site.absoluteUrl(postMarkdownPath(post.slug))}): ${post.description}`,
    ),
    '',
    '## Pages',
    '',
    `- [About](${site.absoluteUrl(ABOUT_PATH)})`,
    `- [Tags](${site.absoluteUrl(TAGS_PATH)})`,
    '',
  ].join('\n')
}

function postsJson(site: Site, posts: Post[]): string {
  const index = {
    site: { name: APP_NAME, description: APP_DESCRIPTION, url: site.absoluteUrl('/') },
    feeds: { rss: site.absoluteUrl(FEED_RSS_PATH), atom: site.absoluteUrl(FEED_ATOM_PATH) },
    pages: pageCount(posts),
    tags: tagCounts(posts).map(({ tag, count }) => ({
      tag,
      count,
      url: site.absoluteUrl(tagPath(tag)),
    })),
    posts: posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      tags: post.tags,
      readingMinutes: post.readingMinutes,
      url: site.absoluteUrl(postPath(post.slug)),
      markdownUrl: site.absoluteUrl(postMarkdownPath(post.slug)),
    })),
  }
  return JSON.stringify(index, null, 2) + '\n'
}

/**
 * Every non-HTML file the site publishes.
 *
 * @param input - The site and its content.
 * @param input.site - URL helpers.
 * @param input.posts - Every published post, newest first.
 * @param input.pagePaths - Every HTML page the build writes (for the sitemap).
 * @returns The files, by site-relative path.
 */
export async function siteFiles({
  site,
  posts,
  pagePaths,
}: {
  site: Site
  posts: Post[]
  pagePaths: string[]
}): Promise<SiteFile[]> {
  const channel = feed(site, posts)
  return [
    { path: FEED_RSS_PATH, content: serializeRss2(channel, { pretty: true }) },
    { path: FEED_ATOM_PATH, content: serializeAtom1(channel, { pretty: true }) },
    { path: SITEMAP_PATH, content: await sitemap(site, posts, pagePaths) },
    { path: LLMS_PATH, content: llmsTxt(site, posts) },
    { path: POSTS_JSON_PATH, content: postsJson(site, posts) },
    ...posts.map((post) => ({ path: postMarkdownPath(post.slug), content: post.markdown })),
  ]
}
