/**
 * Per-user notification handlers — list, mark-read, mark-all-read.
 *
 * The notifications table is owner-scoped (filtered by user_id from the
 * session) and powers both the dashboard activity strip and the
 * /notifications page. Mark-as-read flips `unread` for a single row;
 * mark-all-read flips it for every unread row owned by the caller.
 *
 * Notifications are seeded for new users in `_seed.ts` so a freshly
 * signed-up account lands on /dashboard with a populated activity feed
 * instead of an empty state.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, findMany, query, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { internalError, requireUser, validationError } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

interface NotificationRow {
  id: string
  user_id: string
  type: string
  actor: string
  description: string
  href: string | null
  unread: boolean
  created_at: string | Date
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    // The demo seed (3 starter notifications, per _seed.ts's own docstring:
    // "so /notifications isn't empty") only ran from GET /api/documents, so a
    // user who lands straight on /notifications saw an empty page while one who
    // visited /documents first saw three. Seed here too — it is idempotent.
    await seedDemoForUser(ownerId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: ownerId }]
    if (req.query.unread === 'true') {
      where.push({ field: 'unread', operator: '=', value: true })
    }
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    internalError(res)
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = idParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const existing = await findById<NotificationRow>('notifications', params.data.id)
    if (!existing || existing.user_id !== ownerId) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById<NotificationRow>('notifications', params.data.id, {
      unread: false,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    internalError(res)
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const result = await query(
      'UPDATE notifications SET unread = false WHERE user_id = $1 AND unread = true',
      [ownerId],
    )
    res.json({ updated: result.rowCount ?? 0 })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    internalError(res)
  }
})

export default router
