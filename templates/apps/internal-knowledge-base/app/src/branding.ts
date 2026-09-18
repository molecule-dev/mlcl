/**
 * Centralized branding configuration for Compendium — the internal knowledge
 * base. Every user-facing brand surface (Header, auth pages, PWA manifest,
 * OG tags, index.html) must render from these constants.
 *
 * The visual identity keeps the trail-marker metaphor (a cairn is a stack of
 * stones marking the path) — durable, findable knowledge future teammates can
 * navigate by. Internal component names keep the historical `Cairn*` prefix;
 * the user-facing brand name is Compendium.
 */

/** Display name (Header, auth pages, PWA manifest, OG tags). */
export const APP_NAME = 'Compendium'

/** Marketing tagline shown on landing + auth brand panel. */
export const APP_TAGLINE = 'Stack knowledge, find your way'

/** Logo size in pixels (Header, auth pages). */
export const LOGO_SIZE = 30

/** Your app's public website URL (e.g. your marketing site). Leave empty if none. */
export const WEBSITE_URL = ''

/** App description (PWA manifest, OG tags). */
export const APP_DESCRIPTION =
  'A durable internal knowledge base for runbooks, policies, and decisions.'

/** Primary brand color (PWA manifest, meta theme-color). */
export const BRAND_COLOR = '#0f766e'
