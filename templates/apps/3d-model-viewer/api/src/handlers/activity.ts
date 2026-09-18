import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const createActivitySchema = z.object({
  action: z.enum(['uploaded', 'rendered', 'shared', 'commented', 'deleted', 'updated']),
  model_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const events = await findMany('activity_feed', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 50,
  })
  res.json(events)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const parsed = createActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const data = parsed.data
  const result = await create('activity_feed', {
    user_id: userId,
    model_id: data.model_id ?? null,
    action: data.action,
    metadata: JSON.stringify(data.metadata ?? {}),
    created_at: new Date(),
  })

  res.status(201).json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('activity_feed', id)
  if (!existing) {
    return res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  await deleteById('activity_feed', id)
  res.status(204).end()
})

export default router
