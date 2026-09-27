/**
 * Effective TTS voice resolution.
 *
 * The user picks a voice in Settings (persisted as
 * `oauthData.travelPreferences.voice`, default `'alloy'`). The clients send
 * `{ text }` only to `/speech/synthesize`, so the voice is resolved here,
 * server-side, from the stored preference; an explicit voice in the request
 * wins (handled by the caller).
 *
 * @module
 */

import { findById } from '@molecule/api-database'

const DEFAULT_VOICE = 'alloy'

function parseOauthData(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch (_error) {
      // malformed oauthData JSON — fall through to the default
    }
  }
  return null
}

/**
 * The voice a synthesize request should use when it did not name one: the
 * user's saved preference, else `'alloy'` (the Settings default).
 */
export async function resolvePreferredVoice(userId: string): Promise<string> {
  const user = await findById<Record<string, unknown>>('users', userId)
  const oauthData = parseOauthData(user?.oauthData)
  const prefs = oauthData?.travelPreferences as { voice?: unknown } | undefined
  const voice = prefs?.voice
  return typeof voice === 'string' && voice.trim().length > 0 ? voice : DEFAULT_VOICE
}
