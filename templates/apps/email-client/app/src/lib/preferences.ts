/**
 * Client-side listener preferences (Settings page), persisted to localStorage.
 *
 * Single source of truth for the prefs blob so consumers other than Settings
 * (e.g. Compose, which appends the saved signature) read the same key + shape.
 */

export interface PreferenceState {
  desktop_notifications: boolean
  sounds: boolean
  compact: boolean
  preview: boolean
  send_later: boolean
  signature: string
}

export const DEFAULT_PREFS: PreferenceState = {
  desktop_notifications: true,
  sounds: false,
  compact: false,
  preview: true,
  send_later: false,
  signature: '',
}

export const PREFS_KEY = 'meridian:settings:v1'

/** Read the stored preferences, falling back to defaults when unset/corrupted. */
export function readPrefs(): PreferenceState {
  if (typeof globalThis.localStorage === 'undefined') return DEFAULT_PREFS
  try {
    const raw = globalThis.localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<PreferenceState>) }
  } catch (_error) {
    // corrupted JSON in localStorage — fall back to defaults
    return DEFAULT_PREFS
  }
}

/** Persist the preferences blob. No-op when localStorage is unavailable (SSR/tests). */
export function writePrefs(prefs: PreferenceState): void {
  if (typeof globalThis.localStorage === 'undefined') return
  globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

/**
 * Compose an initial message body with the user's saved signature applied.
 *
 * The signature is inserted at the top (where the user types), above any quoted
 * reply/forward block, so a sent message reads: [your text] → signature →
 * quoted original. Returns the base body unchanged when no signature is set.
 * Never call this on a loaded draft — a draft's body already contains whatever
 * signature it was composed with, so re-applying would duplicate it.
 */
export function withSignature(baseBody: string, signature: string): string {
  const sig = signature.trim()
  if (!sig) return baseBody
  return `\n\n${sig}${baseBody}`
}
