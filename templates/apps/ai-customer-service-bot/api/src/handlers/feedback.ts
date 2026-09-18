import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'

const router = Router()

const createFeedbackSchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid().optional(),
  // 1 = thumbs-down, 5 = thumbs-up. Constrain to (1,5) to keep parity with
  // the rest of the rating space (CSAT) without inviting freeform values.
  rating: z.union([z.literal(1), z.literal(5)]),
  comment: z.string().max(2_000).optional().default(''),
})

router.use(authorizers.auth())

// List feedback — owner-scoped (admins curate it from the dashboard).
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { conversation_id, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (conversation_id) {
      where.push({ field: 'conversation_id', operator: '=', value: String(conversation_id) })
    }
    const rows = await findMany('feedback', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('feedback.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create feedback — caller must own the parent conversation. End-customer
// feedback flows through the public widget endpoint (Phase 3); this
// authenticated path is for operator + agent annotations only.
router.post('/', validateBody(createFeedbackSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { conversation_id, message_id, rating, comment } = req.body as {
      conversation_id: string
      message_id?: string
      rating: 1 | 5
      comment: string
    }
    const check = await requireOwnership('conversations', conversation_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await create('feedback', {
      owner_id: userId,
      conversation_id,
      message_id: message_id ?? null,
      rating,
      comment,
      created_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('feedback.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
