import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireConversationParticipant } from '../lib/authz.js'

const createSchema = z.object({
  conversation_id: z.string().min(1),
  url: z.string().min(1).max(2000),
  thumbnail_url: z.string().max(2000).optional(),
  type: z.string().min(1).max(80),
  size: z.number().int().min(0).max(2_000_000_000),
  name: z.string().max(255).optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireConversationParticipant(req.params.conversationId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', undefined, {
          defaultValue: 'Conversation not found',
        }),
      })
      return
    }
    const items = await findMany('media', {
      where: [{ field: 'conversation_id', operator: '=', value: req.params.conversationId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('media.list', error)
    res.status(500).json({
      error: t('media.listError', undefined, { defaultValue: 'Failed to list media' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const item = await findById<Record<string, unknown>>('media', req.params.id as string)
    if (!item) {
      res.status(404).json({
        error: t('media.notFound', undefined, { defaultValue: 'Media not found' }),
      })
      return
    }
    const check = await requireConversationParticipant(String(item.conversation_id), userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('media.notFound', undefined, { defaultValue: 'Media not found' }),
      })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('media.read', error)
    res.status(500).json({
      error: t('media.readError', undefined, { defaultValue: 'Failed to read media' }),
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
    const check = await requireConversationParticipant(parsed.data.conversation_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', undefined, {
          defaultValue: 'Conversation not found',
        }),
      })
      return
    }
    const result = await create('media', {
      conversation_id: parsed.data.conversation_id,
      sender_id: userId,
      url: parsed.data.url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      type: parsed.data.type,
      size: parsed.data.size,
      name: parsed.data.name ?? null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('media.create', error)
    res.status(500).json({
      error: t('media.createError', undefined, { defaultValue: 'Failed to register media' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const item = await findById<Record<string, unknown>>('media', req.params.id as string)
    if (!item) {
      res.status(404).json({
        error: t('media.notFound', undefined, { defaultValue: 'Media not found' }),
      })
      return
    }
    if (String(item.sender_id) !== String(userId)) {
      res.status(404).json({
        error: t('media.notFound', undefined, { defaultValue: 'Media not found' }),
      })
      return
    }
    await deleteById('media', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('media.delete', error)
    res.status(500).json({
      error: t('media.deleteError', undefined, { defaultValue: 'Failed to delete media' }),
    })
  }
})

export default router
