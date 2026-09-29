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
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { marginNotesCss } from '@molecule/app-margin-notes-html'

import { sectionSummaries } from './ai-summaries.js'
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
import { sectionStarts } from './post-notes.js'
import { humanProvenance, markdownBlocks, postProvenance, type Provenance } from './provenance.js'
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
export function sitePages(
  site: Site,
  posts: Post[],
  extras: {
    /** Provenance per post slug (posts with transcripts). */
    provenance?: Map<string, Provenance>
    /**
     * TL;DR per section per post slug, keyed by section start index
     * (`sectionStarts` in src/post-notes.ts). `buildSite` fills it by calling
     * `sectionSummaries()` (src/ai-summaries.ts), which summarizes each
     * section over the bonded AI provider and caches the answers.
     */
    summaries?: Map<string, Record<number, string>>
  } = {},
): SitePage[] {
  const pages = pageCount(posts)
  const tags = tagCounts(posts)
  return [
    ...Array.from({ length: pages }, (_, i) => ({
      path: pagePath(i + 1),
      render: () => indexPage({ site, posts: postsOnPage(posts, i + 1), page: i + 1, pages }),
    })),
    ...posts.map((post) => ({
      path: postPath(post.slug),
      render: () =>
        postPage({
          site,
          post,
          provenance: extras.provenance?.get(post.slug),
          summaries: extras.summaries?.get(post.slug),
        }),
    })),
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

/**
 * A TL;DR for every section of every post that has one to give.
 *
 * Summaries are generated in parallel over the bonded AI provider and cached
 * in `.cache/summaries.json`, so a rebuild only pays for sections whose text
 * changed. A post whose sections are all too short for a summary is skipped
 * without calling the model at all.
 *
 * @param root - The app root (content/ and the cache live here).
 * @param sources - Each post's markdown, by slug.
 * @returns TL;DR per section per slug (see `sitePages`).
 */
async function buildSummaries(
  root: string,
  sources: Map<string, string>,
): Promise<Map<string, Record<number, string>>> {
  const summaries = new Map<string, Record<number, string>>()
  await Promise.all(
    [...sources].map(async ([slug, markdown]) => {
      const blocks = markdownBlocks(markdown)
      const starts = sectionStarts(blocks)
      // A section runs from its own block up to the next one, so the model is
      // given that section and nothing else.
      const sections = starts.map((index, i) => ({
        index,
        text: blocks.slice(index, starts[i + 1] ?? blocks.length).join('\n\n'),
      }))
      const filled = await sectionSummaries(root, slug, sections)
      if (Object.keys(filled).length > 0) summaries.set(slug, filled)
    }),
  )
  return summaries
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
 * @param options.summaries - TL;DR per section per post slug (see `sitePages`).
 *   Left out, the build generates them (see src/ai-summaries.ts); pass `new Map()`
 *   to build without summaries, e.g. in a test.
 * @returns Every file written, the posts and the URL helpers used.
 */
export async function buildSite(options: {
  root: string
  outDir: string
  basePath?: string
  siteUrl?: string
  summaries?: Map<string, Record<number, string>>
}): Promise<BuildResult> {
  const { root, outDir } = options
  const site = createSite({ basePath: options.basePath, siteUrl: options.siteUrl })
  const posts = await loadPosts(root)
  // Provenance first: the post pages show it, and provenance.json publishes it —
  // for every post; one without transcripts is all human.
  const provenance = new Map<string, Provenance>()
  for (const post of posts) {
    const transcripts = join(root, TRANSCRIPTS_DIR, post.slug)
    provenance.set(
      post.slug,
      existsSync(transcripts)
        ? postProvenance(post.markdown, transcripts)
        : humanProvenance(post.markdown),
    )
  }
  const sources = new Map(posts.map((post) => [post.slug, post.markdown]))
  const summaries = options.summaries ?? (await buildSummaries(root, sources))
  const pages = sitePages(site, posts, { provenance, summaries })

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
    for (const [slug, p] of provenance) {
      write(`${slug}/provenance.json`, JSON.stringify(p, null, 2) + '\n')
    }
    // Each post's TL;DRs beside it: the same text the page shows, as data —
    // keyed by the block index each section starts at.
    for (const post of posts) {
      write(
        `${post.slug}/summaries.json`,
        JSON.stringify(summaries.get(post.slug) ?? {}, null, 2) + '\n',
      )
    }
    // The margin-notes layout's stylesheet goes FIRST and the site's own after it,
    // so a rule in public/styles.css wins a tie with the layout's defaults. The
    // other order made every site override lose (X0 x297, 2026-09-28: six minutes
    // of a fix round went to finding that the layout's --mn-measure beat its own).
    const styles = join(staging, 'styles.css')
    writeFileSync(styles, marginNotesCss + (existsSync(styles) ? readFileSync(styles, 'utf8') : ''))
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  rmSync(outDir, { recursive: true, force: true })
  renameSync(staging, outDir)
  return { files: listFiles(outDir).sort(), posts, site }
}
