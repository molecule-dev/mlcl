import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { StudentPortalLimits } from '../tiers.js'
import { ensureStudentPortalSeeded } from './_seed.js'

const router = Router()

const ATTENDANCE_STATUSES = ['present', 'tardy', 'absent', 'excused'] as const

const createAttendanceSchema = z.object({
  course_id: z.string().min(1).optional(),
  date: z.string().optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  status: z.enum(ATTENDANCE_STATUSES),
  classes: z.number().int().min(0).optional(),
  note: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.start_date) {
    where.push({ field: 'date', operator: '>=', value: new Date(String(req.query.start_date)) })
  }
  if (req.query.end_date) {
    const end = new Date(String(req.query.end_date))
    end.setUTCHours(23, 59, 59, 999)
    where.push({ field: 'date', operator: '<=', value: end })
  }
  const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]
  const records = await findMany('attendance', { where, orderBy })
  res.json(records)
})

router.get('/summary', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const records = await findMany<{ status?: string }>('attendance', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const total = records.length
  const counts = { present: 0, tardy: 0, absent: 0, excused: 0 }
  for (const r of records) {
    const s = (r.status ?? 'present') as keyof typeof counts
    if (s in counts) counts[s] += 1
  }
  const presentRate = total > 0 ? counts.present / total : 0
  res.json({ total, ...counts, presentRate })
})

router.post(
  '/',
  enforceLimit<StudentPortalLimits>({
    limitType: 'maxAttendance',
    getLimit: (limits) => limits.maxAttendance,
    getCurrent: async (userId) =>
      count('attendance', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAttendanceSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
    }
    const date = req.body.date ? new Date(req.body.date) : new Date()
    const result = await create('attendance', {
      ...req.body,
      user_id: userId,
      date,
      weekday: req.body.weekday ?? date.getUTCDay(),
      classes: req.body.classes ?? 0,
      recorded_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const record = await findById<Record<string, unknown>>('attendance', id)
  if (!record || record.user_id !== userId) {
    return res.status(404).json({
      error: t('attendance.notFound', undefined, { defaultValue: 'Attendance record not found.' }),
    })
  }
  res.json(record)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const record = await findById<Record<string, unknown>>('attendance', id)
  if (!record || record.user_id !== userId) {
    return res.status(404).json({
      error: t('attendance.notFound', undefined, { defaultValue: 'Attendance record not found.' }),
    })
  }
  await deleteById('attendance', id)
  res.status(204).end()
})

export default router
