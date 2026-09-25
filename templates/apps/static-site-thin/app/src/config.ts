/**
 * Site settings that are not identity (identity is src/branding.ts).
 *
 * Where the site is served from is NOT set here — it comes from the
 * environment when the build runs, so one build can target any host:
 *   BASE_PATH  the sub-path the site lives under (`/` or `/blog/`)
 *   SITE_URL   the public origin, for the absolute URLs feeds and the sitemap need
 * e.g. `BASE_PATH=/blog SITE_URL=https://example.com npm run build`.
 */

/** The language of the content (the `lang` attribute and the feeds). */
export const LANGUAGE = 'en'

/** Posts per index page. */
export const PAGE_SIZE = 10
