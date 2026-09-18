/**
 * Per-habit reminder CRUD. Backed by a cron / scheduler bond at runtime
 * (see `bonds/index.ts`); these handlers manage the persisted rows that
 * the scheduler reads from on each tick.
 *
 * Every read/write is owner-scoped via `user_id`; modifying another
 * user's reminder returns 404 to prevent enumeration.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const channelEnum = z.enum(['push', 'email'])

// HH:MM in 24-hour clock — hours 00-23, minutes 00-59. The looser
// `^\d{2}:\d{2}$` pattern accepted nonsense like "25:99"; tests assume
// real time validation.
const timeOfDayRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const createReminderSchema = z.object({
  habit_id: z.string().min(1),
  time_of_day: z.string().regex(timeOfDayRegex, 'expected HH:MM (00:00-23:59)'),
  days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  channel: channelEnum.default('push'),
  active: z.boolean().optional(),
})

const updateReminderSchema = z.object({
  time_of_day: z.string().regex(timeOfDayRegex).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  channel: channelEnum.optional(),
  active: z.boolean().optional(),
})

const listQuerySchema = z.object({
  habit_id: z.string().min(1).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { habit_id } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (habit_id) where.push({ field: 'habit_id', operator: '=', value: habit_id })
    const orderBy: OrderBy[] = [{ field: 'time_of_day', direction: 'asc' }]
    const reminders = await findMany('reminders', { where, orderBy, limit: 100 })
    res.json(reminders)
  },
)

router.post(
  '/',
  validateBody(createReminderSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createReminderSchema>
    const habit = await findById<{ user_id: string }>('habits', body.habit_id)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    const result = await create('reminders', {
      user_id: userId,
      habit_id: body.habit_id,
      time_of_day: body.time_of_day,
      // Stringify so pg writes a JSON value rather than coercing the JS
      // array into a Postgres array literal (the column is JSONB).
      days_of_week: JSON.stringify(body.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]),
      channel: body.channel,
      active: body.active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateReminderSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<{ user_id: string }>('reminders', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('reminders.notFound', undefined, { defaultValue: 'Reminder not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.days_of_week !== undefined) {
      // JSONB column — pg would otherwise serialize a JS array as a
      // postgres array literal and fail with "invalid input syntax for type json".
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const result = await updateById('reminders', id, {
      ...incoming,
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<{ user_id: string }>('reminders', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('reminders.notFound', undefined, { defaultValue: 'Reminder not found.' }),
      })
      return
    }
    await deleteMany('reminders', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
