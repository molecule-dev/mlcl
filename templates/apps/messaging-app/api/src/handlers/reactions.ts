import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { requireConversationParticipant } from '../lib/authz.js'

const createSchema = z.object({
  message_id: z.string().min(1),
  emoji: z.string().min(1).max(16),
})

const router = Router()

router.use(requireAuth)

router.get('/message/:messageId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const message = await findById<Record<string, unknown>>(
      'messages',
      req.params.messageId as string,
    )
    if (!message) {
      res.status(404).json({
        error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }),
      })
      return
    }
    const check = await requireConversationParticipant(String(message.conversation_id), userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }),
      })
      return
    }
    const reactions = await findMany('reactions', {
      where: [{ field: 'message_id', operator: '=', value: req.params.messageId }],
    })
    res.json(reactions)
  } catch (error) {
    logger.error('reactions.list', error)
    res.status(500).json({
      error: t('reactions.listError', undefined, { defaultValue: 'Failed to list reactions' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const message = await findById<Record<string, unknown>>('messages', parsed.data.message_id)
    if (!message) {
      res.status(404).json({
        error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }),
      })
      return
    }
    const check = await requireConversationParticipant(String(message.conversation_id), userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }),
      })
      return
    }
    const result = await create('reactions', {
      message_id: parsed.data.message_id,
      user_id: userId,
      emoji: parsed.data.emoji,
      created_at: new Date().toISOString(),
    })
    try {
      // Deliver to the parent message's conversation room only — clients join
      // `conversation:<id>` (see lib/realtime-guard.ts), never a global room.
      await broadcast(
        `conversation:${String(message.conversation_id)}`,
        'reaction:created',
        result.data,
      )
    } catch (_error) {
      // broadcast failures are non-fatal — clients will receive the update on next poll
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reactions.create', error)
    res.status(500).json({
      error: t('reactions.createError', undefined, {
        defaultValue: 'Failed to add reaction',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const reaction = await findById<{ user_id: unknown; message_id: unknown }>(
      'reactions',
      req.params.id as string,
    )
    if (!reaction) {
      res.status(404).json({
        error: t('reactions.notFound', undefined, { defaultValue: 'Reaction not found' }),
      })
      return
    }
    if (String(reaction.user_id) !== String(userId)) {
      res.status(404).json({
        error: t('reactions.notFound', undefined, { defaultValue: 'Reaction not found' }),
      })
      return
    }
    await deleteById('reactions', req.params.id as string)
    try {
      // Resolve the parent message to route the event to its conversation
      // room; a missing parent (already-deleted message) simply skips the
      // best-effort broadcast.
      const message = await findById<{ conversation_id: unknown }>(
        'messages',
        String(reaction.message_id),
      )
      if (message) {
        await broadcast(`conversation:${String(message.conversation_id)}`, 'reaction:deleted', {
          id: req.params.id,
          message_id: reaction.message_id,
        })
      }
    } catch (_error) {
      // broadcast failures are non-fatal — clients will receive the update on next poll
    }
    res.status(204).end()
  } catch (error) {
    logger.error('reactions.delete', error)
    res.status(500).json({
      error: t('reactions.deleteError', undefined, {
        defaultValue: 'Failed to delete reaction',
      }),
    })
  }
})

export default router
