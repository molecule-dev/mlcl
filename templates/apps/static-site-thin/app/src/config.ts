/**
 * Site settings that are not identity (identity is src/branding.ts).
 *
 * Where the site is served from is NOT set here — it comes from the
 * environment when the build runs, so one build can target any host:
 *   BASE_PATH  the sub-path the site lives under (`/` or `/blog/`)
 *   SITE_URL   the public origin, for the absolute URLs feeds and the sitemap need
 * e.g. `BASE_PATH=/blog SITE_URL=https://example.com npm run build`.
 *
 * Both are read from the process environment ONLY — no `.env` file is loaded,
 * so editing one changes nothing. On molecule.dev they come from the project's
 * Environment settings, already exported into the sandbox.
 *
 * SITE_URL is the site's CANONICAL home, which the user chose. It may differ
 * from where a deploy is served (a preview or test host): canonical links and
 * feed URLs on the deployed copy pointing at SITE_URL are correct. Do not
 * change SITE_URL to the deploy's URL, and do not work around the environment
 * to do it.
 */

/** The language of the content (the `lang` attribute and the feeds). */
export const LANGUAGE = 'en'

/** Posts per index page. */
export const PAGE_SIZE = 10
