/**
 * Centralized branding configuration for Simmer — the weekly meal planner.
 *
 * To replace the logo:
 *   1. Replace public/logo.svg with your custom SVG (32x32 viewBox recommended)
 *   2. Run: npm run generate-icons
 *   This regenerates favicon, PWA icons, splash screens, OG image, and
 *   HTML meta tags (description, theme-color, OG/Twitter tags) — 12 files total.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Simmer'

/** Brand tagline shown alongside the wordmark. */
export const APP_TAGLINE = 'Cook less. Plan once.'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION = 'A recipe box that plans your week and writes your grocery list.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#15803d'
