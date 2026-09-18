/**
 * Notification handlers — per-user notification feed.
 *
 * Notifications are scoped strictly to `user_id`; no cross-user reads or
 * writes are possible. The feed is created by article-publish / comment
 * code paths (or by a worker) and is read-only via this handler save for
 * the "mark read" PATCH.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { internalError, type NotificationRow, requireUser, validationError } from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

router.get('/', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const items = await findMany<NotificationRow>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    // Scope read access by user_id to prevent IDOR.
    const existing = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: uid },
    ])
    if (!existing) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const result = await updateById<NotificationRow>('notifications', id.data.id, {
      read_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

export default router
