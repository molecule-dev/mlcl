import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'

const listQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const router = Router()

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({
        error: t('common.invalidInput', {}, { defaultValue: 'Invalid query' }),
        issues: parsed.error.issues,
      })
      return
    }
    const { unread, page, limit } = parsed.data
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null', value: null })
    }
    const rows = await findMany('notifications', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark one notification as read — caller must be the recipient.
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.empty', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', req.params.id as string, {
      read_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const unread = await findMany<{ id: string }>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null', value: null },
      ],
    })
    const now = new Date().toISOString()
    for (const row of unread) {
      await updateById('notifications', String(row.id), { read_at: now })
    }
    res.json({ ok: true, marked: unread.length })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete one notification — caller must be the recipient.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.empty', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
