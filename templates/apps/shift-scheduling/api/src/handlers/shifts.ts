import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ShiftSchedulingLimits } from '../tiers.js'
import {
  addWeeks,
  buildLookups,
  clockOf,
  combineShiftTimes,
  type DecoratedShift,
  decorateShift,
  findOverlappingShifts,
  type RawShift,
  weekStartOf,
} from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  staff_id: z.string().uuid().optional(),
  role: z.string().optional(),
  published: z.enum(['true', 'false']).optional(),
})

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)

const createBodySchema = z.object({
  // null / absent staff_id = open shift.
  staff_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  role: z.string().min(1).max(100).default('general'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: timeSchema,
  end_time: timeSchema,
  published: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().nullable(),
})

const updateBodySchema = z.object({
  staff_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  role: z.string().min(1).max(100).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  published: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
})

const publishBodySchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  published: z.boolean().optional().default(true),
})

function weekWindow(weekStart: string): { from: string; to: string } {
  return {
    from: `${weekStart}T00:00:00.000Z`,
    to: `${addWeeks(weekStart, 1)}T00:00:00.000Z`,
  }
}

function inWeek(shift: RawShift, weekStart: string): boolean {
  const start = new Date(shift.starts_at).getTime()
  const { from, to } = weekWindow(weekStart)
  return start >= new Date(from).getTime() && start < new Date(to).getTime()
}

/**
 * Server-enforced no-double-booking rule — the ONE choke point every write
 * path funnels through. Returns the conflicting shift (or null) so the
 * caller can 409 with the conflict id.
 */
async function findConflict(
  userId: string,
  staffId: string,
  range: { starts_at: Date | string; ends_at: Date | string },
  excludeShiftId?: string,
): Promise<RawShift | null> {
  const overlapping = await findOverlappingShifts(userId, staffId, range, excludeShiftId)
  return overlapping[0] ?? null
}

function conflictResponse(res: Response, conflict: RawShift): void {
  res.status(409).json({
    error: t(
      'shifts.conflict',
      {},
      { defaultValue: 'This staff member already has an overlapping shift.' },
    ),
    code: 'shift_conflict',
    conflict_with: conflict.id,
    conflict_starts_at: conflict.starts_at,
    conflict_ends_at: conflict.ends_at,
  })
}

async function listShiftsForWeek(userId: string, weekStart: string): Promise<DecoratedShift[]> {
  const lookups = await buildLookups(userId)
  return lookups.rawShifts
    .filter((s) => inWeek(s, weekStart))
    .map(lookups.decorateShiftWithAvailability)
}

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
  const { week_start, staff_id, role, published } = parsed.data
  // Default to the current (Monday-based) week so the Schedule grid always
  // opens on "this week" without the frontend computing it.
  const week = week_start ?? weekStartOf()
  let items = await listShiftsForWeek(userId, week)
  if (staff_id) items = items.filter((s) => s.staff_id === staff_id)
  if (role) items = items.filter((s) => s.role === role)
  if (published !== undefined) items = items.filter((s) => s.published === (published === 'true'))
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
  const item = await findById<RawShift>('shifts', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
  }
  const lookups = await buildLookups(userId)
  res.json(lookups.decorateShiftWithAvailability(item))
})

// Enforce the per-tier weekly shift cap (tiers.ts maxWeeklyShifts) — counted
// over the Monday-based week the new shift falls in.
const enforceWeeklyShiftLimit = enforceLimit<ShiftSchedulingLimits>({
  limitType: 'maxWeeklyShifts',
  getLimit: (limits) => limits.maxWeeklyShifts,
  getCurrent: async (userId) => {
    const week = weekStartOf()
    const from = new Date(`${week}T00:00:00Z`).getTime()
    const to = new Date(`${addWeeks(week, 1)}T00:00:00Z`).getTime()
    const rows = await findMany<{ starts_at: string }>('shifts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    return rows.filter((s) => {
      const start = new Date(s.starts_at).getTime()
      return start >= from && start < to
    }).length
  },
}) as unknown as RequestHandler

router.post('/', enforceWeeklyShiftLimit, async (req: Request, res: Response) => {
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
  const { starts_at, ends_at } = combineShiftTimes(body.date, body.start_time, body.end_time)
  // Hard rule: a staff member can never hold two overlapping shifts —
  // drafts included (double-booking a draft is still double-booking).
  if (body.staff_id) {
    const conflict = await findConflict(userId, body.staff_id, { starts_at, ends_at })
    if (conflict) return conflictResponse(res, conflict)
  }
  const result = await create<RawShift>('shifts', {
    user_id: userId,
    staff_id: body.staff_id ?? null,
    role: body.role,
    starts_at,
    ends_at,
    published: body.published ?? false,
    notes: body.notes ?? null,
    assigned_via: 'assigned',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawShift
  const lookups = await buildLookups(userId)
  res.status(201).json(lookups.decorateShiftWithAvailability(raw))
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
  const existing = await findById<RawShift>('shifts', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
    return
  }
  const data = body.data
  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (data.role !== undefined) patch.role = data.role
  if (data.published !== undefined) patch.published = data.published
  if (data.notes !== undefined) patch.notes = data.notes ?? null
  // Time moves — rebuild starts_at/ends_at from whichever of date/time moved
  // (the surviving parts of the existing range fill the gaps).
  if (data.date !== undefined || data.start_time !== undefined || data.end_time !== undefined) {
    const date = data.date ?? new Date(existing.starts_at).toISOString().slice(0, 10)
    const startTime = data.start_time ?? clockOf(existing.starts_at)
    const endTime = data.end_time ?? clockOf(existing.ends_at)
    const { starts_at, ends_at } = combineShiftTimes(date, startTime, endTime)
    patch.starts_at = starts_at
    patch.ends_at = ends_at
  }
  if (data.staff_id !== undefined) {
    // Clearing to open or reassigning: a reassignment re-runs the conflict
    // check against the NEW window (times may have moved above).
    patch.staff_id = data.staff_id ?? null
    if (data.staff_id) {
      const range = {
        starts_at: (patch.starts_at as Date) ?? existing.starts_at,
        ends_at: (patch.ends_at as Date) ?? existing.ends_at,
      }
      const conflict = await findConflict(userId, data.staff_id, range, params.data.id)
      if (conflict) {
        conflictResponse(res, conflict)
        return
      }
    }
  } else if (patch.starts_at !== undefined && existing.staff_id) {
    // Times moved on an assigned shift — re-check the incumbent.
    const conflict = await findConflict(
      userId,
      existing.staff_id,
      { starts_at: patch.starts_at as Date, ends_at: patch.ends_at as Date },
      params.data.id,
    )
    if (conflict) {
      conflictResponse(res, conflict)
      return
    }
  }
  const result = await updateById<RawShift>('shifts', params.data.id, patch)
  const raw = (result.data ?? result) as RawShift
  const lookups = await buildLookups(userId)
  res.json(lookups.decorateShiftWithAvailability(raw))
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
  const existing = await findById<RawShift>('shifts', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
  }
  await deleteById('shifts', params.data.id)
  res.status(204).end()
})

/**
 * Publish (or unpublish) a whole week in one call — the manager action on
 * the Schedule screen. Publishing is what makes the week visible to staff
 * and makes its open shifts claimable.
 */
router.post('/publish', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  await ensureSeeded(userId)
  const parsed = publishBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  const { week_start, published } = parsed.data
  const lookups = await buildLookups(userId)
  const weekShifts = lookups.rawShifts.filter((s) => inWeek(s, week_start))
  for (const shift of weekShifts) {
    if (shift.published === published) continue
    await updateById<RawShift>('shifts', String(shift.id), {
      published,
      updated_at: new Date(),
    })
  }
  const items = await listShiftsForWeek(userId, week_start)
  res.json({
    week_start,
    published,
    count: items.filter((s) => s.published === published).length,
    shifts: items,
  })
})

export { decorateShift, inWeek, listShiftsForWeek }

export default router
