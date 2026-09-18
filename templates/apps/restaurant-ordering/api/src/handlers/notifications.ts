import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createNotificationSchema = z.object({
  type: z.string().min(1).max(80),
  // The notifications table has no title/body columns — the content lives in the
  // payload jsonb, which is where the UI reads it (n.payload?.title). Accepting
  // them only under `payload` meant a caller posting the natural
  // { type, title, body } had both stripped by zod and stored a row with an
  // empty payload: created 201, rendered blank.
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  const notifications = await findMany<Record<string, unknown>>('notifications', {
    where,
    limit,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  const unreadCount = await count('notifications', [
    ...where,
    { field: 'read_at', operator: 'is_null', value: null },
  ])
  res.json({ data: notifications, unreadCount, total: notifications.length })
})

router.post('/', validateBody(createNotificationSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createNotificationSchema>
  const result = await create<Record<string, unknown>>('notifications', {
    user_id: userId,
    type: body.type,
    payload: {
      ...(body.payload ?? {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
    },
  })
  res.status(201).json(result.data)
})

router.put('/:id/read', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  // Atomic, ownership-scoped write: enforce ownership BEFORE/with the mutation
  // so another tenant's notification is never written first and then hidden by
  // a post-mutation 404. The update only matches a row the caller owns.
  const result = await updateMany(
    'notifications',
    [
      { field: 'id', operator: '=' as const, value: req.params.id },
      { field: 'user_id', operator: '=' as const, value: userId },
    ],
    { read_at: new Date().toISOString() },
  )
  if (!result.affected) {
    res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const updated = await findById<Record<string, unknown>>('notifications', req.params.id)
  res.json(updated)
})

router.post('/mark-all-read', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const unread = await findMany<Record<string, unknown>>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null', value: null },
    ],
    limit: 500,
  })
  const now = new Date().toISOString()
  await Promise.all(
    unread.map((n) => updateById('notifications', n.id as string, { read_at: now })),
  )
  res.json({ markedRead: unread.length })
})

export default router
