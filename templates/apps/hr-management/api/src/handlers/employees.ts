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
import { buildLookups, decorateEmployee, type RawEmployee } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.string().optional(),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional().default('last_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const createBodySchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  // Frontend sends `email` (work email field on the AddEmployee form);
  // accept either `email` or `work_email` for ergonomic API use.
  email: z.string().email().max(255).optional(),
  work_email: z.string().email().max(255).optional(),
  personal_email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  title: z.string().max(150).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  // Free-text alternative — server resolves to an ID (creating the
  // department if it doesn't exist yet, so AddEmployee never blocks
  // because the dept hasn't been pre-created).
  department_name: z.string().max(120).optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  manager_name: z.string().max(200).optional().nullable(),
  start_date: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  employment_type: z.string().optional().default('full-time'),
  office_location: z.string().max(150).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  timezone: z.string().max(80).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  employee_number: z.string().max(50).optional().nullable(),
  salary_cents: z.number().int().nonnegative().optional().nullable(),
  status: z
    .enum(['active', 'on_leave', 'on-leave', 'probation', 'terminated', 'inactive'])
    .optional()
    .transform((s) => {
      if (!s) return s
      if (s === 'on-leave' || s === 'on_leave') return 'on-leave'
      if (s === 'inactive') return 'terminated'
      return s
    }),
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
  const { search, status, department_id, manager_id, sort, order, limit } = parsed.data
  const lookups = await buildLookups(userId)
  let items = lookups.decoratedEmployees
  if (status) items = items.filter((e) => e.status === status)
  if (department_id) items = items.filter((e) => e.department_id === department_id)
  if (manager_id) items = items.filter((e) => e.manager_id === manager_id)
  // `search` is the free-text box — match the person's name, work email, or title
  // (case-insensitive substring). Applied in-memory since this list is decorated in-memory.
  if (search) {
    const needle = search.toLowerCase()
    items = items.filter((e) => {
      const r = e as unknown as Record<string, unknown>
      return [r.first_name, r.last_name, r.work_email, r.email, r.title].some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
      )
    })
  }
  // Sort
  items = [...items].sort((a, b) => {
    const av = (a as unknown as Record<string, string>)[sort] ?? ''
    const bv = (b as unknown as Record<string, string>)[sort] ?? ''
    return (order === 'asc' ? 1 : -1) * String(av).localeCompare(String(bv))
  })
  if (limit) items = items.slice(0, limit)
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
  const item = await findById<RawEmployee>('employees', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('employee.notFound', {}, { defaultValue: 'Employee not found' }) })
  }
  const lookups = await buildLookups(userId)
  const decorated = decorateEmployee(item, {
    departmentName: lookups.departmentName,
    managerName: (mid) => (mid ? (lookups.employeeById(mid)?.name ?? '') : ''),
  })
  res.json(decorated)
})

async function resolveDepartmentId(
  userId: string,
  body: { department_id?: string | null; department_name?: string | null },
): Promise<string | null> {
  if (body.department_id) return body.department_id
  const name = (body.department_name ?? '').trim()
  if (!name) return null
  const matches = await findMany<{ id: string; name: string }>('departments', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'name', operator: '=', value: name },
    ],
    limit: 1,
  })
  if (matches[0]) return matches[0].id
  const created = await create<{ id: string }>('departments', {
    user_id: userId,
    name,
    description: null,
    parent_id: null,
    head_employee_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const row = (created.data ?? created) as { id: string }
  return row.id
}

async function resolveManagerId(
  userId: string,
  body: { manager_id?: string | null; manager_name?: string | null },
): Promise<string | null> {
  if (body.manager_id) return body.manager_id
  const name = (body.manager_name ?? '').trim()
  if (!name) return null
  const employees = await findMany<{ id: string; first_name: string; last_name: string }>(
    'employees',
    {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    },
  )
  const lower = name.toLowerCase()
  const found = employees.find((e) => `${e.first_name} ${e.last_name}`.toLowerCase() === lower)
  return found?.id ?? null
}

/**
 * Record an employee change in the compliance audit trail. The audit feed (Settings)
 * reads `audit_events` WHERE user_id = the actor, but NOTHING ever wrote a real row —
 * the feed was fully synthesised (no real actions, no before/after). This writes the
 * real entry with the full before/after snapshot. Best-effort: a failed audit write
 * must never fail the underlying mutation.
 */
export async function recordAudit(
  actorId: string,
  recordId: string,
  action: 'created' | 'updated' | 'deleted',
  before: unknown,
  after: unknown,
): Promise<void> {
  try {
    await create('audit_events', {
      user_id: actorId,
      actor_id: actorId,
      table_name: 'employees',
      record_id: recordId,
      action,
      before: before ?? null,
      after: after ?? null,
      occurred_at: new Date(),
    })
  } catch (_error) {
    // Auditing is best-effort — never let it break the employee mutation.
  }
}

// Enforce the per-tier employees cap (tiers.ts maxEmployees) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceEmployeeLimit = enforceLimit<HrManagementLimits>({
  limitType: 'maxEmployees',
  getLimit: (limits) => limits.maxEmployees,
  getCurrent: async (userId) =>
    count('employees', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceEmployeeLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = createBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  const workEmail = body.work_email ?? body.email ?? null
  if (!workEmail) {
    return res.status(400).json({
      error: t('employee.emailRequired', {}, { defaultValue: 'Work email is required.' }),
    })
  }
  const number = body.employee_number ?? `ARB-${Math.floor(Math.random() * 9000 + 1000)}`
  const departmentId = await resolveDepartmentId(userId, body)
  const managerId = await resolveManagerId(userId, body)
  const result = await create<RawEmployee>('employees', {
    user_id: userId,
    first_name: body.first_name,
    last_name: body.last_name,
    work_email: workEmail,
    personal_email: body.personal_email || null,
    phone: body.phone ?? null,
    title: body.title ?? null,
    department_id: departmentId,
    manager_id: managerId,
    start_date: body.start_date ?? null,
    hire_date: body.hire_date ?? body.start_date ?? new Date().toISOString().slice(0, 10),
    employment_type: body.employment_type ?? 'full-time',
    office_location: body.office_location ?? null,
    pronouns: body.pronouns ?? null,
    timezone: body.timezone ?? null,
    bio: body.bio ?? null,
    employee_number: number,
    salary_cents: body.salary_cents ?? null,
    status: body.status ?? 'active',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawEmployee
  const lookups = await buildLookups(userId)
  const decorated = decorateEmployee(raw, {
    departmentName: lookups.departmentName,
    managerName: (mid) => (mid ? (lookups.employeeById(mid)?.name ?? '') : ''),
  })
  await recordAudit(userId, String(raw.id), 'created', null, raw)
  res.status(201).json(decorated)
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
  const existing = await findById<RawEmployee>('employees', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('employee.notFound', {}, { defaultValue: 'Employee not found' }) })
    return
  }
  const data = body.data
  const departmentId = await resolveDepartmentId(userId, data)
  const managerId = await resolveManagerId(userId, data)
  const workEmail = data.work_email ?? data.email
  const patch: Record<string, unknown> = { ...data, updated_at: new Date() }
  delete patch.email
  delete patch.department_name
  delete patch.manager_name
  if (workEmail !== undefined) patch.work_email = workEmail
  if (data.department_id !== undefined || data.department_name !== undefined) {
    patch.department_id = departmentId
  }
  if (data.manager_id !== undefined || data.manager_name !== undefined) {
    patch.manager_id = managerId
  }
  const result = await updateById<RawEmployee>('employees', params.data.id, patch)
  const raw = (result.data ?? result) as RawEmployee
  const lookups = await buildLookups(userId)
  const decorated = decorateEmployee(raw, {
    departmentName: lookups.departmentName,
    managerName: (mid) => (mid ? (lookups.employeeById(mid)?.name ?? '') : ''),
  })
  await recordAudit(userId, params.data.id, 'updated', existing, raw)
  res.json(decorated)
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
  const existing = await findById<RawEmployee>('employees', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('employee.notFound', {}, { defaultValue: 'Employee not found' }) })
  }
  await deleteById('employees', params.data.id)
  await recordAudit(userId, params.data.id, 'deleted', existing, null)
  res.status(204).end()
})

export default router
