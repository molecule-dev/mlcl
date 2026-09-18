/**
 * Channel authorization helpers for team-chat.
 *
 * Every channel-scoped mutation (rename/delete/archive a channel, post or
 * edit messages, manage members, react, reply in threads) must verify the
 * caller actually belongs to the channel — a session alone is NOT enough.
 * Without this gate any authenticated user (including someone in a different
 * workspace) could mutate a channel they can't see just by guessing its id
 * (classic IDOR / multi-tenant break).
 *
 * `authorizeChannel` resolves the channel, confirms the caller is a member,
 * and reports whether they are an admin (channel creator OR a
 * `channel_members.role === 'admin'` row). Handlers call it at the top of a
 * mutating route and bail when it returns null — the helper has already
 * written the correct 401/403/404 response.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/** A row from the `channels` table (only the fields authz cares about). */
export interface ChannelRow {
  id: string
  created_by?: unknown
  is_private?: unknown
  [key: string]: unknown
}

/** Successful channel-authorization result. */
export interface ChannelAuthz {
  /** The resolved channel row. */
  channel: ChannelRow
  /** The caller's `channel_members` row, if any. */
  membership: Record<string, unknown> | null
  /** True when the caller created the channel OR holds the `admin` role. */
  isAdmin: boolean
}

/** Options for {@link authorizeChannel}. */
export interface AuthorizeChannelOptions {
  /** Require the caller be a channel admin (creator or `role === 'admin'`). */
  requireAdmin?: boolean
  /** Channel id to authorize against. Defaults to the `:id` route param. */
  channelId?: string
}

/**
 * List the ids of every channel the given user is a member of. Used to scope
 * channel listings/search so a caller can only enumerate channels they belong
 * to (closes the enumeration half of the IDOR).
 *
 * @param userId - The authenticated user's id.
 * @returns The channel ids the user is a member of.
 */
export async function listMemberChannelIds(userId: string): Promise<string[]> {
  const rows = (await findMany('channel_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })) as Record<string, unknown>[]
  return rows
    .map((r) => r.channel_id)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/**
 * Authorize the caller against a channel. Writes the appropriate error
 * response and returns null when authorization fails, so callers do
 * `const auth = await authorizeChannel(req, res); if (!auth) return`.
 *
 * - 401 when there is no session.
 * - 404 when the channel does not exist (also avoids the silent-204 delete bug).
 * - 403 when the caller is not a member of the channel.
 * - 403 when `requireAdmin` is set and the caller is not an admin.
 *
 * @param req - The Express request (route param `:id` is the channel id by default).
 * @param res - The Express response (an error is written on failure).
 * @param opts - Optional admin requirement and/or explicit channel id.
 * @returns The channel + membership + admin flag, or null when denied.
 */
export async function authorizeChannel(
  req: Request,
  res: Response,
  opts: AuthorizeChannelOptions = {},
): Promise<ChannelAuthz | null> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
    })
    return null
  }

  const channelId = opts.channelId ?? getParamId(req)
  const channel = (await findById('channels', channelId)) as ChannelRow | null
  if (!channel) {
    res.status(404).json({
      error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }),
    })
    return null
  }

  const members = (await findMany('channel_members', {
    where: [
      { field: 'channel_id', operator: '=', value: channelId },
      { field: 'user_id', operator: '=', value: userId },
    ],
  })) as Record<string, unknown>[]
  const membership = members[0] ?? null
  // The creator always has access, even on legacy channels that predate the
  // "creator is auto-added as an admin member" behavior (no channel_members row).
  const isCreator = String(channel.created_by) === String(userId)
  if (!membership && !isCreator) {
    res.status(403).json({
      error: t('channels.forbidden', undefined, {
        defaultValue: 'You do not have access to this channel',
      }),
    })
    return null
  }

  const isAdmin = isCreator || membership?.role === 'admin'
  if (opts.requireAdmin && !isAdmin) {
    res.status(403).json({
      error: t('channels.adminRequired', undefined, {
        defaultValue: 'Only channel admins can perform this action',
      }),
    })
    return null
  }

  return { channel, membership, isAdmin }
}

/**
 * Authorize the caller against the channel that owns a given message. Resolves
 * the message first (404 if missing), then delegates to {@link authorizeChannel}
 * against the message's `channel_id`. Used by message/reaction/thread handlers
 * so the same channel-membership gate covers everything posted inside a channel.
 *
 * @param req - The Express request.
 * @param res - The Express response (an error is written on failure).
 * @param messageId - The id of the message whose channel gates the action.
 * @param opts - Optional admin requirement.
 * @returns The channel authz result plus the resolved message, or null when denied.
 */
export async function authorizeChannelForMessage(
  req: Request,
  res: Response,
  messageId: string,
  opts: { requireAdmin?: boolean } = {},
): Promise<(ChannelAuthz & { message: Record<string, unknown> }) | null> {
  const message = (await findById('messages', messageId)) as Record<string, unknown> | null
  if (!message) {
    res.status(404).json({
      error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }),
    })
    return null
  }
  const auth = await authorizeChannel(req, res, {
    requireAdmin: opts.requireAdmin,
    channelId: String(message.channel_id),
  })
  if (!auth) return null
  return { ...auth, message }
}
