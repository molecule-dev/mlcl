/**
 * webhook-manager — notifications CRUD + mark-read.
 *
 * Notifications are user-scoped rows persisted to public.notifications.
 * Created by webhook handlers (e.g. on endpoint flap, secret rotation,
 * delivery failure burst) — list + per-item read-toggle + mark-all-read
 * are exposed here.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const SEVERITIES = ['info', 'warning', 'critical'] as const

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  filter: z.enum(['all', 'unread', ...SEVERITIES]).default('all'),
})

const createSchema = z.object({
  severity: z.enum(SEVERITIES).default('info'),
  type: z.string().min(1).max(60).default('info'),
  title: z.string().min(1).max(255),
  body: z.string().max(2000).optional(),
  endpoint_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  is_read: z.boolean().optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const q = req.query as unknown as z.infer<typeof listSchema>
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (q.filter === 'unread') where.push({ field: 'is_read', operator: '=', value: false })
  else if (q.filter !== 'all') where.push({ field: 'severity', operator: '=', value: q.filter })
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const items = await findMany('notifications', {
    where,
    orderBy,
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  })
  res.json(items)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('notifications', {
    user_id: userId,
    endpoint_id: body.endpoint_id ?? null,
    type: body.type,
    severity: body.severity,
    title: body.title,
    body: body.body ?? '',
    is_read: false,
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_read', operator: '=', value: false },
    ],
    { is_read: true },
  )
  res.json({ updated: result.affected })
})

router.patch('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const body = req.body as z.infer<typeof updateSchema>
  const update: Record<string, unknown> = {}
  if (body.is_read !== undefined) update.is_read = body.is_read
  // Atomic, ownership-scoped write: only a row owned by the caller is updated,
  // so another tenant's notification is never mutated or disclosed.
  const where: WhereCondition[] = [
    { field: 'id', operator: '=', value: id },
    { field: 'user_id', operator: '=', value: userId },
  ]
  const result = await updateMany('notifications', where, update)
  if (!result.affected) {
    res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const row = await findById<Record<string, unknown>>('notifications', id)
  res.json(row)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<Record<string, unknown>>('notifications', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  await deleteById('notifications', id)
  res.status(204).end()
})

export default router
