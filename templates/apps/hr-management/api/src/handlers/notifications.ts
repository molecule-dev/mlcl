import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import {
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { decorateNotification, type RawNotification } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  unread: z.string().optional(),
  kind: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const updateBodySchema = z.object({
  read: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const { unread, kind, limit, sort, order } = parsed.data
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (unread === 'true' || unread === '1') where.push({ field: 'read_at', operator: 'is_null' })
  if (kind) where.push({ field: 'kind', operator: '=', value: kind })
  const items = await findMany<RawNotification>('notifications', {
    where,
    orderBy: [{ field: sort, direction: order }],
    limit,
  })
  res.json(items.map(decorateNotification))
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const unread = await findMany<{ id: string }>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ],
  })
  const now = new Date()
  for (const n of unread) {
    await updateById('notifications', String(n.id), { read_at: now })
  }
  res.json({ updated: unread.length })
})

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  const body = updateBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ],
    })
  }
  const existing = await findById<RawNotification>('notifications', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
    })
  }
  const result = await updateById<RawNotification>('notifications', params.data.id, {
    read_at: body.data.read === false ? null : new Date(),
  })
  const raw = (result.data ?? result) as RawNotification
  res.json(decorateNotification(raw))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  if (!params.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: params.error.issues,
    })
  }
  const existing = await findById<RawNotification>('notifications', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
    })
  }
  await deleteById('notifications', params.data.id)
  res.status(204).end()
})

export default router
