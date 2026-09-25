/**
 * Where the site lives — the two values every URL is built from, read from the
 * environment when the build runs.
 *
 * BASE_PATH: the sub-path the site is served under. Unset or `/` is the origin
 * root; `/blog` and `/blog/` both mean `/blog/`. Every href the pages write —
 * links between pages, the stylesheet, the script, feeds, images — goes through
 * `withBase()`. A hardcoded `/feed.xml` breaks the moment the site is served
 * from a sub-path.
 *
 * SITE_URL: the public origin (`https://example.com`), for the absolute URLs
 * feeds, the sitemap, llms.txt and the canonical links need.
 */

/** The URL helpers for one base path and origin. */
export interface Site {
  /** `/` or `/segment/…/` — always a leading and a trailing slash. */
  basePath: string
  /** The public origin, no trailing slash. */
  siteUrl: string
  /** A site-relative path (`/about/`, `feed.xml`) as an href under the base path. */
  withBase(path: string): string
  /** SITE_URL + base path + path. */
  absoluteUrl(path: string): string
}

/**
 * Normalize a base path to `/` or `/segment/…/`.
 *
 * @param raw - BASE_PATH as given.
 * @returns The base path with a leading and a trailing slash.
 */
export function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '' || value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

/**
 * The URL helpers for one base path and origin.
 *
 * @param options - Defaults to BASE_PATH and SITE_URL from the environment.
 * @param options.basePath - The sub-path the site is served under.
 * @param options.siteUrl - The public origin.
 * @returns The helpers.
 */
export function createSite(options: { basePath?: string; siteUrl?: string } = {}): Site {
  const basePath = normalizeBase(options.basePath ?? process.env.BASE_PATH)
  const siteUrl = String(options.siteUrl ?? process.env.SITE_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '')
  return {
    basePath,
    siteUrl,
    withBase: (path) => basePath + path.replace(/^\/+/, ''),
    absoluteUrl: (path) => siteUrl + basePath + path.replace(/^\/+/, ''),
  }
}
