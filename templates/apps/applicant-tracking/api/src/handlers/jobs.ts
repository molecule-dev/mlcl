import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const listQuerySchema = z.object({
  status: z.string().optional(),
  department: z.string().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createBodySchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.string().optional(),
  employment_type: z.string().optional(),
  description: z.string().optional().nullable(),
  requirements: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .nullable(),
  salary_min: z.number().int().nonnegative().optional().nullable(),
  salary_max: z.number().int().nonnegative().optional().nullable(),
  ai_screening: z.boolean().optional(),
  status: z.enum(['draft', 'open', 'paused', 'filled', 'closed']).optional(),
})

const updateBodySchema = createBodySchema.partial()

function normalizeRequirements(value: string | string[] | null | undefined): string | null {
  if (value == null) return null
  if (Array.isArray(value)) return value.filter(Boolean).join('\n') || null
  return value || null
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const { status, department, sort, order } = parsed.data
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (status) where.push({ field: 'status', operator: '=' as const, value: status })
    if (department) where.push({ field: 'department', operator: '=' as const, value: department })
    const items = await findMany('jobs', {
      where,
      orderBy: [{ field: sort, direction: order }],
    })
    res.json(items)
  } catch (err) {
    console.error('GET /jobs failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
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
    const item = await findById<Record<string, unknown>>('jobs', params.data.id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('job.notFound', {}, { defaultValue: 'Job not found' }) })
    }
    res.json(item)
  } catch (err) {
    console.error('GET /jobs/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
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
    const result = await create('jobs', {
      user_id: userId,
      title: body.title,
      department: body.department ?? null,
      location: body.location ?? null,
      type: body.employment_type ?? body.type ?? 'full-time',
      description: body.description ?? null,
      requirements: normalizeRequirements(body.requirements),
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      status: body.status ?? 'open',
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('POST /jobs failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
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
    const existing = await findById<Record<string, unknown>>('jobs', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('job.notFound', {}, { defaultValue: 'Job not found' }) })
    }
    const updates: Record<string, unknown> = { ...body.data, updated_at: new Date() }
    if (body.data.employment_type) {
      updates.type = body.data.employment_type
      delete updates.employment_type
    }
    if (body.data.requirements !== undefined) {
      updates.requirements = normalizeRequirements(body.data.requirements)
    }
    delete updates.ai_screening
    const result = await updateById('jobs', params.data.id, updates)
    res.json(result.data)
  } catch (err) {
    console.error('PUT /jobs/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
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
    const existing = await findById<Record<string, unknown>>('jobs', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('job.notFound', {}, { defaultValue: 'Job not found' }) })
    }
    await deleteById('jobs', params.data.id)
    res.status(204).end()
  } catch (err) {
    console.error('DELETE /jobs/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
