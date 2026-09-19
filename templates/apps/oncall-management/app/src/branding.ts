/**
 * Centralized branding configuration.
 *
 * To replace the logo:
 *   1. Replace public/logo.svg with your custom SVG (32x32 viewBox recommended)
 *   2. Run: npm run generate-icons
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Klaxon'

/** Short tagline shown under the app name on auth pages and the landing hero. */
export const APP_TAGLINE = 'Never miss a page'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'On-call rotations, escalation policies, and incident response with acknowledge/resolve workflow and postmortems.'

/** Primary brand color (PWA manifest, meta theme-color). Matches theme.css --color-primary. */
export const BRAND_COLOR = '#06b6d4'
