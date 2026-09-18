import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const startThreadSchema = z.object({
  recipient_id: z.string().min(1),
})

const sendMessageSchema = z.object({
  body: z.string().min(1),
})

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

router.get('/threads', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const owned = await findMany<Record<string, unknown>>('message_threads', {
      where: [{ field: 'user_a_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_message_at', direction: 'desc' }],
      limit: 100,
    })
    const involved = await findMany<Record<string, unknown>>('message_threads', {
      where: [{ field: 'user_b_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_message_at', direction: 'desc' }],
      limit: 100,
    })
    const all = [...owned, ...involved].sort((x, y) => {
      const xt = new Date(String(x.last_message_at)).getTime()
      const yt = new Date(String(y.last_message_at)).getTime()
      return yt - xt
    })
    const enriched = await Promise.all(
      all.map(async (th) => {
        const peerId = th.user_a_id === userId ? th.user_b_id : th.user_a_id
        let peerName = 'Tutor'
        try {
          const peer = await findById<{ name?: string }>('users', String(peerId))
          if (peer?.name) peerName = peer.name
        } catch (lookupErr) {
          logger.warn?.(`messages thread peer lookup failed: ${(lookupErr as Error).message}`)
        }
        const lastMsg = (await findMany<Record<string, unknown>>('messages', {
          where: [{ field: 'thread_id', operator: '=', value: th.id }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
          limit: 1,
        })) as Array<Record<string, unknown>>
        return {
          ...th,
          peer_id: peerId,
          peer_name: peerName,
          last_message_body: lastMsg[0]?.body ?? null,
        }
      }),
    )
    res.json(enriched)
  } catch (err) {
    logger.error?.(`GET /messages/threads failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/threads', validateBody(startThreadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof startThreadSchema>
    // Accept either a user_id or a tutor_profile.id as the recipient. Most UI
    // links pass tutor_profile.id (e.g. /messages?with=<tutorProfileId> from
    // tutor cards) because that's what the URL slug holds. We resolve it to
    // the underlying user_id here so the thread is keyed on actual users —
    // otherwise the tutor would never see threads addressed to their profile
    // id, and peer-name lookups against `users` would fail.
    let recipientUserId = body.recipient_id
    const recipientUser = await findById<{ id?: string }>('users', recipientUserId).catch(
      () => null,
    )
    if (!recipientUser) {
      const tutor = await findById<{ user_id?: string }>('tutor_profiles', recipientUserId).catch(
        () => null,
      )
      if (tutor?.user_id) {
        recipientUserId = String(tutor.user_id)
      } else {
        res.status(404).json({
          error: t('messages.recipientNotFound', undefined, {
            defaultValue: 'Recipient not found.',
          }),
        })
        return
      }
    }
    if (recipientUserId === userId) {
      res.status(400).json({
        error: t('messages.cannotMessageSelf', undefined, {
          defaultValue: 'Cannot start a thread with yourself.',
        }),
      })
      return
    }
    const [a, b] = pairKey(userId, recipientUserId)
    const existing = await findOne<Record<string, unknown>>('message_threads', [
      { field: 'user_a_id', operator: '=', value: a },
      { field: 'user_b_id', operator: '=', value: b },
    ])
    if (existing) {
      res.json(existing)
      return
    }
    try {
      const result = await create<Record<string, unknown>>('message_threads', {
        user_a_id: a,
        user_b_id: b,
        last_message_at: new Date(),
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (createErr) {
      // Race: another request created the thread between findOne and create.
      // Return the existing row so the client gets idempotent behavior.
      const message = (createErr as Error).message ?? ''
      if (/unique|duplicate/i.test(message)) {
        const row = await findOne<Record<string, unknown>>('message_threads', [
          { field: 'user_a_id', operator: '=', value: a },
          { field: 'user_b_id', operator: '=', value: b },
        ])
        if (row) {
          res.json(row)
          return
        }
      }
      throw createErr
    }
  } catch (err) {
    logger.error?.(`POST /messages/threads failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/threads/:threadId/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const threadId = getParamId(req, 'threadId')
    const thread = await findById<Record<string, unknown>>('message_threads', threadId)
    if (!thread) {
      res.status(404).json({
        error: t('messages.threadNotFound', undefined, { defaultValue: 'Thread not found' }),
      })
      return
    }
    if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
      res.status(404).json({
        error: t('messages.threadNotFound', undefined, { defaultValue: 'Thread not found' }),
      })
      return
    }
    const messages = await findMany('messages', {
      where: [{ field: 'thread_id', operator: '=', value: threadId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(messages)
  } catch (err) {
    logger.error?.(`GET /messages/threads/:threadId/messages failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/threads/:threadId/messages',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const threadId = getParamId(req, 'threadId')
      const thread = await findById<Record<string, unknown>>('message_threads', threadId)
      if (!thread) {
        res.status(404).json({
          error: t('messages.threadNotFound', undefined, { defaultValue: 'Thread not found' }),
        })
        return
      }
      if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
        res
          .status(403)
          .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
        return
      }
      const body = req.body as z.infer<typeof sendMessageSchema>
      const result = await create<Record<string, unknown>>('messages', {
        thread_id: threadId,
        sender_id: userId,
        body: body.body,
        created_at: new Date(),
      })
      await updateById('message_threads', threadId, { last_message_at: new Date() })
      const message = result.data as Record<string, unknown> | undefined
      try {
        await broadcast(`thread:${threadId}`, 'new-message', message)
      } catch (broadcastErr) {
        logger.warn?.(`broadcast failed: ${(broadcastErr as Error).message}`)
      }
      res.status(201).json(message)
    } catch (err) {
      logger.error?.(`POST /messages/threads/:threadId/messages failed: ${(err as Error).message}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
