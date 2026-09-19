/**
 * Schedules handler — rotations, materialized coverage shifts, overrides.
 *
 * A schedule owns an ordered member rotation + a cadence (daily | weekly,
 * handoff HH:MM). Non-override shifts are MATERIALIZED rows (the seed and
 * `materializeRotation` write schedule_shifts spanning ~2 periods back and
 * 4 rounds forward), so "who is on call now" and the coverage calendar are
 * plain window queries — no cron needed for V1. Editing members/cadence
 * regenerates the rotation window while PRESERVING override rows (holiday
 * cover survives rotation edits).
 *
 * Boundary math is UTC in V1; the timezone column is display metadata.
 * DST-aware local handoffs would need per-zone calendar math — deferred.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { findCurrentOncall, loadRoster, type RosterMember } from './_roster.js'
import { latestRotationBoundary, MS_PER_DAY, MS_PER_WEEK, seedDemoForUser } from './_seed.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  timezone: z.string().max(100).optional(),
  rotation_type: z.enum(['daily', 'weekly']).optional(),
  handoff_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'HH:MM')
    .optional(),
  members: z.array(z.string().uuid()).max(50).optional(),
})

const updateSchema = createSchema.partial().extend({
  is_active: z.boolean().optional(),
})

const overrideSchema = z.object({
  member_id: z.string().uuid(),
  start_at: z.string().min(10),
  end_at: z.string().min(10),
  note: z.string().max(500).optional(),
})

interface ScheduleRow {
  id: string
  user_id: string
  name: string
  description: string
  timezone: string
  rotation_type: string
  handoff_time: string
  members: unknown
  is_active: boolean
}

/** members jsonb arrives as a string (pg) — parse to string[] safely. */
const parseMembers = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      return []
    }
  }
  return []
}

/**
 * (Re)generate the rotation window for a schedule: delete non-override
 * shifts, then write one shift per member per round from 2 periods before
 * the latest boundary, for 4 rounds. Overrides are untouched.
 */
const materializeRotation = async (
  userId: string,
  schedule: ScheduleRow,
  memberIds: string[],
): Promise<number> => {
  await deleteMany('schedule_shifts', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'schedule_id', operator: '=', value: schedule.id },
    { field: 'is_override', operator: '=', value: false },
  ])
  if (memberIds.length === 0) return 0
  const periodMs = schedule.rotation_type === 'daily' ? MS_PER_DAY : MS_PER_WEEK
  const boundary = latestRotationBoundary(schedule.rotation_type, schedule.handoff_time)
  const start = new Date(boundary.getTime() - 2 * periodMs)
  const rounds = 4
  let written = 0
  for (let i = 0; i < memberIds.length * rounds; i++) {
    const shiftStart = new Date(start.getTime() + i * periodMs)
    const memberId = memberIds[i % memberIds.length]!
    await create('schedule_shifts', {
      user_id: userId,
      schedule_id: schedule.id,
      member_id: memberId,
      start_at: shiftStart,
      end_at: new Date(shiftStart.getTime() + periodMs),
      is_override: false,
      note: null,
      created_at: new Date(),
    })
    written++
  }
  return written
}

const projectSchedule = async (
  userId: string,
  schedule: ScheduleRow,
  roster: Map<string, RosterMember>,
): Promise<Record<string, unknown>> => {
  const oncall = await findCurrentOncall(userId, schedule.id, roster)
  const members = parseMembers(schedule.members)
  return {
    ...schedule,
    members,
    member_details: members.map((id) => roster.get(id)).filter(Boolean),
    current_oncall: oncall,
  }
}

const loadOwnedSchedule = async (userId: string, id: string): Promise<ScheduleRow | null> => {
  const row = await findById<ScheduleRow>('schedules', id)
  if (!row || row.user_id !== userId) return null
  return row
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)
  const schedules = await findMany<ScheduleRow>('schedules', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 100,
  })
  const roster = await loadRoster(userId)
  const projected = []
  for (const schedule of schedules) {
    projected.push(await projectSchedule(userId, schedule, roster))
  }
  res.json(projected)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const members = body.members ?? []
  const created = await create<ScheduleRow>('schedules', {
    user_id: userId,
    name: body.name,
    description: body.description ?? '',
    timezone: body.timezone ?? 'UTC',
    rotation_type: body.rotation_type ?? 'weekly',
    handoff_time: body.handoff_time ?? '09:00',
    members: JSON.stringify(members),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const schedule = created.data
  if (!schedule) {
    return res.status(500).json({
      error: t('schedules.createFailed', {}, { defaultValue: 'Could not create schedule' }),
    })
  }
  const shiftCount = await materializeRotation(userId, schedule, members)
  const roster = await loadRoster(userId)
  res
    .status(201)
    .json({ ...(await projectSchedule(userId, schedule, roster)), shift_count: shiftCount })
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const schedule = await loadOwnedSchedule(userId, id)
  if (!schedule) {
    return res
      .status(404)
      .json({ error: t('schedules.notFound', {}, { defaultValue: 'Schedule not found' }) })
  }
  // Window: 14 days back .. 28 days forward — the coverage calendar's span.
  const windowStart = new Date(Date.now() - 14 * MS_PER_DAY)
  const windowEnd = new Date(Date.now() + 28 * MS_PER_DAY)
  const shifts = await findMany<{
    id: string
    member_id: string
    start_at: string
    end_at: string
    is_override: boolean
    note: string | null
  }>('schedule_shifts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'schedule_id', operator: '=', value: id },
      { field: 'end_at', operator: '>', value: windowStart },
      { field: 'start_at', operator: '<', value: windowEnd },
    ],
    orderBy: [{ field: 'start_at', direction: 'asc' }],
    limit: 500,
  })
  const roster = await loadRoster(userId)
  const openCount = await count('incidents', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'schedule_id', operator: '=', value: id },
    { field: 'status', operator: '!=', value: 'resolved' },
  ])
  const projectedShifts = shifts.map((s) => ({
    ...s,
    is_override: Boolean(s.is_override),
    member_name: roster.get(String(s.member_id))?.name ?? 'Responder',
  }))
  res.json({
    ...(await projectSchedule(userId, schedule, roster)),
    shifts: projectedShifts,
    open_incidents: Number(openCount),
  })
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const schedule = await loadOwnedSchedule(userId, id)
  if (!schedule) {
    return res
      .status(404)
      .json({ error: t('schedules.notFound', {}, { defaultValue: 'Schedule not found' }) })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const membersChanged = body.members !== undefined
  const cadenceChanged = body.rotation_type !== undefined || body.handoff_time !== undefined
  const nextMembers = membersChanged ? body.members! : parseMembers(schedule.members)
  const result = await updateById<ScheduleRow>('schedules', id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    ...(body.rotation_type !== undefined ? { rotation_type: body.rotation_type } : {}),
    ...(body.handoff_time !== undefined ? { handoff_time: body.handoff_time } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(membersChanged ? { members: JSON.stringify(nextMembers) } : {}),
    updated_at: new Date(),
  })
  const updated = result.data ?? schedule
  let shiftCount: number | null = null
  if (membersChanged || cadenceChanged) {
    shiftCount = await materializeRotation(
      userId,
      { ...schedule, ...updated } as ScheduleRow,
      nextMembers,
    )
  }
  const roster = await loadRoster(userId)
  res.json({
    ...(await projectSchedule(userId, { ...schedule, ...updated } as ScheduleRow, roster)),
    ...(shiftCount !== null ? { shift_count: shiftCount } : {}),
  })
})

/** Holiday / swap override: takes precedence over rotation shifts. */
router.post('/:id/overrides', validateBody(overrideSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const schedule = await loadOwnedSchedule(userId, id)
  if (!schedule) {
    return res
      .status(404)
      .json({ error: t('schedules.notFound', {}, { defaultValue: 'Schedule not found' }) })
  }
  const body = req.body as z.infer<typeof overrideSchema>
  const start = new Date(body.start_at)
  const end = new Date(body.end_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({
      error: t('schedules.badWindow', {}, { defaultValue: 'end_at must be after start_at' }),
    })
  }
  const roster = await loadRoster(userId)
  if (!roster.has(body.member_id)) {
    return res.status(404).json({
      error: t('team.notFound', {}, { defaultValue: 'Member not found' }),
    })
  }
  const created = await create('schedule_shifts', {
    user_id: userId,
    schedule_id: id,
    member_id: body.member_id,
    start_at: start,
    end_at: end,
    is_override: true,
    note: body.note ?? null,
    created_at: new Date(),
  })
  res.status(201).json({
    ...created.data,
    member_name: roster.get(body.member_id)?.name ?? 'Responder',
  })
})

/** Remove an override (or any single shift) by id. */
router.delete('/shifts/:shiftId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const shiftId = String(req.params.shiftId ?? '')
  const shift = await findById<{ user_id: string }>('schedule_shifts', shiftId)
  if (!shift || shift.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('schedules.shiftNotFound', {}, { defaultValue: 'Shift not found' }) })
  }
  await deleteById('schedule_shifts', shiftId)
  res.status(204).end()
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const schedule = await loadOwnedSchedule(userId, id)
  if (!schedule) {
    return res
      .status(404)
      .json({ error: t('schedules.notFound', {}, { defaultValue: 'Schedule not found' }) })
  }
  await deleteMany('schedule_shifts', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'schedule_id', operator: '=', value: id },
  ])
  await deleteById('schedules', id)
  res.status(204).end()
})

export default router
