import type { RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import type { CustomerSupportChatLimits } from '../tiers.js'

const createSchema = z.object({
  sender_type: z.enum(['visitor', 'agent', 'bot']),
  sender_id: z.string().min(1).optional(),
  sender_name: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(20_000),
  type: z.enum(['text', 'internal_note', 'image', 'file']).optional(),
})

const noteSchema = z.object({
  sender_id: z.string().min(1).optional(),
  sender_name: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(20_000),
})

const router = Router()

const ensureConversationOwnership = async (
  conversationId: string,
  userId: string,
  res: Response,
): Promise<boolean> => {
  const conv = await findById<Record<string, unknown>>('support_conversations', conversationId)
  if (!conv) {
    res.status(404).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return false
  }
  if (conv.user_id && conv.user_id !== userId) {
    res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    return false
  }
  return true
}

router.get('/:conversationId', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    if (!(await ensureConversationOwnership(req.params.conversationId as string, userId, res)))
      return
    const messages = await findMany('support_messages', {
      where: [
        {
          field: 'conversation_id',
          operator: '=',
          value: req.params.conversationId,
        },
      ],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(messages)
  } catch (error) {
    logger.error('messages.list failed', error)
    next(error)
  }
})

router.post(
  '/:conversationId',
  requireAuth,
  enforceLimit<CustomerSupportChatLimits>({
    limitType: 'maxMessages',
    getLimit: (limits) => limits.maxMessages,
    getCurrent: (userId) =>
      count('support_messages', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    try {
      const userId = res.locals.session.userId as string
      if (!(await ensureConversationOwnership(req.params.conversationId as string, userId, res)))
        return
      const result = await create('support_messages', {
        conversation_id: req.params.conversationId,
        sender_type: parsed.data.sender_type,
        sender_id: parsed.data.sender_id ?? userId,
        sender_name: parsed.data.sender_name ?? null,
        content: parsed.data.content,
        type: parsed.data.type ?? 'text',
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      const message = result.data as Record<string, unknown> | undefined
      // Update conversation last_message_at so the inbox can sort by activity.
      try {
        await updateById('support_conversations', req.params.conversationId as string, {
          last_message_at: new Date().toISOString(),
        })
      } catch (updateErr) {
        logger.error('messages.updateLastMessageAt failed', updateErr)
      }
      try {
        // Deliver to the message's conversation room only — clients join
        // `conversation:<conversationId>` (see lib/realtime-guard.ts), never
        // a global room.
        await broadcast(`conversation:${req.params.conversationId}`, 'message:created', {
          ...message,
          conversation_id: req.params.conversationId,
        })
      } catch (broadcastErr) {
        logger.error('messages.broadcast failed', broadcastErr)
      }
      res.status(201).json(message)
    } catch (error) {
      logger.error('messages.create failed', error)
      next(error)
    }
  },
)

router.post('/:conversationId/note', requireAuth, async (req, res, next) => {
  const parsed = noteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const userId = res.locals.session.userId as string
    if (!(await ensureConversationOwnership(req.params.conversationId as string, userId, res)))
      return
    const result = await create('support_messages', {
      conversation_id: req.params.conversationId,
      sender_type: 'agent',
      sender_id: parsed.data.sender_id ?? userId,
      sender_name: parsed.data.sender_name ?? null,
      content: parsed.data.content,
      type: 'internal_note',
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    const note = result.data
    try {
      // Internal notes are support_messages rows too (type 'internal_note'),
      // so they ride the same per-conversation event; the row's `type` field
      // lets subscribers distinguish them. Only the conversation's owner can
      // join the room (see lib/realtime-guard.ts), so a note never leaks.
      await broadcast(`conversation:${req.params.conversationId}`, 'message:created', {
        ...note,
        conversation_id: req.params.conversationId,
      })
    } catch (broadcastErr) {
      logger.error('messages.broadcast failed', broadcastErr)
    }
    res.status(201).json(note)
  } catch (error) {
    logger.error('messages.note failed', error)
    next(error)
  }
})

export default router
