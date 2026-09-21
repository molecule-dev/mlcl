/* =============================================================================
 * APP BRANDING — this file is the single source of truth for this app's identity.
 *
 * APP_NAME / APP_DESCRIPTION / BRAND_COLOR below drive the browser-tab <title>,
 * the social + PWA meta tags, the generated logo/icons, and the package.json
 * name + description — all are derived FROM this file at scaffold time. To rename
 * or rebrand the app, edit the values here; do NOT hardcode the product name
 * anywhere else, because these places are regenerated and your edit would be lost:
 *   • app/index.html <title> + og/twitter/apple title  ← APP_NAME
 *     ...description meta + theme-color meta            ← APP_DESCRIPTION / BRAND_COLOR
 *     (synced at scaffold time on BOTH the flagship-template and custom paths)
 *   • root/app/api package.json name + description      ← synced from here + project name
 *   • app/src/locales/<lang>/ui.ts strings              → prefer t('app.name', …)
 *     over a literal product name so a rename here flows through every locale
 * After changing BRAND_COLOR or replacing public/logo.svg, run:
 *   npm run generate-icons   (rebuilds favicon, PWA icons, splash, OG, + HTML meta)
 * ============================================================================= */
/**
 * Centralized branding configuration.
 */

export const APP_NAME = 'Toolbelt'
export const APP_TAGLINE = 'Run every job from quote to cash'
export const LOGO_SIZE = 30
export const WEBSITE_URL = ''
export const APP_DESCRIPTION =
  'Field service management — quotes, dispatch, technicians, job checklists, and invoicing.'
export const BRAND_COLOR = '#1d4ed8'
