/**
 * The site's identity: its name, description and color. Every page title, the
 * header, the feeds, the sitemap and llms.txt read these at build time, so a
 * change here reaches the whole site on the next build.
 *
 * Keep each value on ONE line — the platform rewrites these lines when the
 * project is renamed.
 */

/** Display name (header, page titles, feeds). */
export const APP_NAME = 'Field Notes'

/** One sentence about the site (front page, meta description, feeds, llms.txt). */
export const APP_DESCRIPTION = 'Notes on building software, published from markdown files.'

/** Primary brand color (the browser's theme-color). The page colors are tokens in public/styles.css. */
export const BRAND_COLOR = '#2f5d8a'

/** Your public website URL, if this site is not it. Leave empty if none. */
export const WEBSITE_URL = ''

/** Logo size in pixels, if you add a logo to the header. */
export const LOGO_SIZE = 30
