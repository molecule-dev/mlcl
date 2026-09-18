import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const createNotificationSchema = z.object({
  type: z.string().min(1),
  body: z.string().min(1),
  href: z.string().nullable().optional(),
})

const updateNotificationSchema = z.object({
  unread: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const notifications = await findMany('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(notifications)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const parsed = createNotificationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const data = parsed.data
  const result = await create('notifications', {
    user_id: userId,
    type: data.type,
    body: data.body,
    href: data.href ?? null,
    unread: true,
    created_at: new Date(),
  })

  res.status(201).json(result.data)
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  // Bulk update via the abstract DataStore interface — no raw SQL, so the
  // call is portable across providers (postgres / sqlite / etc.).
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ],
    { unread: false },
  )
  res.json({ ok: true, affected: result.affected })
})

router.put('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing) {
    return res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const parsed = updateNotificationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const updates: Record<string, unknown> = {}
  const data = parsed.data
  if (data.unread !== undefined) updates.unread = data.unread

  const result = await updateById('notifications', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing) {
    return res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  await deleteById('notifications', id)
  res.status(204).end()
})

export default router
