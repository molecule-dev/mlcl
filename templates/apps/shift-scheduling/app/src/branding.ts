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
export const APP_NAME = 'Shiftly'

/** Brand tagline used on auth shell and landing. */
export const APP_TAGLINE = 'Hourly teams, on shift'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'Shift scheduling for hourly teams — weekly rosters, availability windows, swap and drop approvals, open-shift claiming, and timesheet export.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#4f46e5'
