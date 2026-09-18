/**
 * Effective TTS voice resolution.
 *
 * The user picks a voice in Settings (persisted as `oauthData.voicePreferences.voice`,
 * default `'alloy'`) and an agent can carry its own `voice_id`, but the
 * `/speech/synthesize` calls sent `{ text }` only — so neither the chosen voice nor
 * the agent voice ever reached the provider, which always fell back to its built-in
 * default. This resolves the effective voice server-side from the request context so
 * both the conversation and the detail playback honor the stored pick.
 *
 * Resolution order: an explicit voice in the request wins (handled by the caller); then
 * the bound agent's `voice_id` (when the conversation is owned by the requester and its
 * agent has one); then the user's preference voice, defaulting to `'alloy'` to match the
 * Settings default the UI shows.
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

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/**
 * The voice the user's stored preference resolves to — their configured
 * `oauthData.voicePreferences.voice`, or `'alloy'` (the Settings default) when unset.
 */
async function preferenceVoice(userId: string): Promise<string> {
  const user = await findById<Record<string, unknown>>('users', userId)
  const oauthData = parseOauthData(user?.oauthData)
  const prefs = oauthData?.voicePreferences as { voice?: unknown } | undefined
  return nonEmptyString(prefs?.voice) ?? DEFAULT_VOICE
}

/**
 * The effective TTS voice for a synthesize request: the bound agent's `voice_id`
 * (when `conversationId` names an agent-bound conversation owned by `userId`), else the
 * user's preference voice. Never returns empty — callers use it only when the request
 * itself did not specify a voice.
 */
export async function resolvePreferredVoice(
  userId: string,
  conversationId?: string,
): Promise<string> {
  if (conversationId) {
    const conversation = await findById<Record<string, unknown>>('conversations', conversationId)
    // Scope by owner (IDOR): only the requester's own conversation may select an agent voice.
    if (conversation && conversation.user_id === userId && conversation.agent_id) {
      const agent = await findById<Record<string, unknown>>('agents', String(conversation.agent_id))
      if (agent && agent.user_id === userId) {
        const agentVoice = nonEmptyString(agent.voice_id)
        if (agentVoice) return agentVoice
      }
    }
  }
  return preferenceVoice(userId)
}
