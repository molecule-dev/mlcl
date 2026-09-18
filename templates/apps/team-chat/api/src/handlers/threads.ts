import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, requireAuth } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { authorizeChannel, authorizeChannelForMessage } from '../lib/authz.js'
import type { TeamChatLimits } from '../tiers.js'

// Thread replies need the same author hydration that messages get; without it
// the UI renders every reply as a generic "User" no matter who actually wrote it.
const hydrateUsers = async (
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const ids = Array.from(
    new Set(
      rows.map((r) => r.user_id).filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  )
  if (ids.length === 0) return rows
  const users = (await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: ids }],
    limit: ids.length,
  })) as Record<string, unknown>[]
  const byId = new Map<string, Record<string, unknown>>()
  for (const u of users) byId.set(String(u.id), u)
  return rows.map((r) => {
    const u = byId.get(String(r.user_id))
    if (!u) return r
    return {
      ...r,
      user_name:
        (u.name as string | undefined) ||
        (u.username as string | undefined) ||
        (u.email as string | undefined),
      user_avatar: (u as Record<string, unknown>).avatar_url ?? null,
    }
  })
}

/**
 * Threads are a Pro+ feature. Free-tier `threadsEnabled` is `false`, so we
 * model the boolean as a numeric limit of 0 (current=1) which `enforceLimit`
 * blocks with 403. Pro / Team return `Infinity` so the same check passes.
 */
const requireThreadsEnabled = enforceLimit<TeamChatLimits>({
  limitType: 'threadsEnabled',
  getLimit: (limits) => (limits.threadsEnabled ? Number.POSITIVE_INFINITY : 0),
  getCurrent: () => 1,
}) as unknown as RequestHandler

const createReplySchema = z.object({
  content: z.string().min(1).max(10000),
})

const updateReplySchema = z.object({
  content: z.string().min(1).max(10000),
})

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const { message_id, channel_id } = req.query
    // Thread content is channel-scoped: require a scope and verify the caller
    // belongs to it. A session alone is NOT enough — without this gate any
    // authenticated user could read another channel's thread replies (or, with
    // no scope, dump every reply in the table). The thread UI always fetches
    // replies scoped to a specific message/channel it already has access to.
    if (message_id) {
      const auth = await authorizeChannelForMessage(req, res, String(message_id))
      if (!auth) return
    } else if (channel_id) {
      const auth = await authorizeChannel(req, res, { channelId: String(channel_id) })
      if (!auth) return
    } else {
      return res.status(400).json({
        error: t('threads.scopeRequired', undefined, {
          defaultValue: 'A message_id or channel_id query parameter is required',
        }),
      })
    }
    const where: { field: string; operator: '='; value: unknown }[] = []
    if (message_id) where.push({ field: 'parent_message_id', operator: '=', value: message_id })
    if (channel_id) where.push({ field: 'channel_id', operator: '=', value: channel_id })
    const replies = (await findMany('thread_replies', { where })) as Record<string, unknown>[]
    res.json(await hydrateUsers(replies))
  } catch (error) {
    logger.error('threads.list', error)
    res.status(500).json({
      error: t('threads.listError', undefined, { defaultValue: 'Failed to list thread replies' }),
    })
  }
})

router.get('/:messageId/replies', requireAuth, async (req, res) => {
  try {
    // Only members of the parent message's channel may read its thread.
    const auth = await authorizeChannelForMessage(req, res, getParamId(req, 'messageId'))
    if (!auth) return
    const replies = (await findMany('thread_replies', {
      where: [{ field: 'parent_message_id', operator: '=', value: req.params.messageId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })) as Record<string, unknown>[]
    res.json(await hydrateUsers(replies))
  } catch (error) {
    logger.error('threads.listReplies', error)
    res.status(500).json({
      error: t('threads.listError', undefined, { defaultValue: 'Failed to list thread replies' }),
    })
  }
})

router.post('/:messageId/replies', requireAuth, requireThreadsEnabled, async (req, res) => {
  const parsed = createReplySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    // Must be a member of the parent message's channel to reply in its thread.
    const auth = await authorizeChannelForMessage(req, res, req.params.messageId as string)
    if (!auth) return
    // Archived channels are read-only — a thread reply is new content, so reject
    // it (mirrors the message-post gate in messages.ts).
    if ((auth.channel as Record<string, unknown>).is_archived === true) {
      return res.status(403).json({
        error: t('channel.archived', undefined, { defaultValue: 'This channel is archived' }),
      })
    }
    const parentMessage = auth.message

    const result = await create('thread_replies', {
      ...parsed.data,
      parent_message_id: req.params.messageId,
      user_id: res.locals.session.userId,
      created_at: new Date().toISOString(),
    })

    await updateById('messages', req.params.messageId as string, {
      reply_count: (((parentMessage as Record<string, unknown>).reply_count as number) || 0) + 1,
      last_reply_at: new Date().toISOString(),
    })

    const [hydrated] = await hydrateUsers([result.data as Record<string, unknown>])
    try {
      // The thread lives in its parent message's channel — deliver to that
      // channel's room (clients join `channel:<channelId>`).
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'thread:reply', {
        ...hydrated,
        parent_message_id: req.params.messageId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(201).json(hydrated)
  } catch (error) {
    logger.error('threads.create', error)
    res.status(500).json({
      error: t('threads.createError', undefined, { defaultValue: 'Failed to create reply' }),
    })
  }
})

router.put('/replies/:id', requireAuth, async (req, res) => {
  const parsed = updateReplySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const reply = (await findById('thread_replies', req.params.id as string)) as Record<
      string,
      unknown
    > | null
    if (!reply) {
      return res
        .status(404)
        .json({ error: t('threads.replyNotFound', undefined, { defaultValue: 'Reply not found' }) })
    }
    // Must be a member of the reply's channel, and only the author or a channel
    // admin may edit a reply.
    const auth = await authorizeChannelForMessage(req, res, String(reply.parent_message_id))
    if (!auth) return
    if (String(reply.user_id) !== String(getUserId(res)) && !auth.isAdmin) {
      return res.status(403).json({
        error: t('threads.forbidden', undefined, {
          defaultValue: 'You can only edit your own replies',
        }),
      })
    }
    const result = await updateById('thread_replies', req.params.id as string, {
      content: parsed.data.content,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('threads.replyNotFound', undefined, { defaultValue: 'Reply not found' }) })
    }
    const [hydrated] = await hydrateUsers([result.data as Record<string, unknown>])
    try {
      await broadcast(
        `channel:${String(auth.message.channel_id)}`,
        'thread:reply:updated',
        hydrated,
      )
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(hydrated)
  } catch (error) {
    logger.error('threads.update', error)
    res.status(500).json({
      error: t('threads.updateError', undefined, { defaultValue: 'Failed to update reply' }),
    })
  }
})

export default router
