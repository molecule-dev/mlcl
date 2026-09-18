/**
 * Notifications: per-user inbox backed by the `notifications` table.
 *
 * Endpoints:
 * - GET    /notifications              — list (paginated by created_at desc)
 * - POST   /notifications              — create (test/admin/seed callers)
 * - PATCH  /notifications/:id/read     — mark a single notification read
 * - PATCH  /notifications/read-all     — mark every unread notification read
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const rows = await findMany('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(rows)
})

const createSchema = z.object({
  kind: z.string().min(1),
  actor_name: z.string().nullable().optional(),
  actor_color: z.string().nullable().optional(),
  sentence: z.string().nullable().optional(),
  target_label: z.string().nullable().optional(),
  target_href: z.string().nullable().optional(),
  preview: z.string().nullable().optional(),
  bucket: z.enum(['today', 'week', 'older']).default('today'),
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const created = await create('notifications', {
    user_id: userId,
    kind: body.kind,
    actor_name: body.actor_name ?? null,
    actor_color: body.actor_color ?? null,
    sentence: body.sentence ?? null,
    target_label: body.target_label ?? null,
    target_href: body.target_href ?? null,
    preview: body.preview ?? null,
    bucket: body.bucket,
    unread: true,
    created_at: new Date(),
    read_at: null,
  })
  res.status(201).json(created.data)
})

// PATCH read-all is mounted before /:id/read so the literal route wins
router.patch('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const result = await query(
    `UPDATE notifications SET unread = false, read_at = now()
     WHERE user_id = $1::uuid AND unread = true
     RETURNING id`,
    [userId],
  )
  const updated = (result as { rows?: unknown[] }).rows?.length ?? 0
  res.json({ updated })
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const updated = await updateById('notifications', id, {
    unread: false,
    read_at: new Date(),
  })
  res.json(updated.data)
})

export default router
