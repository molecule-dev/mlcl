import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { buildLookups, decoratePto, type RawPto } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
  sort: z.string().optional().default('start_date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createBodySchema = z.object({
  employee_id: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  // Accept either `kind` (DB column) or `type` (frontend form name).
  kind: z.string().optional(),
  type: z.string().optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  hours: z.number().nonnegative().optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  // Allow status to be sent so callers can pre-populate; we override
  // to 'pending' on create for safety.
  status: z.string().optional(),
})

const updateBodySchema = z.object({
  status: z.enum(['pending', 'approved', 'denied', 'cancelled']).optional(),
  review_note: z.string().max(2000).optional().nullable(),
  hours: z.number().nonnegative().optional().nullable(),
  start_date: z.string().min(1).optional(),
  end_date: z.string().min(1).optional(),
  reason: z.string().max(2000).optional().nullable(),
  kind: z.string().optional(),
  type: z.string().optional(),
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
  const { employee_id, status, kind, sort, order } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (employee_id) where.push({ field: 'employee_id', operator: '=' as const, value: employee_id })
  if (status) where.push({ field: 'status', operator: '=' as const, value: status })
  if (kind) where.push({ field: 'kind', operator: '=' as const, value: kind })
  const items = await findMany<RawPto>('pto_requests', {
    where,
    orderBy: [{ field: sort, direction: order }],
  })
  const lookups = await buildLookups(userId)
  res.json(items.map((p) => decoratePto(p, { employee: lookups.employeeById })))
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
  const item = await findById<RawPto>('pto_requests', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('pto.notFound', {}, { defaultValue: 'PTO request not found' }) })
  }
  const lookups = await buildLookups(userId)
  res.json(decoratePto(item, { employee: lookups.employeeById }))
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
  // Default employee_id to the first employee owned by this user (typically
  // the requester themselves) when not provided — keeps the "request time
  // off" form simple while still satisfying the foreign-keyish shape.
  let employeeId = body.employee_id ?? null
  if (!employeeId) {
    const first = await findMany<{ id: string }>('employees', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 1,
    })
    employeeId = first[0]?.id ?? null
  }
  const kind = body.kind ?? body.type ?? 'vacation'
  const result = await create<RawPto>('pto_requests', {
    user_id: userId,
    employee_id: employeeId,
    kind,
    start_date: body.start_date,
    end_date: body.end_date,
    hours: body.hours ?? null,
    reason: body.reason ?? null,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawPto
  const lookups = await buildLookups(userId)
  res.status(201).json(decoratePto(raw, { employee: lookups.employeeById }))
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
  const existing = await findById<RawPto>('pto_requests', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('pto.notFound', {}, { defaultValue: 'PTO request not found' }) })
    return
  }
  const data: Record<string, unknown> = { ...body.data, updated_at: new Date() }
  if (body.data.type && !body.data.kind) {
    data.kind = body.data.type
    delete data.type
  }
  if (body.data.status && body.data.status !== 'pending') {
    data.reviewer_id = userId
    data.reviewed_at = new Date()
  }
  const result = await updateById<RawPto>('pto_requests', params.data.id, data)
  const raw = (result.data ?? result) as RawPto
  const lookups = await buildLookups(userId)
  res.json(decoratePto(raw, { employee: lookups.employeeById }))
}

router.patch('/:id', updateHandler)
router.put('/:id', updateHandler)

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
  const existing = await findById<RawPto>('pto_requests', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('pto.notFound', {}, { defaultValue: 'PTO request not found' }) })
  }
  await deleteById('pto_requests', params.data.id)
  res.status(204).end()
})

export default router
