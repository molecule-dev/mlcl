import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { HrManagementLimits } from '../tiers.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  parent_id: z.string().uuid().optional(),
  sort: z.string().optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

const createBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  head_employee_id: z.string().uuid().optional().nullable(),
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
  const { parent_id, sort, order } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (parent_id) where.push({ field: 'parent_id', operator: '=' as const, value: parent_id })
  const items = await findMany('departments', {
    where,
    orderBy: [{ field: sort, direction: order }],
  })
  res.json(items)
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
  const item = await findById<Record<string, unknown>>('departments', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('department.notFound', {}, { defaultValue: 'Department not found' }) })
  }
  const employees = await findMany('employees', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'department_id', operator: '=', value: params.data.id },
    ],
    orderBy: [{ field: 'last_name', direction: 'asc' }],
  })
  res.json({ ...item, employees })
})

// Enforce the per-tier departments cap (tiers.ts maxDepartments) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
// NOTE: departments can also be auto-created from an employee's free-text department_name
// (resolveDepartmentId in employees.ts); that convenience path is not gated by this cap.
const enforceDepartmentLimit = enforceLimit<HrManagementLimits>({
  limitType: 'maxDepartments',
  getLimit: (limits) => limits.maxDepartments,
  getCurrent: async (userId) =>
    count('departments', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceDepartmentLimit, async (req: Request, res: Response) => {
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
  const result = await create('departments', {
    user_id: userId,
    name: body.name,
    description: body.description ?? null,
    parent_id: body.parent_id ?? null,
    head_employee_id: body.head_employee_id ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data)
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
  const existing = await findById<Record<string, unknown>>('departments', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('department.notFound', {}, { defaultValue: 'Department not found' }) })
    return
  }
  const result = await updateById('departments', params.data.id, {
    ...body.data,
    updated_at: new Date(),
  })
  res.json(result.data)
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
  const existing = await findById<Record<string, unknown>>('departments', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('department.notFound', {}, { defaultValue: 'Department not found' }) })
  }
  await deleteById('departments', params.data.id)
  res.status(204).end()
})

export default router
