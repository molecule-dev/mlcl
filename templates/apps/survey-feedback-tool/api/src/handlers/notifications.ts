import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { count, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorization } from '@molecule/api-resource-user'

import { asyncHandler } from '../lib/asyncHandler.js'
import { requireNotificationOwnership } from '../lib/authz.js'

const router = Router()

const markReadSchema = z.object({
  read: z.boolean().optional().default(true),
})

router.use(authorization.verifyMiddleware())

// List notifications for the calling user.
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const items = await findMany('survey_notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const unread = await count('survey_notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ])
    res.json({ items, unread_count: unread })
  }),
)

// Bulk mark-all-read — owner-only.
router.post(
  '/mark-all-read',
  asyncHandler(async (_req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const unread = (await findMany('survey_notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
    })) as Array<{ id?: unknown }>
    const now = new Date().toISOString()
    let updated = 0
    for (const n of unread) {
      if (!n.id) continue
      await updateById('survey_notifications', String(n.id), { read_at: now })
      updated += 1
    }
    res.json({ updated })
  }),
)

// Mark single notification read/unread — owner-only.
router.patch(
  '/:id',
  validateBody(markReadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireNotificationOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('survey_notifications', req.params.id as string, {
      read_at: req.body.read ? new Date().toISOString() : null,
    })
    res.json(result.data)
  }),
)

// Delete — owner-only.
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireNotificationOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('survey_notifications', req.params.id as string)
    res.status(204).end()
  }),
)

export default router
