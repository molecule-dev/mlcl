/**
 * Notifications handler — owner-scoped read + read-receipts.
 *
 * Routes:
 *   GET   /api/notifications              list (newest first)
 *   POST  /api/notifications/read-all     mark all unread as read
 *   POST  /api/notifications/:id/read     mark single as read
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

import { decorateNotifications } from './_decorate.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    // First-touch demo seed: turns a freshly signed-up user into one
    // that has welcome notifications + a couple of liked tracks +
    // baseline preferences. Idempotent.
    try {
      await seedDemoForUser(userId)
    } catch (_error) {
      /* non-fatal — demo seed failure should not block notification fetch */
    }

    const rows = await findMany<{
      id: string
      kind: string | null
      payload: Record<string, unknown> | null
      title: string | null
      body: string | null
      href: string | null
      read_at: string | Date | null
      created_at: string | Date
    }>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await decorateNotifications(rows))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.json({ updated: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const row = await findById<{ id: string; user_id: string }>(
      'notifications',
      String(req.params.id),
    )
    if (!row || row.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await updateById('notifications', row.id, { read_at: new Date() })
    res.json({ updated: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
