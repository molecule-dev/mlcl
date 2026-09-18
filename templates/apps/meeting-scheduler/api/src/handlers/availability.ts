/**
 * Availability endpoints — recurring rules + per-day overrides.
 *
 *   GET    /api/availability                 -> rules: [{ day_of_week, start_minute, end_minute, timezone }]
 *   POST   /api/availability                 -> create a rule
 *   PUT    /api/availability/:id             -> update rule (full)
 *   PATCH  /api/availability/:id             -> update rule (partial)
 *   DELETE /api/availability/:id             -> delete rule
 *   PUT    /api/availability/bulk            -> replace ALL rules atomically
 *   GET    /api/availability/overrides       -> overrides
 *   POST   /api/availability/overrides       -> create override
 *   PATCH  /api/availability/overrides/:id   -> update override
 *   DELETE /api/availability/overrides/:id   -> delete override
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface AvailabilityRule {
  id: string
  user_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
  timezone: string
}

interface AvailabilityOverride {
  id: string
  user_id: string
  date: string
  is_unavailable: boolean
  start_minute: number | null
  end_minute: number | null
  note: string | null
}

const ruleSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_minute: z.number().int().min(0).max(1439),
    end_minute: z.number().int().min(0).max(1439),
    timezone: z.string().min(1).max(64).optional(),
  })
  .refine((v) => v.end_minute > v.start_minute, {
    message: 'end_minute must be greater than start_minute',
    path: ['end_minute'],
  })

const ruleUpdateSchema = z.object({
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_minute: z.number().int().min(0).max(1439).optional(),
  end_minute: z.number().int().min(0).max(1439).optional(),
  timezone: z.string().min(1).max(64).optional(),
})

const bulkRulesSchema = z.object({
  rules: z
    .array(
      z
        .object({
          day_of_week: z.number().int().min(0).max(6),
          start_minute: z.number().int().min(0).max(1439),
          end_minute: z.number().int().min(0).max(1439),
          timezone: z.string().min(1).max(64).optional(),
        })
        .refine((v) => v.end_minute > v.start_minute, {
          message: 'end_minute must be greater than start_minute',
          path: ['end_minute'],
        }),
    )
    .max(50),
})

const overrideShape = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_unavailable: z.boolean().optional(),
  start_minute: z.number().int().min(0).max(1439).nullable().optional(),
  end_minute: z.number().int().min(0).max(1439).nullable().optional(),
  note: z.string().max(500).optional(),
}

const validateOverrideWindow = (v: {
  start_minute?: number | null
  end_minute?: number | null
}): boolean => {
  if (v.start_minute == null && v.end_minute == null) return true
  if (v.start_minute == null || v.end_minute == null) return false
  return v.end_minute > v.start_minute
}

const overrideSchema = z.object(overrideShape).refine(validateOverrideWindow, {
  message: 'end_minute must be greater than start_minute',
  path: ['end_minute'],
})

const overrideUpdateSchema = z
  .object({
    date: overrideShape.date.optional(),
    is_unavailable: overrideShape.is_unavailable,
    start_minute: overrideShape.start_minute,
    end_minute: overrideShape.end_minute,
    note: overrideShape.note,
  })
  .refine(validateOverrideWindow, {
    message: 'end_minute must be greater than start_minute',
    path: ['end_minute'],
  })

// ---- rules ---------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [
    { field: 'day_of_week', direction: 'asc' },
    { field: 'start_minute', direction: 'asc' },
  ]
  const items = await findMany<AvailabilityRule>('availability_rules', {
    where,
    orderBy,
    limit: 200,
    offset: 0,
  })
  return res.json(items)
})

router.put('/bulk', validateBody(bulkRulesSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const body = req.body as z.infer<typeof bulkRulesSchema>

  // Replace strategy: pull current rules, delete each (so the FK on
  // overrides isn't disturbed — overrides reference user_id only), then
  // bulk-create the new set. Not transactional but acceptable for a
  // settings-page write where the user is the only writer.
  const existing = await findMany<AvailabilityRule>('availability_rules', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 200,
    offset: 0,
  })
  for (const rule of existing) {
    await deleteById('availability_rules', rule.id)
  }
  const created: AvailabilityRule[] = []
  for (const r of body.rules) {
    const result = await create<AvailabilityRule>('availability_rules', {
      user_id: userId,
      day_of_week: r.day_of_week,
      start_minute: r.start_minute,
      end_minute: r.end_minute,
      timezone: r.timezone ?? 'UTC',
      created_at: new Date(),
    })
    if (result.data) created.push(result.data)
  }
  return res.json(created)
})

router.post('/', validateBody(ruleSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const body = req.body as z.infer<typeof ruleSchema>
  const result = await create('availability_rules', {
    user_id: userId,
    day_of_week: body.day_of_week,
    start_minute: body.start_minute,
    end_minute: body.end_minute,
    timezone: body.timezone ?? 'UTC',
    created_at: new Date(),
  })
  return res.status(201).json(result.data)
})

router.put('/:id', validateBody(ruleUpdateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<AvailabilityRule>('availability_rules', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('availability.notFound', {}, { defaultValue: 'Rule not found' }) })
  }
  const result = await updateById('availability_rules', id, req.body)
  return res.json(result.data)
})

router.patch('/:id', validateBody(ruleUpdateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<AvailabilityRule>('availability_rules', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('availability.notFound', {}, { defaultValue: 'Rule not found' }) })
  }
  const result = await updateById('availability_rules', id, req.body)
  return res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<AvailabilityRule>('availability_rules', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('availability.notFound', {}, { defaultValue: 'Rule not found' }) })
  }
  await deleteById('availability_rules', id)
  return res.status(204).end()
})

// ---- overrides -----------------------------------------------------------

router.get('/overrides', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const items = await findMany<AvailabilityOverride>('availability_overrides', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'date', direction: 'asc' }],
    limit: 200,
    offset: 0,
  })
  return res.json(items)
})

router.post('/overrides', validateBody(overrideSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const body = req.body as z.infer<typeof overrideSchema>
  const result = await create('availability_overrides', {
    user_id: userId,
    date: body.date,
    is_unavailable: body.is_unavailable ?? true,
    start_minute: body.start_minute ?? null,
    end_minute: body.end_minute ?? null,
    note: body.note ?? null,
    created_at: new Date(),
  })
  return res.status(201).json(result.data)
})

router.patch(
  '/overrides/:id',
  validateBody(overrideUpdateSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }
    const id = getParamId(req)
    const existing = await findById<AvailabilityOverride>('availability_overrides', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('availability.notFound', {}, { defaultValue: 'Override not found' }) })
    }
    const result = await updateById('availability_overrides', id, req.body)
    return res.json(result.data)
  },
)

router.delete('/overrides/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<AvailabilityOverride>('availability_overrides', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('availability.notFound', {}, { defaultValue: 'Override not found' }) })
  }
  await deleteById('availability_overrides', id)
  return res.status(204).end()
})

export default router
