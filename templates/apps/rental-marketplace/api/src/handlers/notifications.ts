/**
 * `/api/notifications` — view-shaped wrapper over the `notifications` table.
 *
 * GET /                  — auth; lists own notifications (newest first)
 * POST /:id/read         — auth + ownership; marks one notification read
 * POST /read-all         — auth; marks all of user's notifications read
 *
 * Notifications carry a freeform `payload` jsonb (title, body, icon,
 * listing_id, href, etc.); the decorator funnels that into the
 * `ViewNotification` shape the Notifications.tsx page renders.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { decorateNotifications } from './_decorate.js'

const router = Router()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

router.get('/', validateQuery(listQuery), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuery>
    const rows = await findMany<Record<string, unknown>>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: decorateNotifications(rows) })
  } catch (err) {
    console.error('[notifications.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const result = await updateById<Record<string, unknown>>('notifications', id, {
      read_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[notifications.read]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const rows = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null', value: null },
      ],
      limit: 500,
    })
    let updated = 0
    for (const r of rows) {
      try {
        await updateById('notifications', String(r.id), { read_at: new Date() })
        updated++
      } catch (_error) {
        // Ignore individual row failures — continue marking remaining rows.
      }
    }
    res.json({ updated })
  } catch (err) {
    console.error('[notifications.read-all]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
