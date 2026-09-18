/**
 * Stats / dashboard aggregation handlers.
 *
 * All reads are scoped by `user_id`; per-habit endpoints additionally
 * verify the requesting user owns the habit. No raw SQL; aggregation is
 * done in JS over DataStore reads (cheap at flagship scale).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

interface HabitRow {
  id: string
  user_id: string
  name: string
  current_streak: number
  longest_streak: number
  total_completions: number
}

const habitIdParamSchema = z.object({ habitId: z.string().min(1) })

const overviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

router.get(
  '/overview',
  validateQuery(overviewQuerySchema),
  async (_req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const habits = await findMany<HabitRow>('habits', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'archived_at', operator: 'is_null', value: null },
      ],
      limit: 500,
    })

    const overview = {
      total_habits: habits.length,
      active_streaks: habits.filter((h) => h.current_streak > 0).length,
      best_streak: habits.reduce((max, h) => Math.max(max, h.longest_streak), 0),
      total_completions: habits.reduce((sum, h) => sum + h.total_completions, 0),
    }
    res.json(overview)
  },
)

router.get(
  '/heatmap/:habitId',
  validateParams(habitIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const habitId = String(req.params.habitId)
    const habit = await findById<HabitRow>('habits', habitId)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }

    const orderBy: OrderBy[] = [{ field: 'date', direction: 'asc' }]
    const entries = await findMany('habit_entries', {
      where: [
        { field: 'habit_id', operator: '=', value: habitId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy,
      limit: 1000,
    })
    res.json(entries)
  },
)

router.get('/weekly', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const habits = await findMany<HabitRow>('habits', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'archived_at', operator: 'is_null', value: null },
    ],
    limit: 200,
  })
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)

  const startStr = weekAgo.toISOString().slice(0, 10)
  const endStr = today.toISOString().slice(0, 10)

  const weekly: Array<{
    habit_id: string
    habit_name: string
    completed_days: number
    target_days: number
    rate: number
  }> = []
  for (const h of habits) {
    const where: WhereCondition[] = [
      { field: 'habit_id', operator: '=', value: h.id },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '>=', value: startStr },
      { field: 'date', operator: '<=', value: endStr },
    ]
    const entries = await findMany('habit_entries', { where, limit: 7 })
    weekly.push({
      habit_id: h.id,
      habit_name: h.name,
      completed_days: entries.length,
      target_days: 7,
      rate: Math.round((entries.length / 7) * 100),
    })
  }
  res.json(weekly)
})

export default router
