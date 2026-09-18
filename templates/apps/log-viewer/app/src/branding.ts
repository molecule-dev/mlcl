/**
 * Centralized branding configuration.
 *
 * Brand identity and copy live here so that auth pages, the sidebar shell,
 * the marketing landing, and the PWA manifest all reference one source of
 * truth. Visual tokens (colors, fonts, spacing) live in `theme.css`.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Signalink'

/** Marketing-grade tagline. */
export const APP_TAGLINE = 'Every signal, instantly traced.'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION = 'Search, trace, and triage logs across every service in real time.'

/** Primary brand color (PWA manifest, meta theme-color). Matches theme.css `--color-primary`. */
export const BRAND_COLOR = '#22d3ee'
