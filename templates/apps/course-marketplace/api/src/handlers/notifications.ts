/**
 * Notifications handler — owner-only listing + mark-read endpoints for the
 * in-app activity feed.
 *
 * Authorization model:
 *   - read: owner-only — every endpoint scopes by `userId` from session.
 *   - write (mark-read / mark-all-read): owner-only.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  findById,
  findMany,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { decorateNotification } from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listSchema = z.object({
  unread: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.unread === 'true') {
      where.push({ field: 'unread', operator: '=', value: true })
    }
    const limit = req.query.limit ? Number(req.query.limit) : 100
    const rows = await findMany<Record<string, unknown>>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
    })
    res.json(rows.map((n) => decorateNotification(n)))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/unread-count', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const total = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ])
    res.json({ count: total })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById<Record<string, unknown>>('notifications', id, {
      unread: false,
      read_at: new Date(),
    })
    const row = (result.data ?? result) as Record<string, unknown>
    res.json(decorateNotification(row))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const result = await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'unread', operator: '=', value: true },
      ],
      { unread: false, read_at: new Date() },
    )
    res.json({ updated: result.affected ?? 0 })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
