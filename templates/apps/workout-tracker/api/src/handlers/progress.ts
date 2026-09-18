/**
 * Progress / analytics handlers — aggregate metrics over a user's
 * completed workouts (volume over time, current workout streak, summary
 * counts, personal records).
 *
 * - Owner-scoped via session.userId.
 * - Inputs validated via @molecule/api-middleware-validation (zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const summaryQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).optional(),
})

const volumeQuerySchema = z.object({
  exercise_id: z.string().uuid().optional(),
  period: z.coerce.number().int().min(1).max(365).optional(),
})

const recordsQuerySchema = z.object({
  exercise_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

router.get(
  '/summary',
  validateQuery(summaryQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { period } = req.query as z.infer<typeof summaryQuerySchema>
    const days = period ?? 30
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const workouts = await findMany<Record<string, unknown>>('workouts', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'completed' },
        { field: 'started_at', operator: '>=', value: since },
      ],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: 500,
    })

    const totalWorkouts = workouts.length
    const totalVolume = workouts.reduce(
      (s, w) => s + Number(w.total_volume_kg ?? w.total_volume ?? 0),
      0,
    )
    const totalDuration = workouts.reduce((s, w) => s + Number(w.duration_seconds ?? 0), 0)
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0

    res.json({
      period: days,
      total_workouts: totalWorkouts,
      total_volume: totalVolume,
      total_duration_seconds: totalDuration,
      avg_duration_seconds: avgDuration,
    })
  },
)

router.get(
  '/personal-records',
  validateQuery(recordsQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { exercise_id, limit } = req.query as z.infer<typeof recordsQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (exercise_id) where.push({ field: 'exercise_id', operator: '=', value: exercise_id })

    const orderBy: OrderBy[] = [{ field: 'achieved_at', direction: 'desc' }]
    const records = await findMany('personal_records', {
      where,
      orderBy,
      limit: limit ?? 100,
    })
    res.json(records)
  },
)

router.get(
  '/volume-over-time',
  validateQuery(volumeQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { exercise_id, period } = req.query as z.infer<typeof volumeQuerySchema>
    const days = period ?? 90
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const workouts = await findMany<Record<string, unknown>>('workouts', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'completed' },
        { field: 'started_at', operator: '>=', value: since },
      ],
      orderBy: [{ field: 'started_at', direction: 'asc' }],
      limit: 500,
    })

    if (exercise_id) {
      const workoutIds = workouts.map((w) => String(w.id))
      if (workoutIds.length === 0) {
        res.json([])
        return
      }
      const sets = await findMany<Record<string, unknown>>('workout_sets', {
        where: [
          { field: 'workout_id', operator: 'in', value: workoutIds },
          { field: 'exercise_id', operator: '=', value: exercise_id },
        ],
      })
      res.json(groupVolumeByDate(sets, workouts))
      return
    }

    res.json(
      workouts.map((w) => ({
        date: dateKey(w.started_at),
        volume: Number(w.total_volume_kg ?? w.total_volume ?? 0),
      })),
    )
  },
)

router.get('/streak', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const workouts = await findMany<Record<string, unknown>>('workouts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'completed' },
    ],
    orderBy: [{ field: 'started_at', direction: 'desc' }],
    select: ['started_at'],
    limit: 365,
  })

  const dates = Array.from(new Set(workouts.map((w) => dateKey(w.started_at))))
  dates.sort((a, b) => b.localeCompare(a))

  const today = dateKey(new Date())
  const yesterday = dateKey(new Date(Date.now() - 86_400_000))
  let streak = 0
  let cursor = dates[0] === today ? today : dates[0] === yesterday ? yesterday : null
  if (cursor) {
    for (const d of dates) {
      if (d === cursor) {
        streak++
        const prev = new Date(cursor + 'T00:00:00Z')
        prev.setUTCDate(prev.getUTCDate() - 1)
        cursor = dateKey(prev)
      } else if (d < cursor) {
        break
      }
    }
  }

  res.json({ current_streak: streak, total_workout_days: dates.length })
})

function dateKey(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)
  return ''
}

function groupVolumeByDate(
  sets: Array<Record<string, unknown>>,
  workouts: Array<Record<string, unknown>>,
): Array<{ date: string; volume: number }> {
  const workoutDates = new Map<string, string>()
  for (const w of workouts) workoutDates.set(String(w.id), dateKey(w.started_at))

  const volumeMap = new Map<string, number>()
  for (const s of sets) {
    if (s.is_warmup === true) continue // exclude warmup sets from working-volume-over-time
    const date = workoutDates.get(String(s.workout_id)) ?? 'unknown'
    const w = Number(s.weight_kg ?? s.weight ?? 0)
    const r = Number(s.reps ?? 0)
    volumeMap.set(date, (volumeMap.get(date) ?? 0) + w * r)
  }
  return Array.from(volumeMap.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export default router
