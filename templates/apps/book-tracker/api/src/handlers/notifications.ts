/**
 * In-app notification feed for the user (challenge milestones, finished
 * books, stalled-reading nudges, weekly digests). All reads/writes are
 * owner-scoped; modifying another user's notification returns 404.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  count,
  deleteMany,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// UUID required so non-UUID path segments (e.g. POST /notifications/_/read)
// are rejected with 400 by validateParams BEFORE reaching pg, which would
// otherwise raise "invalid input syntax for type uuid" and bubble up as 500.

const listQuerySchema = z.object({
  unread_only: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { unread_only, limit } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread_only === 'true') {
      where.push({ field: 'read', operator: '=', value: false })
    }
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany<{ read: boolean }>('notifications', {
      where,
      orderBy,
      limit: limit ?? 50,
    })
    // Frontend reads `unread` (negated `read`); expose both for clarity.
    res.json(items.map((it) => ({ ...it, unread: !it.read })))
  },
)

router.get('/unread-count', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const c = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read', operator: '=', value: false },
  ])
  res.json({ count: c })
})

router.post(
  '/:id/read',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<{ user_id: string }>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    const result = await updateById('notifications', id, { read: true })
    res.json(result.data)
  },
)

router.post('/read-all', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false },
    ],
    { read: true },
  )
  res.json({ updated: result.affected ?? 0 })
})

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<{ user_id: string }>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    await deleteMany('notifications', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
