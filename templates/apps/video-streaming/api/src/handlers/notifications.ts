/**
 * Notifications handler — owner-only feed.
 *
 * Returns the authenticated user's notifications (ordered desc by created_at)
 * and exposes an explicit "mark as read" endpoint. Authorization is
 * implicit: every query scopes by `user_id` from the session, so an attacker
 * cannot read or mark another user's notifications.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findMany, type OrderBy, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany('notifications', { where, orderBy, limit: 100 })
    res.json(items)
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
    // Mark every unread notification owned by the caller as read. We can't
    // use a bulk-update primitive in the molecule database bond contract,
    // so we walk the rows; for the typical 0–100 unread inbox this is
    // perfectly fine.
    const unread = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null', value: null },
      ],
      limit: 200,
    })
    const now = new Date()
    await Promise.all(
      unread.map((row) => updateById('notifications', String(row.id), { read_at: now })),
    )
    res.json({ updated: unread.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    // Authorize-then-update. Verify the row belongs to the caller via a
    // user_id-scoped query before mutating; bare updateById would IDOR.
    const found = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'id', operator: '=', value: idOf(req) },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (!found[0]) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', idOf(req), { read_at: new Date() })
    res.json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
