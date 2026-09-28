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
export const APP_NAME = 'Parcela'

/** Brand tagline used on auth screens and Landing hero. */
export const APP_TAGLINE = 'Every page, understood'

/** Brand sub-line used in sidebar and landing eyebrow. */
export const APP_EYEBROW = 'Digital Archivist'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'OCR + AI extraction, classification, and filing for invoices, receipts, contracts, and forms.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#005454'

/** Linear gradient used by hero cards and primary CTA.
 *  Digital Archivist teal — all stops keep white text ≥7:1. */
export const BRAND_GRADIENT = 'linear-gradient(135deg, #005454, #0d6e6e 60%, #084d4d)'
