/**
 * Centralized branding configuration.
 * Edit this file to customize your app's brand identity.
 *
 * To replace the logo:
 *   1. Replace public/logo.svg with your custom SVG (32x32 viewBox recommended)
 *   2. Run: npm run generate-icons
 *   This regenerates favicon, PWA icons, splash screens, OG image, and
 *   HTML meta tags (description, theme-color, OG/Twitter tags) — 12 files total.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Turnstile'

/** Tagline (auth headers, landing hero, OG tags). */
export const APP_TAGLINE = 'Every moment, front row'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'Discover concerts, festivals, and conferences. Buy tickets, scan QR codes, and host unforgettable events.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#6d28d9'

/** Hero gradient endpoints — violet → indigo (per DESIGN.md). */
export const HERO_GRADIENT_START = '#6d28d9'
export const HERO_GRADIENT_END = '#312e81'

/** Accent (rose/coral) — date badges, on-sale chips. */
export const ACCENT_COLOR = '#f43f5e'
