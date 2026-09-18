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

const createScheduleEntrySchema = z.object({
  course_id: z.string().min(1).optional(),
  course_name: z.string().min(1),
  subject: z.string().optional(),
  teacher: z.string().optional(),
  room: z.string().optional(),
  period_label: z.string().optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  day: z.number().int().min(0).max(6).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  date: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [
    { field: 'weekday', direction: 'asc' },
    { field: 'start_time', direction: 'asc' },
  ]
  const entries = await findMany('schedule_entries', { where, orderBy })
  res.json(entries)
})

router.get('/today', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const todayWeekday = new Date().getUTCDay()
  // Treat Sat/Sun as Monday for the demo so today's strip is never empty.
  const effectiveDay = todayWeekday === 0 || todayWeekday === 6 ? 1 : todayWeekday
  const where: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'weekday', operator: '=', value: effectiveDay },
  ]
  const orderBy: OrderBy[] = [{ field: 'start_time', direction: 'asc' }]
  const entries = await findMany('schedule_entries', { where, orderBy })
  res.json(entries)
})

router.get('/week', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [
    { field: 'weekday', direction: 'asc' },
    { field: 'start_time', direction: 'asc' },
  ]
  const entries = await findMany('schedule_entries', { where, orderBy })
  res.json(entries)
})

router.post(
  '/',
  enforceLimit<StudentPortalLimits>({
    limitType: 'maxSchedule',
    getLimit: (limits) => limits.maxSchedule,
    getCurrent: async (userId) =>
      count('schedule_entries', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createScheduleEntrySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
    }
    const result = await create('schedule_entries', {
      ...req.body,
      user_id: userId,
      date: req.body.date ? new Date(req.body.date) : null,
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
  const entry = await findById<Record<string, unknown>>('schedule_entries', id)
  if (!entry || entry.user_id !== userId) {
    return res.status(404).json({
      error: t('schedule.notFound', undefined, { defaultValue: 'Schedule entry not found.' }),
    })
  }
  res.json(entry)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const entry = await findById<Record<string, unknown>>('schedule_entries', id)
  if (!entry || entry.user_id !== userId) {
    return res.status(404).json({
      error: t('schedule.notFound', undefined, { defaultValue: 'Schedule entry not found.' }),
    })
  }
  await deleteById('schedule_entries', id)
  res.status(204).end()
})

export default router
