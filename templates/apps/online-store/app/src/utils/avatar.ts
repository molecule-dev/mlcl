import { BRAND_COLOR } from '../branding.js'

/**
 * Initials avatar for the signed-in user (brand-colored background).
 * Used everywhere a user avatar is rendered so the same account shows
 * the same identity across the storefront and admin chrome.
 *
 * @param name - Display name (or email) of the user; falls back to a
 *   generic glyph for signed-out visitors.
 * @returns URL of the generated initials avatar.
 */
export function avatarUrl(name?: string | null): string {
  const label = (name ?? '').trim() || 'U'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=${BRAND_COLOR.replace('#', '')}&color=fff`
}
