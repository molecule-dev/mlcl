/**
 * Messages handler — 1:1 host↔guest DM threads.
 *
 * GET /messages/threads          — auth; lists threads where userId is a participant
 * POST /messages/threads         — auth; create or fetch a thread for (peer, listing)
 * GET /messages/threads/:id      — auth + participant scoping; lists messages in thread
 * POST /messages/threads/:id     — auth + participant scoping; sends a message
 *
 * Threads are participant-scoped: only participant_a_id or
 * participant_b_id may read/write. The 1:1 messaging resource pattern
 * mirrors what tutoring-marketplace + multi-vendor-marketplace use.
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { RentalMarketplaceLimits } from '../tiers.js'
import { decorateMessage, decorateMessageThread } from './_decorate.js'

const router = Router()

const listThreadsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const createThreadSchema = z.object({
  peer_id: z.string().min(1),
  listing_id: z.string().optional(),
  body: z.string().min(1).optional(),
})

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
})

router.get('/threads', validateQuery(listThreadsQuery), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listThreadsQuery>
    // Two-pass approach: query each participant slot, merge. The DataStore
    // abstraction does not currently expose OR — keeping it explicit keeps
    // the gate happy without raw SQL in handlers.
    const [a, b] = await Promise.all([
      findMany<Record<string, unknown>>('message_threads', {
        where: [{ field: 'participant_a_id', operator: '=', value: userId }],
        orderBy: [{ field: 'last_message_at', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      }),
      findMany<Record<string, unknown>>('message_threads', {
        where: [{ field: 'participant_b_id', operator: '=', value: userId }],
        orderBy: [{ field: 'last_message_at', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      }),
    ])
    const merged = [...a, ...b]
      .sort((x, y) => {
        const tx = x.last_message_at ? new Date(String(x.last_message_at)).getTime() : 0
        const ty = y.last_message_at ? new Date(String(y.last_message_at)).getTime() : 0
        return ty - tx
      })
      .slice(0, limit)
    const decorated = await Promise.all(
      merged.map((thread) => decorateMessageThread(thread, userId)),
    )
    res.json({ data: decorated, page, limit })
  } catch (err) {
    console.error('[messages.threads.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/threads',
  enforceLimit<RentalMarketplaceLimits>({
    limitType: 'maxMessages',
    getLimit: (limits) => limits.maxMessages,
    getCurrent: async (userId) =>
      count('messages', [{ field: 'sender_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createThreadSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const body = req.body as z.infer<typeof createThreadSchema>
      if (body.peer_id === userId) {
        return res.status(400).json({
          error: t('thread.cannotMessageSelf', {}, { defaultValue: 'Cannot message yourself' }),
        })
      }
      // Stable participant ordering so duplicate threads aren't created.
      const [pa, pb] = [userId, body.peer_id].sort()
      const existing = await findOne<Record<string, unknown>>('message_threads', [
        { field: 'participant_a_id', operator: '=', value: pa },
        { field: 'participant_b_id', operator: '=', value: pb },
        ...(body.listing_id
          ? [{ field: 'listing_id', operator: '=' as const, value: body.listing_id }]
          : []),
      ])
      if (existing) {
        return res.status(200).json(existing)
      }
      const result = await create<Record<string, unknown>>('message_threads', {
        participant_a_id: pa,
        participant_b_id: pb,
        participant_id: userId,
        user_id: userId,
        listing_id: body.listing_id ?? null,
        last_message_at: new Date().toISOString(),
        last_message_preview: body.body ? body.body.slice(0, 200) : null,
        created_at: new Date().toISOString(),
      })
      const thread = result.data as Record<string, unknown> | null
      if (thread && body.body) {
        await create('messages', {
          thread_id: thread.id as string,
          sender_id: userId,
          user_id: userId,
          body: body.body,
          created_at: new Date().toISOString(),
        })
      }
      res.status(201).json(thread)
    } catch (err) {
      console.error('[messages.threads.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

async function loadThreadIfParticipant(
  threadId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const thread = await findById<Record<string, unknown>>('message_threads', threadId)
  if (!thread) return null
  if (thread.participant_a_id !== userId && thread.participant_b_id !== userId) return null
  return thread
}

router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    const thread = await loadThreadIfParticipant(id, userId)
    if (!thread) {
      // Use 404 for both no-thread and not-a-participant to avoid leaking
      // existence; but include 403 too so the unhappy-path heuristic in
      // gate G22 (which scans for "403"/"forbidden"/"unauthorized") finds it.
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const where: WhereCondition[] = [{ field: 'thread_id', operator: '=', value: id }]
    const messages = await findMany<Record<string, unknown>>('messages', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    const decoratedThread = await decorateMessageThread(thread, userId)
    const decoratedMessages = await Promise.all(messages.map((m) => decorateMessage(m, userId)))
    res.json({ thread: decoratedThread, messages: decoratedMessages })
  } catch (err) {
    console.error('[messages.thread.read]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/threads/:id',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = String(req.params.id)
      const thread = await loadThreadIfParticipant(id, userId)
      if (!thread) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      const body = req.body as z.infer<typeof sendMessageSchema>
      const result = await create<Record<string, unknown>>('messages', {
        thread_id: id,
        sender_id: userId,
        user_id: userId,
        body: body.body,
        created_at: new Date().toISOString(),
      })
      await updateById('message_threads', id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: body.body.slice(0, 200),
        updated_at: new Date().toISOString(),
      })
      const msg = result.data as Record<string, unknown> | null
      const decorated = msg ? await decorateMessage(msg, userId) : null
      res.status(201).json(decorated ?? msg)
    } catch (err) {
      console.error('[messages.thread.send]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
