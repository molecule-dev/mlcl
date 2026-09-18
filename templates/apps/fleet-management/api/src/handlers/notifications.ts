import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { shapeNotification } from './_shape.js'

const router = Router()

router.use(authorizers.auth())

const listQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// List notifications — per-user. Seeds demo data on first authenticated call.
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { unreadOnly, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unreadOnly === 'true') {
      where.push({ field: 'read_at', operator: 'is_null', value: null })
    }

    const notifications = await findMany('notifications', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(notifications.map((n) => shapeNotification(n as Record<string, unknown>)))
  } catch (err) {
    logger.error('[notifications] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark notification as read — per-user.
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', req.params.id as string, {
      read_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('[notifications] mark-read failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete notification — per-user.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[notifications] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
