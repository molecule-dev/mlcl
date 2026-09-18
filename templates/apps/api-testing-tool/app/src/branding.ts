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
export const APP_NAME = 'Pylon'

/** Tagline / strapline used on Landing + auth pages. */
export const APP_TAGLINE = 'Fire requests, forge confidence'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'The lightning-fast API testing workbench built for engineers who live in terminals.'

/** Primary brand color (PWA manifest, meta theme-color). Matches theme.css --color-primary. */
export const BRAND_COLOR = '#6366f1'

/** Accent brand color (URL variables, secondary highlights). */
export const ACCENT_COLOR = '#a78bfa'

/** Default dark background for chrome surfaces. */
export const SURFACE_DARK = 'var(--color-background)'

/** Slightly elevated panel surface used inside hero / response cards. */
export const SURFACE_PANEL = 'var(--color-surface)'
