/**
 * The whole build, as one function: read the content, write every page and
 * file into an output directory, copy `public/`. `scripts/build.ts` calls it
 * for `dist/`; `scripts/dev.ts` runs the same script again on every change.
 *
 * The output IS the site: plain HTML, CSS, JS and data files that any static
 * host serves as they are.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'

import {
  ABOUT_PATH,
  loadPosts,
  pageCount,
  pagePath,
  type Post,
  postPath,
  postsOnPage,
  tagCounts,
  tagPath,
  TAGS_PATH,
  TRANSCRIPTS_DIR,
} from './content.js'
import { siteFiles } from './files.js'
import { aboutPage, indexPage, notFoundPage, postPage, tagPage, tagsPage } from './pages.js'
import { postProvenance } from './provenance.js'
import { createSite, type Site } from './site.js'

/** One HTML page the build writes. */
export interface SitePage {
  /** Site-relative path, ending in `/`. */
  path: string
  render: () => string
}

/**
 * Every HTML page the site has. This list IS the site's page set: a page not
 * listed here is never written.
 *
 * @param site - URL helpers.
 * @param posts - Every published post, newest first.
 * @returns The pages, in sitemap order.
 */
export function sitePages(site: Site, posts: Post[]): SitePage[] {
  const pages = pageCount(posts)
  const tags = tagCounts(posts)
  return [
    ...Array.from({ length: pages }, (_, i) => ({
      path: pagePath(i + 1),
      render: () => indexPage({ site, posts: postsOnPage(posts, i + 1), page: i + 1, pages }),
    })),
    ...posts.map((post) => ({ path: postPath(post.slug), render: () => postPage({ site, post }) })),
    { path: TAGS_PATH, render: () => tagsPage({ site, tags }) },
    ...tags.map(({ tag }) => ({
      path: tagPath(tag),
      render: () => tagPage({ site, tag, posts: posts.filter((p) => p.tags.includes(tag)) }),
    })),
    { path: ABOUT_PATH, render: () => aboutPage({ site }) },
  ]
}

/**
 * The file a site path is written to: `/about/` → `about/index.html`.
 *
 * @param path - Site-relative path.
 * @returns The path relative to the output directory.
 */
export function outputFileOf(path: string): string {
  return path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1)
}

function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full, root) : [relative(root, full)]
  })
}

/** What a build produced. */
export interface BuildResult {
  /** Every file in the output directory, relative to it, sorted. */
  files: string[]
  posts: Post[]
  site: Site
}

/**
 * Build the site.
 *
 * @param options - Where to read and write.
 * @param options.root - The app root (holds content/, public/, src/).
 * @param options.outDir - Where to write; replaced whole once the build succeeds.
 * @param options.basePath - Defaults to BASE_PATH from the environment.
 * @param options.siteUrl - Defaults to SITE_URL from the environment.
 * @returns Every file written, the posts and the URL helpers used.
 */
export async function buildSite(options: {
  root: string
  outDir: string
  basePath?: string
  siteUrl?: string
}): Promise<BuildResult> {
  const { root, outDir } = options
  const site = createSite({ basePath: options.basePath, siteUrl: options.siteUrl })
  const posts = await loadPosts(root)
  const pages = sitePages(site, posts)

  // Write into a sibling directory and swap it in only when everything was
  // written: a build that fails halfway leaves the previous output intact (the
  // dev server keeps showing the last good site).
  const staging = `${outDir}.building-${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  const write = (rel: string, content: string): void => {
    const file = join(staging, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  try {
    const publicDir = join(root, 'public')
    if (existsSync(publicDir)) cpSync(publicDir, staging, { recursive: true })

    for (const page of pages) write(outputFileOf(page.path), page.render())
    write('404.html', notFoundPage({ site }))
    for (const file of await siteFiles({ site, posts, pagePaths: pages.map((p) => p.path) })) {
      write(outputFileOf(file.path), file.content)
    }
    for (const post of posts) {
      const transcripts = join(root, TRANSCRIPTS_DIR, post.slug)
      if (!existsSync(transcripts)) continue
      const provenance = postProvenance(post.markdown, transcripts)
      write(`${post.slug}/provenance.json`, JSON.stringify(provenance, null, 2) + '\n')
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  rmSync(outDir, { recursive: true, force: true })
  renameSync(staging, outDir)
  return { files: listFiles(outDir).sort(), posts, site }
}
