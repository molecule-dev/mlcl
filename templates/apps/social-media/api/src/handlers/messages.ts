import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { buildAuthor } from '../lib/enrich-posts.js'

const router = Router()

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

const createThreadSchema = z.object({
  user_id: z.string().uuid(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  media_url: z.string().nullable().optional(),
})

router.get('/threads', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const threadsA = await findMany<{
      id: string
      user_a_id: string
      user_b_id: string
      last_message_at: Date | string
      created_at: Date | string
    }>('dm_threads', {
      where: [{ field: 'user_a_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_message_at', direction: 'desc' }],
    })
    const threadsB = await findMany<{
      id: string
      user_a_id: string
      user_b_id: string
      last_message_at: Date | string
      created_at: Date | string
    }>('dm_threads', {
      where: [{ field: 'user_b_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_message_at', direction: 'desc' }],
    })
    const merged = [...threadsA, ...threadsB].sort((a, b) => {
      const ad = new Date(String(a.last_message_at)).getTime()
      const bd = new Date(String(b.last_message_at)).getTime()
      return bd - ad
    })
    if (merged.length === 0) return res.json([])
    const otherIds = Array.from(
      new Set(merged.map((t) => (t.user_a_id === userId ? t.user_b_id : t.user_a_id))),
    )
    const otherUsers = await findMany<{
      id: string
      username: string | null
      name: string | null
      email: string | null
    }>('users', {
      where: [{ field: 'id', operator: 'in', value: otherIds }],
      limit: otherIds.length,
    })
    const userMap = new Map(otherUsers.map((u) => [u.id, u]))
    const enriched = await Promise.all(
      merged.map(async (thread) => {
        const otherId = thread.user_a_id === userId ? thread.user_b_id : thread.user_a_id
        const otherUser = userMap.get(otherId) ?? {
          id: otherId,
          username: null,
          name: null,
          email: null,
        }
        const lastMessages = await findMany<{
          content: string
          created_at: Date | string
          sender_id: string
        }>('dm_messages', {
          where: [{ field: 'dm_thread_id', operator: '=', value: thread.id }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
          limit: 1,
        })
        const lastMessage = lastMessages[0]
        return {
          id: thread.id,
          with: buildAuthor(otherUser),
          last_message: lastMessage?.content ?? '',
          last_message_at:
            thread.last_message_at instanceof Date
              ? thread.last_message_at.toISOString()
              : String(thread.last_message_at),
          last_message_by: lastMessage?.sender_id === userId ? 'me' : 'them',
          unread_count: 0,
          is_typing: false,
          is_online: false,
        }
      }),
    )
    res.json(enriched)
  } catch (err) {
    logger.error('messages.getThreads', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/threads', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = createThreadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const otherUserId = parsed.data.user_id
    if (otherUserId === userId) {
      return res
        .status(400)
        .json({ error: t('messages.selfForbidden', {}, { defaultValue: 'Cannot DM yourself' }) })
    }
    const otherUser = await findById('users', otherUserId)
    if (!otherUser) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const [a, b] = pairKey(userId, otherUserId)
    const existing = await findOne('dm_threads', [
      { field: 'user_a_id', operator: '=', value: a },
      { field: 'user_b_id', operator: '=', value: b },
    ])
    if (existing) {
      return res.json(existing)
    }
    const result = await create('dm_threads', {
      user_a_id: a,
      user_b_id: b,
      last_message_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('messages.postThreads', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/threads/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const threadId = getParamId(req)
    const thread = await findById<Record<string, unknown>>('dm_threads', threadId)
    if (!thread) {
      return res
        .status(404)
        .json({ error: t('messages.threadNotFound', {}, { defaultValue: 'Thread not found' }) })
    }
    if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
      return res
        .status(403)
        .json({ error: t('messages.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const messages = await findMany<{
      id: string
      sender_id: string
      content: string
      created_at: Date | string
      seen_at: Date | string | null
    }>('dm_messages', {
      where: [{ field: 'dm_thread_id', operator: '=', value: threadId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit,
      offset,
    })
    res.json(
      messages.map((m) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        from_me: m.sender_id === userId,
        sent_at: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at),
        seen_at: m.seen_at instanceof Date ? m.seen_at.toISOString() : (m.seen_at ?? null),
      })),
    )
  } catch (err) {
    logger.error('messages.getThreadMessages', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/threads/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const threadId = getParamId(req)
    const thread = await findById<Record<string, unknown>>('dm_threads', threadId)
    if (!thread) {
      return res
        .status(404)
        .json({ error: t('messages.threadNotFound', {}, { defaultValue: 'Thread not found' }) })
    }
    if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
      return res
        .status(403)
        .json({ error: t('messages.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const parsed = sendMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const result = await create('dm_messages', {
      dm_thread_id: threadId,
      sender_id: userId,
      content: parsed.data.content,
      media_url: parsed.data.media_url ?? null,
      created_at: new Date(),
    })
    await updateById('dm_threads', threadId, { last_message_at: new Date() })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('messages.postThreadMessages', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/messages/:id/seen', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const message = await findById<Record<string, unknown>>('dm_messages', id)
    if (!message) {
      return res
        .status(404)
        .json({ error: t('messages.notFound', {}, { defaultValue: 'Message not found' }) })
    }
    const thread = await findById<Record<string, unknown>>(
      'dm_threads',
      message.dm_thread_id as string,
    )
    if (!thread || (thread.user_a_id !== userId && thread.user_b_id !== userId)) {
      return res
        .status(403)
        .json({ error: t('messages.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    if (message.sender_id === userId) {
      return res.json(message)
    }
    const result = await updateById('dm_messages', id, { seen_at: new Date() })
    res.json(result.data)
  } catch (error) {
    logger.error('messages.postMessageSeen', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
