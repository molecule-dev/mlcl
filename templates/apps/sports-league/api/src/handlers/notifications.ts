/**
 * Notifications handler — strictly owner-scoped.
 *
 * Notifications are server-created (push fan-out, system events). The
 * frontend reads its own inbox and marks rows read. There is no client-side
 * create — emitting a notification is a server-side operation.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { count, deleteById, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { seedFavoritesForUser } from './_seed.js'

const router = Router()

const idOf = (req: Request): string => req.params.id as string

const listQuerySchema = z.object({
  unread_only: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    // Best-effort: seed favorites + a welcome notification on first GET so a
    // freshly signed-up user lands on a non-empty inbox. Idempotent.
    await seedFavoritesForUser(userId)
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (q.unread_only === 'true') {
      where.push({ field: 'read', operator: '=' as const, value: false as unknown as string })
    }
    const items = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    })
    const unread = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false as unknown as string },
    ])
    res.json({ data: items, meta: { unread } })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// POST /read-all — bulk mark every notification owned by the caller read.
router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const result = await query<{ id: string }>(
      `UPDATE public.notifications SET read = true WHERE user_id = $1 AND read = false RETURNING id`,
      [userId],
    )
    res.json({ updated: result.rows.length })
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
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const note = await findById<{ user_id?: string }>('notifications', idOf(req))
    if (!note || note.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', idOf(req), { read: true })
    res.json(result.data)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const note = await findById<{ user_id?: string }>('notifications', idOf(req))
    if (!note || note.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
