import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  buildLookups,
  type DecoratedAvailabilityWindow,
  type DecoratedBlackoutDate,
  type RawAvailability,
  type RawBlackoutDate,
} from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)

const windowQuerySchema = z.object({
  staff_id: z.string().uuid().optional(),
})

const windowBodySchema = z.object({
  staff_id: z.string().uuid(),
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: timeSchema,
  end_time: timeSchema,
})

const blackoutQuerySchema = z.object({
  staff_id: z.string().uuid().optional(),
})

const blackoutBodySchema = z.object({
  staff_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional().nullable(),
})

function isValidWindow(start: string, end: string): boolean {
  return start < end
}

// --- recurring weekly windows ---

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = windowQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (parsed.data.staff_id)
    where.push({ field: 'staff_id', operator: '=' as const, value: parsed.data.staff_id })
  const rows = await findMany<RawAvailability>('availabilities', { where })
  const lookups = await buildLookups(userId)
  const decorated: DecoratedAvailabilityWindow[] = rows.map((w) => {
    const staff = lookups.staffById(w.staff_id)
    return {
      id: w.id,
      staff_id: w.staff_id,
      staff_name: staff?.name ?? 'Unknown',
      staff_initial: staff?.avatar_initial ?? '?',
      weekday: Number(w.weekday),
      start_time: w.start_time,
      end_time: w.end_time,
    }
  })
  decorated.sort((a, b) => a.staff_name.localeCompare(b.staff_name) || a.weekday - b.weekday)
  res.json(decorated)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = windowBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  if (!isValidWindow(body.start_time, body.end_time)) {
    return res.status(400).json({
      error: t(
        'availability.windowInvalid',
        {},
        { defaultValue: 'The window must end after it starts.' },
      ),
    })
  }
  // Idempotent: an identical window for the same staff/day already exists →
  // return it instead of stacking duplicates.
  const existing = await findMany<RawAvailability>('availabilities', {
    where: [
      { field: 'user_id', operator: '=' as const, value: userId },
      { field: 'staff_id', operator: '=' as const, value: body.staff_id },
      { field: 'weekday', operator: '=' as const, value: body.weekday },
      { field: 'start_time', operator: '=' as const, value: body.start_time },
      { field: 'end_time', operator: '=' as const, value: body.end_time },
    ],
  })
  if (existing[0]) return res.status(200).json(existing[0])
  const result = await create<RawAvailability>('availabilities', {
    user_id: userId,
    staff_id: body.staff_id,
    weekday: body.weekday,
    start_time: body.start_time,
    end_time: body.end_time,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json((result.data ?? result) as RawAvailability)
})

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
  const existing = await findMany<RawAvailability>('availabilities', {
    where: [{ field: 'user_id', operator: '=' as const, value: userId }],
  })
  if (!existing.some((w) => String(w.id) === params.data.id)) {
    return res
      .status(404)
      .json({ error: t('availability.notFound', {}, { defaultValue: 'Window not found' }) })
  }
  await deleteById('availabilities', params.data.id)
  res.status(204).end()
})

// --- blackout dates ---

router.get('/blackouts', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = blackoutQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (parsed.data.staff_id)
    where.push({ field: 'staff_id', operator: '=' as const, value: parsed.data.staff_id })
  const rows = await findMany<RawBlackoutDate>('blackout_dates', { where })
  const lookups = await buildLookups(userId)
  const decorated: DecoratedBlackoutDate[] = rows.map((b) => {
    const staff = lookups.staffById(b.staff_id)
    return {
      id: b.id,
      staff_id: b.staff_id,
      staff_name: staff?.name ?? 'Unknown',
      staff_initial: staff?.avatar_initial ?? '?',
      date: b.date,
      reason: b.reason ?? '',
    }
  })
  decorated.sort((a, b) => a.date.localeCompare(b.date))
  res.json(decorated)
})

router.post('/blackouts', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = blackoutBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  const existing = await findMany<RawBlackoutDate>('blackout_dates', {
    where: [
      { field: 'user_id', operator: '=' as const, value: userId },
      { field: 'staff_id', operator: '=' as const, value: body.staff_id },
      { field: 'date', operator: '=' as const, value: body.date },
    ],
  })
  if (existing[0]) return res.status(200).json(existing[0])
  const result = await create<RawBlackoutDate>('blackout_dates', {
    user_id: userId,
    staff_id: body.staff_id,
    date: body.date,
    reason: body.reason ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json((result.data ?? result) as RawBlackoutDate)
})

router.delete('/blackouts/:id', async (req: Request, res: Response) => {
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
  const existing = await findMany<RawBlackoutDate>('blackout_dates', {
    where: [{ field: 'user_id', operator: '=' as const, value: userId }],
  })
  if (!existing.some((b) => String(b.id) === params.data.id)) {
    return res.status(404).json({
      error: t('availability.blackoutNotFound', {}, { defaultValue: 'Blackout date not found' }),
    })
  }
  await deleteById('blackout_dates', params.data.id)
  res.status(204).end()
})

export default router
