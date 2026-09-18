import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const VALID_KINDS = ['incident', 'maintenance', 'subscriber', 'team', 'system'] as const

const createSchema = z.object({
  kind: z.enum(VALID_KINDS),
  title: z.string().min(1).max(500),
  body: z.string().optional().default(''),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = await findMany('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(rows)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const result = await create('notifications', {
    user_id: userId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    payload: JSON.stringify(parsed.data.payload),
  })
  res.status(201).json(result.data ?? result)
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  // Atomic, ownership-scoped write: only a row owned by the caller is updated,
  // so another tenant's notification is never mutated or disclosed.
  const result = await updateMany(
    'notifications',
    [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    { read_at: new Date().toISOString() },
  )
  if (!result.affected) {
    return res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
  }
  const row = await findById<Record<string, unknown>>('notifications', id)
  res.json(row)
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ],
    { read_at: new Date().toISOString() },
  )
  res.json({ updated: result.affected ?? 0 })
})

export default router
