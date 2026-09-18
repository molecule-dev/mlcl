import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'

const router = Router()

const updateEscalationSchema = z.object({
  agent_assigned_id: z.string().uuid().optional(),
  accepted_at: z.string().datetime().optional(),
  resolved_at: z.string().datetime().optional(),
  summary: z.string().max(10_000).optional(),
})

router.use(authorizers.auth())

// List escalations — owner-scoped.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status === 'open') {
      where.push({ field: 'resolved_at', operator: 'is_null', value: null })
    } else if (status === 'resolved') {
      where.push({ field: 'resolved_at', operator: 'is_not_null', value: null })
    }
    const escalations = await findMany('escalations', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'requested_at', direction: 'desc' }],
    })
    res.json(escalations)
  } catch (error) {
    logger.error('escalations.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get escalation — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('escalations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('escalations.notFound', {}, { defaultValue: 'Escalation not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('escalations.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update escalation — owner-only. Used to mark accepted / resolved + add summary.
router.patch('/:id', validateBody(updateEscalationSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('escalations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('escalations.notFound', {}, { defaultValue: 'Escalation not found' }),
      })
      return
    }
    const result = await updateById(
      'escalations',
      req.params.id as string,
      req.body as Record<string, unknown>,
    )
    res.json(result.data)
  } catch (error) {
    logger.error('escalations.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Take over an escalation — owner-only convenience action.
router.post('/:id/take-over', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('escalations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('escalations.notFound', {}, { defaultValue: 'Escalation not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('escalations', req.params.id as string, {
      agent_assigned_id: userId,
      accepted_at: now,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('escalations.takeOver', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
