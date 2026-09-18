/**
 * Workout (logged session) CRUD handlers.
 *
 * - All reads/writes scoped by user_id (no IDOR).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - Inputs validated via @molecule/api-middleware-validation (zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { WorkoutTrackerLimits } from '../tiers.js'

const router = Router()

const enforceMaxWorkouts = enforceLimit<WorkoutTrackerLimits>({
  limitType: 'maxWorkouts',
  getLimit: (limits) => limits.maxWorkouts,
  getCurrent: async (userId) =>
    count('workouts', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const setIdParamsSchema = z.object({ id: z.string().uuid(), setId: z.string().uuid() })

const listQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  sort_by: z.enum(['started_at', 'completed_at', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  notes: z.string().max(2000).nullable().optional(),
  routine_id: z.string().uuid().nullable().optional(),
  day_index: z.number().int().min(0).max(31).nullable().optional(),
  body_weight_kg: z.number().nonnegative().nullable().optional(),
  started_at: z.string().datetime().optional(),
})

const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  notes: z.string().max(2000).nullable().optional(),
  body_weight_kg: z.number().nonnegative().nullable().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
})

const createSetSchema = z.object({
  exercise_id: z.string().uuid(),
  set_index: z.number().int().min(0).max(99).optional(),
  set_number: z.number().int().min(0).max(99).optional(),
  order_index: z.number().int().min(0).max(99).optional(),
  weight: z.number().nonnegative(),
  weight_kg: z.number().nonnegative().optional(),
  weight_unit: z.enum(['kg', 'lb']).optional(),
  reps: z.number().int().min(0).max(999),
  rpe: z.number().min(0).max(10).nullable().optional(),
  rest_seconds: z.number().int().min(0).max(7200).nullable().optional(),
  is_warmup: z.boolean().optional(),
  is_dropset: z.boolean().optional(),
  is_completed: z.boolean().optional(),
})

const updateSetSchema = createSetSchema.partial().extend({
  exercise_id: z.string().uuid().optional(),
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
    const { start_date, end_date, status, sort_by, sort_order, limit, offset } =
      req.query as z.infer<typeof listQuerySchema>

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (start_date) where.push({ field: 'started_at', operator: '>=', value: start_date })
    if (end_date) where.push({ field: 'started_at', operator: '<=', value: end_date })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const orderBy: OrderBy[] = [{ field: sort_by ?? 'started_at', direction: sort_order ?? 'desc' }]
    const workouts = await findMany('workouts', {
      where,
      orderBy,
      limit: limit ?? 50,
      offset: offset ?? 0,
    })
    res.json(workouts)
  },
)

router.get('/active', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const items = await findMany<Record<string, unknown>>('workouts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'in_progress' },
    ],
    orderBy: [{ field: 'started_at', direction: 'desc' }],
    limit: 1,
  })
  res.json(items[0] ?? null)
})

router.get(
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
    const workout = await findById<Record<string, unknown>>('workouts', id)
    if (!workout || workout.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    const sets = await findMany('workout_sets', {
      where: [{ field: 'workout_id', operator: '=', value: id }],
      orderBy: [
        { field: 'set_index', direction: 'asc' },
        { field: 'created_at', direction: 'asc' },
      ],
    })
    res.json({ ...workout, sets })
  },
)

router.post(
  '/',
  enforceMaxWorkouts,
  validateBody(createWorkoutSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createWorkoutSchema>
    // Validate routine ownership if provided.
    if (body.routine_id) {
      const r = await findById<Record<string, unknown>>('routines', body.routine_id)
      if (!r || r.user_id !== userId) {
        res.status(404).json({
          error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
        })
        return
      }
    }
    const result = await create('workouts', {
      user_id: userId,
      routine_id: body.routine_id ?? null,
      day_index: body.day_index ?? null,
      name: body.name ?? null,
      notes: body.notes ?? null,
      body_weight_kg: body.body_weight_kg ?? null,
      started_at: body.started_at ? new Date(body.started_at) : new Date(),
      completed_at: null,
      duration_seconds: 0,
      total_volume: 0,
      total_volume_kg: 0,
      status: 'in_progress',
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateWorkoutSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('workouts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    const result = await updateById('workouts', id, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.post(
  '/:id/complete',
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
    const workout = await findById<Record<string, unknown>>('workouts', id)
    if (!workout || workout.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }

    const sets = await findMany<Record<string, unknown>>('workout_sets', {
      where: [{ field: 'workout_id', operator: '=', value: id }],
    })

    const totalVolume = sets.reduce((sum, set) => {
      if (set.is_warmup === true) return sum // warmup sets don't count toward working volume
      const w = Number(set.weight_kg ?? set.weight ?? 0)
      const r = Number(set.reps ?? 0)
      return sum + w * r
    }, 0)

    const startedAt = new Date(String(workout.started_at))
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))

    const result = await updateById('workouts', id, {
      completed_at: new Date(),
      duration_seconds: durationSeconds,
      total_volume: totalVolume,
      total_volume_kg: totalVolume,
      status: 'completed',
      updated_at: new Date(),
    })

    // Recompute simple personal records (estimated 1RM via Epley).
    await recomputePersonalRecords(userId, sets)

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
    const existing = await findById<Record<string, unknown>>('workouts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    await deleteMany('workout_sets', [{ field: 'workout_id', operator: '=', value: id }])
    await deleteMany('workouts', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

router.post(
  '/:id/sets',
  validateParams(idParamSchema),
  validateBody(createSetSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const workout = await findById<Record<string, unknown>>('workouts', id)
    if (!workout || workout.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createSetSchema>
    const weightKg = body.weight_kg ?? body.weight
    const setIndex = body.set_index ?? body.set_number ?? body.order_index ?? 0
    const result = await create('workout_sets', {
      workout_id: id,
      user_id: userId,
      exercise_id: body.exercise_id,
      set_index: setIndex,
      set_number: body.set_number ?? setIndex,
      order_index: body.order_index ?? setIndex,
      weight: body.weight,
      weight_kg: weightKg,
      weight_unit: body.weight_unit ?? 'kg',
      reps: body.reps,
      rpe: body.rpe ?? null,
      is_warmup: body.is_warmup ?? false,
      is_dropset: body.is_dropset ?? false,
      is_completed: body.is_completed ?? true,
      completed_at: body.is_completed === false ? null : new Date(),
      rest_seconds: body.rest_seconds ?? null,
      rest_seconds_actual: body.rest_seconds ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id/sets/:setId',
  validateParams(setIdParamsSchema),
  validateBody(updateSetSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const setId = String(req.params.setId)
    const workout = await findById<Record<string, unknown>>('workouts', id)
    if (!workout || workout.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    const setRow = await findById<Record<string, unknown>>('workout_sets', setId)
    if (!setRow || setRow.workout_id !== id) {
      res.status(404).json({
        error: t('workoutSet.notFound', undefined, { defaultValue: 'Set not found.' }),
      })
      return
    }
    const result = await updateById('workout_sets', setId, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.delete(
  '/:id/sets/:setId',
  validateParams(setIdParamsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const setId = String(req.params.setId)
    const workout = await findById<Record<string, unknown>>('workouts', id)
    if (!workout || workout.user_id !== userId) {
      res.status(404).json({
        error: t('workout.notFound', undefined, { defaultValue: 'Workout not found.' }),
      })
      return
    }
    await deleteMany('workout_sets', [
      { field: 'id', operator: '=', value: setId },
      { field: 'workout_id', operator: '=', value: id },
    ])
    res.status(204).end()
  },
)

/**
 * Epley 1RM estimate: weight × (1 + reps/30). Recomputes 1rm_estimated
 * personal records per exercise after a workout completes; only stores
 * a row when the new estimate exceeds the previous best.
 */
async function recomputePersonalRecords(
  userId: string,
  sets: Array<Record<string, unknown>>,
): Promise<void> {
  const bestPerExercise = new Map<string, number>()
  for (const s of sets) {
    if (s.is_warmup === true) continue // a warmup set must not register a personal record
    const exId = String(s.exercise_id ?? '')
    if (!exId) continue
    const w = Number(s.weight_kg ?? s.weight ?? 0)
    const r = Number(s.reps ?? 0)
    if (w <= 0 || r <= 0) continue
    const est = epley1RM(w, r)
    const cur = bestPerExercise.get(exId) ?? 0
    if (est > cur) bestPerExercise.set(exId, est)
  }
  for (const [exerciseId, value] of bestPerExercise) {
    const existing = await findMany<Record<string, unknown>>('personal_records', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'exercise_id', operator: '=', value: exerciseId },
        { field: 'kind', operator: '=', value: '1rm_estimated' },
      ],
      orderBy: [{ field: 'value', direction: 'desc' }],
      limit: 1,
    })
    const previous = existing[0] ? Number(existing[0].value ?? 0) : 0
    if (value > previous) {
      await create('personal_records', {
        user_id: userId,
        exercise_id: exerciseId,
        kind: '1rm_estimated',
        value,
        achieved_at: new Date(),
        created_at: new Date(),
      })
    }
  }
}

function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export default router
