/**
 * Notifications handler — feed items for the in-app Notifications page.
 *
 * Backed by the `notifications` table (migration 0010). Owner-scoped by
 * user_id; supports list, mark-read (single), mark-all-read.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany, query, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { seedDemoOnSignup } from './_seed.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    // Best-effort: seed demo notifications on first GET so a fresh
    // signup lands on a populated /notifications page without coupling
    // to the signup route. Idempotent on user_id.
    await seedDemoOnSignup(userId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<Record<string, unknown>>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    // Atomic, ownership-scoped write: only a row owned by the caller is
    // updated, so another tenant's notification is never mutated or disclosed.
    const where: WhereCondition[] = [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ]
    const result = await updateMany('notifications', where, { read: true })
    if (!result.affected) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const item = await findById<Record<string, unknown>>('notifications', id)
    res.json(item)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await query<{ id: string }>(
      `UPDATE public.notifications SET read = true
       WHERE user_id = $1 AND read = false
       RETURNING id`,
      [userId],
    )
    res.json({ updated: result.rows.length })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
