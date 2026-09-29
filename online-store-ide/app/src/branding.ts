/* =============================================================================
 * APP BRANDING — this file is the single source of truth for this app's identity.
 *
 * APP_NAME / APP_DESCRIPTION / BRAND_COLOR below drive the browser-tab <title>,
 * the social + PWA meta tags, the generated logo/icons, and the package.json
 * name + description — all were derived FROM this file at scaffold time. That
 * sync ran once, at scaffold time: after it, a rename edits the values here AND
 * the copies below, which do not re-read this file at runtime:
 *   • app/index.html <title> + og/twitter/apple title  ← APP_NAME
 *     ...description meta + theme-color meta            ← APP_DESCRIPTION / BRAND_COLOR
 *   • root/app/api package.json name + description      ← synced from here + project name
 *   • app/src/locales/<lang>/ui.ts strings              → prefer t('app.name', …)
 *     over a literal product name so a rename here flows through every locale
 * After changing BRAND_COLOR or replacing public/logo.svg, run:
 *   npm run generate-icons   (rebuilds favicon, PWA icons, splash, OG, + HTML meta)
 * ============================================================================= */
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
export const APP_NAME = 'Bazaar'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'Shopify-like storefront with product catalog, cart, checkout, and inventory management'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#16a34a'
