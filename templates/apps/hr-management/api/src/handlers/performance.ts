import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { buildLookups, decorateReview, type RawReview } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  cycle_id: z.string().uuid().optional(),
  status: z.string().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createBodySchema = z.object({
  employee_id: z.string().uuid(),
  reviewer_id: z.string().uuid().optional().nullable(),
  cycle_id: z.string().uuid().optional().nullable(),
  rating: z.number().min(0).max(10).optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  status: z.enum(['draft', 'in_progress', 'completed']).optional(),
})

const updateBodySchema = createBodySchema.partial()

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
  const { employee_id, cycle_id, status, sort, order } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (employee_id) where.push({ field: 'employee_id', operator: '=' as const, value: employee_id })
  if (cycle_id) where.push({ field: 'cycle_id', operator: '=' as const, value: cycle_id })
  if (status) where.push({ field: 'status', operator: '=' as const, value: status })
  const items = await findMany<RawReview>('performance_reviews', {
    where,
    orderBy: [{ field: sort, direction: order }],
  })
  const lookups = await buildLookups(userId)
  res.json(
    items.map((r) =>
      decorateReview(r, {
        employee: lookups.employeeById,
        cycleName: lookups.cycleName,
      }),
    ),
  )
})

router.get('/:id', async (req: Request, res: Response) => {
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
  const item = await findById<RawReview>('performance_reviews', params.data.id)
  if (!item || item.user_id !== userId) {
    return res.status(404).json({
      error: t('performance.notFound', {}, { defaultValue: 'Performance review not found' }),
    })
  }
  const lookups = await buildLookups(userId)
  res.json(
    decorateReview(item, {
      employee: lookups.employeeById,
      cycleName: lookups.cycleName,
    }),
  )
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const parsed = createBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  const result = await create<RawReview>('performance_reviews', {
    user_id: userId,
    employee_id: body.employee_id,
    reviewer_id: body.reviewer_id ?? userId,
    cycle_id: body.cycle_id ?? null,
    rating: body.rating ?? null,
    summary: body.summary ?? null,
    status: body.status ?? 'draft',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawReview
  const lookups = await buildLookups(userId)
  res.status(201).json(
    decorateReview(raw, {
      employee: lookups.employeeById,
      cycleName: lookups.cycleName,
    }),
  )
})

async function updateHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  const body = updateBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ],
    })
    return
  }
  const existing = await findById<RawReview>('performance_reviews', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({
      error: t('performance.notFound', {}, { defaultValue: 'Performance review not found' }),
    })
    return
  }
  const data: Record<string, unknown> = { ...body.data, updated_at: new Date() }
  if (body.data.status === 'completed') data.submitted_at = new Date()
  const result = await updateById<RawReview>('performance_reviews', params.data.id, data)
  const raw = (result.data ?? result) as RawReview
  const lookups = await buildLookups(userId)
  res.json(
    decorateReview(raw, {
      employee: lookups.employeeById,
      cycleName: lookups.cycleName,
    }),
  )
}

router.put('/:id', updateHandler)
router.patch('/:id', updateHandler)

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
  const existing = await findById<RawReview>('performance_reviews', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('performance.notFound', {}, { defaultValue: 'Performance review not found' }),
    })
  }
  await deleteById('performance_reviews', params.data.id)
  res.status(204).end()
})

export default router
