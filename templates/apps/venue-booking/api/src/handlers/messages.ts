/**
 * `/api/messages` — message threads + per-thread messages between
 * guests and hosts.
 *
 * GET /messages              — list threads where the user is a participant
 * GET /messages/:id          — thread metadata + messages
 * POST /messages/:id/messages — append a message to a thread
 * POST /messages             — start a new thread for a venue+host
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import {
  asISO,
  decorateMessage,
  decorateMessageThread,
  parseJsonArray,
  type ViewMessage,
} from './_decorate.js'

const router = Router()

const sendMessageSchema = z.object({
  body: z.string().min(1),
  attachments: z.array(z.string()).optional(),
})

const startThreadSchema = z.object({
  venue_id: z.string().min(1),
  body: z.string().min(1).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }

  // No simple jsonb-contains in the DataStore API — fetch all threads
  // and filter by participant. The set is small per app (host + guest).
  const rows = await findMany<Record<string, unknown>>('message_threads', {
    orderBy: [{ field: 'last_message_at', direction: 'desc' }],
    limit: 500,
  })
  const userThreads = rows.filter((row) => {
    const parts = parseJsonArray(row.participants)
    return parts.includes(userId)
  })

  const decorated = await Promise.all(
    userThreads.map(async (thread) => {
      const messages = await findMany<Record<string, unknown>>('messages', {
        where: [{ field: 'thread_id', operator: '=', value: String(thread.id) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 200,
      })
      return decorateMessageThread(thread, userId, messages)
    }),
  )
  res.json({ data: decorated })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const threadId = String(req.params.id)
  const thread = await findById<Record<string, unknown>>('message_threads', threadId)
  if (!thread) {
    res.status(404).json({ error: t('thread.notFound', {}, { defaultValue: 'Thread not found' }) })
    return
  }
  const parts = parseJsonArray(thread.participants)
  if (!parts.includes(userId)) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }

  const messages = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'thread_id', operator: '=', value: threadId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 500,
  })

  // Mark the user's read state on every message they didn't send.
  for (const m of messages) {
    const senderId = String(m.sender_user_id)
    if (senderId === userId) continue
    const readBy = parseJsonArray(m.read_by)
    if (!readBy.includes(userId)) {
      readBy.push(userId)
      try {
        await updateById('messages', String(m.id), {
          read_by: JSON.stringify(readBy),
        })
      } catch (err) {
        logger.error({ err }, '[messages] mark-read failed')
      }
    }
  }

  const decorated = await decorateMessageThread(thread, userId, messages)
  const decoratedMessages: ViewMessage[] = await Promise.all(
    messages.map((m) => decorateMessage(m, userId)),
  )
  res.json({ thread: decorated, messages: decoratedMessages })
})

router.post(
  '/:id/messages',
  validateParams(idParamSchema),
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const threadId = String(req.params.id)
    const thread = await findById<Record<string, unknown>>('message_threads', threadId)
    if (!thread) {
      res
        .status(404)
        .json({ error: t('thread.notFound', {}, { defaultValue: 'Thread not found' }) })
      return
    }
    const parts = parseJsonArray(thread.participants)
    if (!parts.includes(userId)) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const body = req.body as z.infer<typeof sendMessageSchema>
    const result = await create<Record<string, unknown>>('messages', {
      thread_id: threadId,
      sender_user_id: userId,
      body: body.body,
      attachments: JSON.stringify(body.attachments ?? []),
      read_by: JSON.stringify([userId]),
      created_at: new Date(),
    })
    const message = (result.data ?? result) as Record<string, unknown>
    await updateById('message_threads', threadId, {
      last_message_at: new Date(),
    })
    const decorated = await decorateMessage(message, userId)
    res.status(201).json(decorated)
  },
)

router.post('/', validateBody(startThreadSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof startThreadSchema>
  const venue = await findById<Record<string, unknown>>('venues', body.venue_id)
  if (!venue) {
    res.status(404).json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
    return
  }
  const hostId = venue.host_user_id ? String(venue.host_user_id) : null
  if (!hostId || hostId === userId) {
    res.status(400).json({
      error: t(
        'thread.cannotMessageSelf',
        {},
        {
          defaultValue: 'Cannot start a thread with yourself.',
        },
      ),
    })
    return
  }

  // Find existing thread for this venue+pair, if any.
  const allThreads = await findMany<Record<string, unknown>>('message_threads', {
    where: [{ field: 'venue_id', operator: '=', value: body.venue_id }] as WhereCondition[],
    limit: 200,
  })
  const existing = allThreads.find((t) => {
    const parts = parseJsonArray(t.participants)
    return parts.includes(userId) && parts.includes(hostId)
  })
  let threadId: string
  let thread: Record<string, unknown>
  if (existing) {
    threadId = String(existing.id)
    thread = existing
  } else {
    const result = await create<Record<string, unknown>>('message_threads', {
      booking_id: null,
      venue_id: body.venue_id,
      participants: JSON.stringify([userId, hostId]),
      last_message_at: new Date(),
      created_at: new Date(),
    })
    thread = (result.data ?? result) as Record<string, unknown>
    threadId = String(thread.id)
  }

  if (body.body) {
    await create('messages', {
      thread_id: threadId,
      sender_user_id: userId,
      body: body.body,
      attachments: JSON.stringify([]),
      read_by: JSON.stringify([userId]),
      created_at: new Date(),
    })
    await updateById('message_threads', threadId, {
      last_message_at: new Date(),
    })
  }

  const messages = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'thread_id', operator: '=', value: threadId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 50,
  })
  const decorated = await decorateMessageThread(thread, userId, messages)
  res.status(existing ? 200 : 201).json({
    thread: decorated,
    messages: await Promise.all(messages.map((m) => decorateMessage(m, userId))),
  })

  // Suppress unused-import warning for asISO during type-checking;
  // some flagships invoke decorate without needing it directly here.
  void asISO
})

export default router
