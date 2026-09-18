/**
 * Notification handlers (in-app feed).
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { deleteMany, findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const items = await findMany('notifications', { where, orderBy, limit: 100, offset: 0 })
  res.json(items)
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
    const id = idOf(req)
    // Atomic, ownership-scoped write: the update only matches a row that the
    // caller owns. No row is mutated when the id belongs to another user, so
    // there is no check-then-act gap and no cross-tenant tampering/leak.
    const result = await updateMany(
      'notifications',
      [
        { field: 'id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      { read: true, read_at: new Date() },
    )
    if (!result.affected) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    const updated = await findById<Record<string, unknown>>('notifications', id)
    res.json(updated)
  },
)

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
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
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
