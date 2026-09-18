/**
 * Where the site lives — the two values every URL is built from.
 *
 * BASE_PATH: Vite's `base`, set at build time with the BASE_PATH env var
 * (`BASE_PATH=/my-repo npm run build` for a GitHub Pages project site). Vite
 * exposes it as `import.meta.env.BASE_URL`, always with a leading and a
 * trailing slash (`/` or `/my-repo/`). Route `<Link>`s get it from the
 * router's basename; every other href — feeds, JSON, raw markdown, images in
 * `public/` — must go through `withBase()`. A hardcoded `/feed.xml` breaks the
 * moment the site is served from a sub-path.
 *
 * SITE_URL: the public origin, for the absolute URLs feeds and sitemaps need.
 * Set VITE_SITE_URL in `.env` (`VITE_SITE_URL=https://example.com`).
 */

export const BASE_PATH: string = import.meta.env.BASE_URL || '/'

/** The basename react-router wants: no trailing slash, `/` for the root. */
export const ROUTER_BASENAME: string = BASE_PATH === '/' ? '/' : BASE_PATH.replace(/\/+$/, '')

export const SITE_URL: string = String(import.meta.env.VITE_SITE_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '')

/**
 * A site-relative path (`/feed.xml`, `/about/`) as an href under the base path.
 *
 * @param path - Site-relative path; a leading slash is optional.
 * @returns The href to put in the page.
 */
export function withBase(path: string): string {
  return BASE_PATH + path.replace(/^\/+/, '')
}

/**
 * The absolute URL of a site-relative path, for feeds, sitemaps and metas.
 *
 * @param path - Site-relative path; a leading slash is optional.
 * @returns `SITE_URL` + base path + the path.
 */
export function absoluteUrl(path: string): string {
  return SITE_URL + withBase(path)
}
