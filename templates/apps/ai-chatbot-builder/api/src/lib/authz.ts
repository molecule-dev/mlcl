/**
 * Authorization helpers for ai-chatbot-builder.
 *
 * Every bot-scoped resource (intents, conversations, knowledge_documents,
 * channel_connections, etc.) must be reachable only by the bot's owner.
 * Use these helpers in every handler that derives a row from a path
 * parameter — they replace bare `findById` lookups with ownership-checked
 * variants and return discriminated results so handlers can branch on
 * 404 vs. 403 without leaking existence information.
 *
 * Per CLAUDE.md / mlcl-CLAUDE.md "no IDOR" rule (G6) we standardize on
 * 404-for-non-owner so an attacker cannot probe bot existence.
 */

import { findById } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a bot by id and verify the caller owns it. Returns the bot row
 * on success, or `{ ok: false, status: 404 }` when the bot is missing OR
 * owned by a different user.
 */
export async function requireBotOwnership<
  T extends { owner_id?: unknown } = Record<string, unknown>,
>(botId: string, userId: string): Promise<AuthzResult<T>> {
  const bot = await findById<T>('bots', botId)
  if (!bot) return { ok: false, status: 404 }
  if (String((bot as { owner_id?: unknown }).owner_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row: bot }
}

/**
 * Look up a row by id and verify the caller owns it via the `user_id`
 * column. Used for per-user resources like notifications where the
 * recipient is identified by `user_id` rather than `owner_id`.
 */
export async function requireUserOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(table: string, id: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, id)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}

/**
 * Resolve a child row (intent / knowledge_document / channel_connection /
 * api_token / etc.) and verify its parent bot is owned by the caller.
 */
export async function requireBotChildOwnership<
  T extends { bot_id?: unknown } = Record<string, unknown>,
>(table: string, childId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, childId)
  if (!row) return { ok: false, status: 404 }
  const botId = (row as { bot_id?: unknown }).bot_id
  if (!botId) return { ok: false, status: 404 }
  const owns = await requireBotOwnership(String(botId), userId)
  if (!owns.ok) return owns
  return { ok: true, row }
}
