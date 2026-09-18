/**
 * Notifications handler — per-user inbox feed.
 *
 * The molecule `@molecule/api-resource-notification` package provides the
 * core notification model + helpers; this handler is the HTTP surface
 * binding to the `notifications` table for the in-app feed page. All
 * routes are owner-scoped — a user only sees / mutates their own rows.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const listNotificationsQuery = z.object({
  read: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

const updateNotificationSchema = z.object({
  read: z.boolean(),
})

// ---------------------------------------------------------------------------
// GET / — Owner-only: list MY notifications.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listNotificationsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    // Lazy-seed welcome notifications on the user's FIRST GET. Idempotent
    // — `seedDemoForUser` returns 0 when the user already has notifications.
    // We don't run this on every request: only when the global count is 0.
    const totalForUser = await count('notifications', [
      { field: 'owner_id', operator: '=', value: userId },
    ])
    if (totalForUser === 0) {
      try {
        await seedDemoForUser(userId)
      } catch (err) {
        logger.error({ err, userId }, '[notifications:list] seedDemoForUser failed')
      }
    }

    const { read, page, limit } = req.query as unknown as z.infer<typeof listNotificationsQuery>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (typeof read === 'boolean') where.push({ field: 'read', operator: '=', value: read })
    const items = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('notifications', where)
    res.json({ data: items, total, page })
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PATCH /mark-all-read (POST /read-all alias) — Owner-only: mark every
// unread notification as read.
//
// Returns the count actually flipped so the UI can confirm. Idempotent:
// running twice returns 0 the second time. Both verbs/paths are mounted
// for backwards compatibility — PATCH /mark-all-read is the canonical
// REST verb (we're updating existing resources).
// ---------------------------------------------------------------------------

const markAllRead = async (_req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false },
    ]
    const before = await count('notifications', where)
    await updateMany('notifications', where, { read: true })
    return res.json({ updated: before })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    return res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
}

router.patch('/mark-all-read', markAllRead)
router.post('/read-all', markAllRead)

// ---------------------------------------------------------------------------
// PUT /:id — Owner-only: mark read / unread.
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const result = await updateById(
      'notifications',
      id,
      req.body as z.infer<typeof updateNotificationSchema>,
    )
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Owner-only delete.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('notifications', id)
    res.status(204).send()
  } catch (error) {
    logger.error('notifications.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
