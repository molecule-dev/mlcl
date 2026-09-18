/**
 * Centralized branding configuration.
 *
 * To replace the logo:
 *   1. Replace public/logo.svg with your custom SVG (32x32 viewBox recommended)
 *   2. Run: npm run generate-icons
 *   This regenerates favicon, PWA icons, splash screens, OG image, and
 *   HTML meta tags — 12 files total.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Arbor'

/** Brand tagline used on auth shell and landing. */
export const APP_TAGLINE = 'Where talent takes root'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'A calm, considerate HR system for growing teams — employees, PTO, org chart, and documents in one source of truth.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#0d9488'
