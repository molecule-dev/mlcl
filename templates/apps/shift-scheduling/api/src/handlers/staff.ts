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

import type { ShiftSchedulingLimits } from '../tiers.js'
import { decorateStaff, type RawStaff } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.string().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional().default('last_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const createBodySchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  // Frontend sends `email`; accept either `email` or `work_email` for
  // ergonomic API use.
  email: z.string().email().max(255).optional(),
  work_email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  role: z.string().max(100).optional().default('general'),
  max_weekly_hours: z.coerce.number().int().positive().max(168).optional().default(40),
  status: z.enum(['active', 'inactive']).optional(),
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
  const { search, status, role, sort, order, limit } = parsed.data
  let items = (
    await findMany<RawStaff>('staff', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_name', direction: 'asc' }],
    })
  ).map(decorateStaff)
  if (status) items = items.filter((s) => s.status === status)
  if (role) items = items.filter((s) => s.role === role)
  // `search` is the free-text box — match the person's name, email, or role
  // (case-insensitive substring), applied in-memory on the decorated list.
  if (search) {
    const needle = search.toLowerCase()
    items = items.filter((s) =>
      [s.first_name, s.last_name, s.name, s.email, s.role].some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
      ),
    )
  }
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
  const item = await findById<RawStaff>('staff', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('staff.notFound', {}, { defaultValue: 'Staff member not found' }) })
  }
  res.json(decorateStaff(item))
})

/**
 * Record a roster change in the audit trail (shown on Settings). Best-effort:
 * a failed audit write must never fail the underlying mutation.
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
      table_name: 'staff',
      record_id: recordId,
      action,
      before: before ?? null,
      after: after ?? null,
      occurred_at: new Date(),
    })
  } catch (_error) {
    // Auditing is best-effort — never let it break the roster mutation.
  }
}

// Enforce the per-tier roster cap (tiers.ts maxStaff) — the create route
// counts the owning table by user_id before allowing a new row.
const enforceStaffLimit = enforceLimit<ShiftSchedulingLimits>({
  limitType: 'maxStaff',
  getLimit: (limits) => limits.maxStaff,
  getCurrent: async (userId) =>
    count('staff', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceStaffLimit, async (req: Request, res: Response) => {
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
  const email = body.work_email ?? body.email ?? null
  if (!email) {
    return res
      .status(400)
      .json({ error: t('staff.emailRequired', {}, { defaultValue: 'Email is required.' }) })
  }
  const result = await create<RawStaff>('staff', {
    user_id: userId,
    first_name: body.first_name,
    last_name: body.last_name,
    email,
    phone: body.phone ?? null,
    role: body.role ?? 'general',
    max_weekly_hours: body.max_weekly_hours ?? 40,
    status: body.status ?? 'active',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawStaff
  await recordAudit(userId, String(raw.id), 'created', null, raw)
  res.status(201).json(decorateStaff(raw))
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
  const existing = await findById<RawStaff>('staff', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('staff.notFound', {}, { defaultValue: 'Staff member not found' }) })
    return
  }
  const data = body.data
  const email = data.work_email ?? data.email
  const patch: Record<string, unknown> = { ...data, updated_at: new Date() }
  delete patch.email
  if (email !== undefined) patch.email = email
  const result = await updateById<RawStaff>('staff', params.data.id, patch)
  const raw = (result.data ?? result) as RawStaff
  await recordAudit(userId, params.data.id, 'updated', existing, raw)
  res.json(decorateStaff(raw))
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
  const existing = await findById<RawStaff>('staff', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('staff.notFound', {}, { defaultValue: 'Staff member not found' }) })
  }
  await deleteById('staff', params.data.id)
  await recordAudit(userId, params.data.id, 'deleted', existing, null)
  res.status(204).end()
})

export default router
