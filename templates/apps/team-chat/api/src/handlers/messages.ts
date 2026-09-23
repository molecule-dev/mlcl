import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { PushSubscription } from '@molecule/api-push-notifications'
import { hasProvider as hasPushProvider, send as sendPush } from '@molecule/api-push-notifications'
import { broadcast } from '@molecule/api-realtime'
import { index, search as searchIndex } from '@molecule/api-search'

import { authorizeChannel, authorizeChannelForMessage, listMemberChannelIds } from '../lib/authz.js'
import type { TeamChatLimits } from '../tiers.js'

/** Enforce per-tier daily message cap: counts the user's messages created today. */
const enforceDailyMessageLimit = enforceLimit<TeamChatLimits>({
  limitType: 'maxMessagesPerDay',
  getLimit: (limits) => limits.maxMessagesPerDay,
  getCurrent: async (userId) => {
    const dayStartIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    return count('messages', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'created_at', operator: '>=', value: dayStartIso },
    ])
  },
}) as unknown as RequestHandler

const createSchema = z.object({
  channel_id: z.string().min(1),
  content: z.string().min(1).max(10000),
})

const updateSchema = z.object({
  content: z.string().min(1).max(10000),
})

const pinSchema = z.object({
  user_id: z.string().min(1).optional(),
})

const router = Router()

/**
 * A user's @-mention handle: the lowercased first token of their display
 * name (name → username → email). ONE derivation shared by the read-time
 * mentions feed (`GET /messages/mentions`) and the send-time push fan-out,
 * so "who was mentioned" can never drift between the two.
 */
const mentionHandleFor = (user: Record<string, unknown> | null | undefined): string => {
  const displayName =
    (user?.name as string | undefined) ||
    (user?.username as string | undefined) ||
    (user?.email as string | undefined) ||
    ''
  return (displayName.split(' ')[0] || '').toLowerCase()
}

/**
 * Web-push the @-mentioned channel members (send-time complement of the
 * read-time mentions feed): for every member of the channel other than the
 * author whose handle appears as `@handle` in the message content, push to
 * each of their subscribed devices. Best-effort throughout — a missing push
 * provider, an unsubscribed member, or a per-device send failure never
 * affects the message create (mirrors sports-league's fanoutPushToFavorites).
 */
async function fanoutMentionPush(params: {
  channelId: string
  channelName: string
  authorId: string
  content: string
}): Promise<void> {
  if (!hasPushProvider()) return
  try {
    const members = (await findMany('channel_members', {
      where: [{ field: 'channel_id', operator: '=', value: params.channelId }],
    })) as Record<string, unknown>[]
    const memberIds = Array.from(
      new Set(
        members
          .map((m) => m.user_id)
          .filter(
            (v): v is string =>
              typeof v === 'string' && v.length > 0 && v !== String(params.authorId),
          ),
      ),
    )
    if (memberIds.length === 0) return

    const users = (await findMany('users', {
      where: [{ field: 'id', operator: 'in', value: memberIds }],
      limit: memberIds.length,
    })) as Record<string, unknown>[]
    const author = (await findById('users', params.authorId)) as Record<string, unknown> | null
    const authorName =
      (author?.name as string | undefined) ||
      (author?.username as string | undefined) ||
      (author?.email as string | undefined) ||
      'Someone'

    const contentLower = params.content.toLowerCase()
    const payload = {
      title: t(
        'messages.mentionPushTitle',
        { name: authorName, channel: params.channelName },
        { defaultValue: `${authorName} mentioned you in #${params.channelName}` },
      ),
      body: params.content.length > 140 ? `${params.content.slice(0, 139)}…` : params.content,
      href: `/channels/${params.channelId}`,
    }

    for (const user of users) {
      const handle = mentionHandleFor(user)
      if (!handle || !contentLower.includes(`@${handle}`)) continue

      // The devices table uses camelCase columns ("userId"/"pushSubscription"),
      // unlike this app's snake_case chat tables.
      const devices = (await findMany('devices', {
        where: [{ field: 'userId', operator: '=', value: String(user.id) }],
      })) as Array<{ pushSubscription?: PushSubscription | null }>
      for (const device of devices) {
        if (!device.pushSubscription) continue
        try {
          await sendPush(device.pushSubscription, payload)
        } catch (error) {
          logger.error('messages.mentionPush send failed', error)
        }
      }
    }
  } catch (error) {
    logger.error('messages.mentionPush failed', error)
  }
}

/**
 * Enrich message rows with user_name (and user_avatar when present) so the
 * client can render author info without a follow-up round-trip per message.
 */
const hydrateUsers = async (
  messages: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const ids = Array.from(
    new Set(
      messages
        .map((m) => m.user_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  )
  if (ids.length === 0) return messages
  const users = (await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: ids }],
    limit: ids.length,
  })) as Record<string, unknown>[]
  const byId = new Map<string, Record<string, unknown>>()
  for (const u of users) byId.set(String(u.id), u)
  return messages.map((m) => {
    const u = byId.get(String(m.user_id))
    if (!u) return m
    return {
      ...m,
      user_name:
        (u.name as string | undefined) ||
        (u.username as string | undefined) ||
        (u.email as string | undefined),
      user_avatar: (u as Record<string, unknown>).avatar_url ?? null,
    }
  })
}

router.get('/', requireAuth, async (req, res) => {
  try {
    // Scope every read to channels the caller belongs to. A session alone is
    // NOT enough — without this gate any authenticated user could read another
    // channel's (or workspace's) messages just by passing its channel_id, and
    // the search branch would leak hits from channels they can't see (IDOR).
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    }
    const { channel_id, search, limit, pinned } = req.query
    if (search) {
      const results = await searchIndex('messages', { text: String(search) })
      const allowed = new Set(await listMemberChannelIds(userId))
      const docs = (results.hits.map((h) => h.document) as Record<string, unknown>[]).filter((d) =>
        allowed.has(String(d.channel_id)),
      )
      return res.json(await hydrateUsers(docs))
    }
    // Reads must always be scoped to a single channel the caller can access —
    // never dump every message when no channel scope is supplied.
    if (!channel_id) {
      return res.status(400).json({
        error: t('messages.channelRequired', undefined, {
          defaultValue: 'A channel_id query parameter is required',
        }),
      })
    }
    const auth = await authorizeChannel(req, res, { channelId: String(channel_id) })
    if (!auth) return
    const where: { field: string; operator: '='; value: unknown }[] = []
    where.push({ field: 'channel_id', operator: '=', value: channel_id })
    // Pinned-only filter: the channel page renders the pinned panel from
    // GET /api/messages?channel_id=:id&pinned=true. Without this branch the
    // panel would receive every message, defeating the panel's purpose and
    // shipping a "pinned" feature that's actually "all messages."
    if (pinned === 'true' || pinned === '1') {
      where.push({ field: 'is_pinned', operator: '=', value: true })
    }
    const messages = await findMany('messages', {
      where,
      limit: Number(limit) || 50,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(await hydrateUsers(messages as Record<string, unknown>[]))
  } catch (error) {
    logger.error('messages.list', error)
    res.status(500).json({
      error: t('messages.listError', undefined, { defaultValue: 'Failed to list messages' }),
    })
  }
})

/**
 * GET /messages/mentions — the @-mention feed that powers the notifications
 * page. Returns messages whose content contains `@<firstName>` of the caller,
 * scoped to the channels the caller belongs to (so a mention only surfaces from
 * a channel they can actually see). Declared BEFORE `/:id` so "mentions" is not
 * captured as a message id.
 */
router.get('/mentions', requireAuth, async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    }
    const me = (await findById('users', userId)) as Record<string, unknown> | null
    const handle = mentionHandleFor(me)
    // No resolvable handle (or no channels) ⇒ nobody can have @-mentioned us.
    const channelIds = await listMemberChannelIds(userId)
    if (!handle || channelIds.length === 0) {
      return res.json([])
    }
    // `ilike` is a case-insensitive contains match (the bond escapes wildcards
    // in the value and wraps it with %…%), so `@carol` matches "hey @Carol …".
    const mentions = await findMany('messages', {
      where: [
        { field: 'channel_id', operator: 'in', value: channelIds },
        { field: 'content', operator: 'ilike', value: `@${handle}` },
      ],
      limit: 100,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await hydrateUsers(mentions as Record<string, unknown>[]))
  } catch (error) {
    logger.error('messages.mentions', error)
    res.status(500).json({
      error: t('messages.mentionsError', undefined, { defaultValue: 'Failed to list mentions' }),
    })
  }
})

/**
 * GET /messages/recent — the dashboard's "recent messages" feed: the newest
 * messages across every channel the caller belongs to, each tagged with its
 * channel name so the client can render one row per message without N
 * follow-up requests. Declared BEFORE `/:id` so "recent" is not captured as
 * a message id. (The plain `GET /messages` route requires a `channel_id`
 * scope, so a dashboard-wide fetch has to go through this dedicated feed.)
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    }
    const channelIds = await listMemberChannelIds(userId)
    if (channelIds.length === 0) return res.json([])
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const recent = (await findMany('messages', {
      where: [{ field: 'channel_id', operator: 'in', value: channelIds }],
      limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as Record<string, unknown>[]
    if (recent.length === 0) return res.json([])
    const channelRows = (await findMany('channels', {
      where: [{ field: 'id', operator: 'in', value: channelIds }],
      limit: channelIds.length,
    })) as Record<string, unknown>[]
    const channelNames = new Map(channelRows.map((c) => [String(c.id), String(c.name ?? '')]))
    const hydrated = await hydrateUsers(recent)
    res.json(hydrated.map((m) => ({ ...m, channel_name: channelNames.get(String(m.channel_id)) })))
  } catch (error) {
    logger.error('messages.recent', error)
    res.status(500).json({
      error: t('messages.recentError', undefined, { defaultValue: 'Failed to list messages' }),
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Reading a single message requires membership of its channel, matching the
    // PUT/DELETE/pin routes. authorizeChannelForMessage 404s a missing message
    // (unchanged) and 403s a non-member; legitimate members still get the row.
    const auth = await authorizeChannelForMessage(req, res, req.params.id as string)
    if (!auth) return
    // Hydrate author name/avatar exactly like the list endpoint — without this
    // the thread page's parent message fell back to its sample author ("Alex
    // Chen") because the raw row carries only user_id.
    const [hydrated] = await hydrateUsers([auth.message as Record<string, unknown>])
    res.json(hydrated)
  } catch (error) {
    logger.error('messages.read', error)
    res.status(500).json({
      error: t('messages.readError', undefined, { defaultValue: 'Failed to read message' }),
    })
  }
})

router.post('/', requireAuth, enforceDailyMessageLimit, async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    // Only members of the target channel may post into it.
    const auth = await authorizeChannel(req, res, { channelId: parsed.data.channel_id })
    if (!auth) return
    // Archived channels are read-only: the archive endpoint sets is_archived, but posting never
    // checked it, so an "archived" channel still accepted new messages. Reject them.
    if ((auth.channel as Record<string, unknown>).is_archived === true) {
      return res.status(403).json({
        error: t('channel.archived', undefined, { defaultValue: 'This channel is archived' }),
      })
    }
    const result = await create('messages', {
      ...parsed.data,
      user_id: res.locals.session.userId,
      created_at: new Date().toISOString(),
    })
    const message = result.data
    if (message) {
      try {
        await index(
          'messages',
          String((message as Record<string, unknown>).id),
          message as Record<string, unknown>,
        )
      } catch (_error) {
        // index failure is non-fatal
      }
    }
    try {
      // Deliver to the message's channel room only — clients join
      // `channel:<channelId>` (see lib/realtime-guard.ts), never a global room.
      await broadcast(`channel:${parsed.data.channel_id}`, 'message:created', message)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    // Web-push any @-mentioned members' subscribed devices, alongside the
    // read-time mentions feed (GET /messages/mentions → /notifications page).
    // Best-effort: all failures are caught + logged inside the fan-out.
    await fanoutMentionPush({
      channelId: parsed.data.channel_id,
      channelName: String((auth.channel as Record<string, unknown>).name ?? ''),
      authorId: String(res.locals.session.userId),
      content: parsed.data.content,
    })
    res.status(201).json(message)
  } catch (error) {
    logger.error('messages.create', error)
    res.status(500).json({
      error: t('messages.createError', undefined, { defaultValue: 'Failed to create message' }),
    })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    // Must be a member of the message's channel, and only the author or a
    // channel admin may edit a message.
    const auth = await authorizeChannelForMessage(req, res, req.params.id as string)
    if (!auth) return
    if (String(auth.message.user_id) !== String(getUserId(res)) && !auth.isAdmin) {
      return res.status(403).json({
        error: t('messages.forbidden', undefined, {
          defaultValue: 'You can only edit your own messages',
        }),
      })
    }
    const result = await updateById('messages', req.params.id as string, {
      content: parsed.data.content,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    }
    try {
      await index('messages', req.params.id as string, result.data as Record<string, unknown>)
    } catch (_error) {
      // index failure is non-fatal
    }
    try {
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'message:updated', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('messages.update', error)
    res.status(500).json({
      error: t('messages.updateError', undefined, { defaultValue: 'Failed to update message' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Must be a member of the message's channel, and only the author or a
    // channel admin may delete a message.
    const auth = await authorizeChannelForMessage(req, res, req.params.id as string)
    if (!auth) return
    if (String(auth.message.user_id) !== String(getUserId(res)) && !auth.isAdmin) {
      return res.status(403).json({
        error: t('messages.forbidden', undefined, {
          defaultValue: 'You can only delete your own messages',
        }),
      })
    }
    await deleteById('messages', req.params.id as string)
    try {
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'message:deleted', {
        id: req.params.id,
      })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(204).end()
  } catch (error) {
    logger.error('messages.delete', error)
    res.status(500).json({
      error: t('messages.deleteError', undefined, { defaultValue: 'Failed to delete message' }),
    })
  }
})

router.post('/:id/pin', requireAuth, async (req, res) => {
  const parsed = pinSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannelForMessage(req, res, req.params.id as string)
    if (!auth) return
    const result = await updateById('messages', req.params.id as string, {
      is_pinned: true,
      pinned_at: new Date().toISOString(),
      pinned_by: res.locals.session.userId,
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    }
    try {
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'message:pinned', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('messages.pin', error)
    res
      .status(500)
      .json({ error: t('messages.pinError', undefined, { defaultValue: 'Failed to pin message' }) })
  }
})

router.post('/:id/unpin', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannelForMessage(req, res, req.params.id as string)
    if (!auth) return
    const result = await updateById('messages', req.params.id as string, {
      is_pinned: false,
      pinned_at: null,
      pinned_by: null,
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    }
    try {
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'message:unpinned', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('messages.unpin', error)
    res.status(500).json({
      error: t('messages.unpinError', undefined, { defaultValue: 'Failed to unpin message' }),
    })
  }
})

export default router
