/**
 * Centralized branding configuration.
 *
 * To replace the logo:
 *   1. Replace public/logo.svg with your custom SVG (32x32 viewBox recommended)
 *   2. Run: npm run generate-icons
 *   This regenerates favicon, PWA icons, splash screens, OG image, and
 *   HTML meta tags (description, theme-color, OG/Twitter tags) — 12 files total.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Groundwork'

/** One-line product promise (Landing hero, auth subtitle, OG tags). */
export const APP_TAGLINE = 'Run the job from groundbreaking to closeout'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'Construction project management with daily logs, punch lists, RFIs, subcontractors, and per-project photo documentation.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#c2410c'
