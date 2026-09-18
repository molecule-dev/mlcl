/**
 * User preferences (Settings → Preferences), persisted to localStorage on this
 * device. Shared source of truth so the Settings editor, the Profile signature
 * preview, and the Compose page all read the same shape — previously each kept
 * its own copy, and Compose ignored the saved `defaultTone`/`signature` entirely.
 */
import type { Tone } from '../components/TonePillRow.js'

export interface PreferencesShape {
  /** Signature block appended to composed emails. */
  signature: string
  /** Tone the composer starts in / uses for AI drafts. */
  defaultTone: Tone
  autoSummarize: boolean
  confirmBeforeSend: boolean
  integrations: Record<string, boolean>
}

export const PREFERENCES_STORAGE_KEY = 'ai-email-composer:preferences'

export const DEFAULT_PREFERENCES: PreferencesShape = {
  signature: '',
  defaultTone: 'persuasive',
  autoSummarize: true,
  confirmBeforeSend: true,
  integrations: {},
}

/** Parse a stored preferences blob, filling any missing field with its default. */
export function parsePreferences(raw: string | null | undefined): PreferencesShape {
  if (!raw) return { ...DEFAULT_PREFERENCES }
  try {
    const parsed = JSON.parse(raw) as Partial<PreferencesShape>
    return {
      signature: parsed.signature ?? DEFAULT_PREFERENCES.signature,
      defaultTone: (parsed.defaultTone as Tone | undefined) ?? DEFAULT_PREFERENCES.defaultTone,
      autoSummarize: parsed.autoSummarize ?? DEFAULT_PREFERENCES.autoSummarize,
      confirmBeforeSend: parsed.confirmBeforeSend ?? DEFAULT_PREFERENCES.confirmBeforeSend,
      integrations: parsed.integrations ?? DEFAULT_PREFERENCES.integrations,
    }
  } catch (_error) {
    // corrupted JSON — fall back to defaults.
    return { ...DEFAULT_PREFERENCES }
  }
}

/** Read the saved preferences from localStorage, falling back to defaults. */
export function loadPreferences(): PreferencesShape {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_PREFERENCES }
  return parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY))
}

/** Persist preferences to localStorage (no-op when unavailable). */
export function savePreferences(prefs: PreferencesShape): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
  } catch (_error) {
    // storage quota / private mode — ignore; UI still reflects current state.
  }
}
