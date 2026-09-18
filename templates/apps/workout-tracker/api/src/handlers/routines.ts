/**
 * Routine (workout-template) CRUD handlers.
 *
 * - Owner-scoped via `user_id`.
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - Inputs validated via @molecule/api-middleware-validation (zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 * - Routine exercises managed inline via the `/routines/:id/exercises`
 *   sub-routes; reorder via `/routines/:id/exercises/reorder`.
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

const enforceMaxRoutines = enforceLimit<WorkoutTrackerLimits>({
  limitType: 'maxRoutines',
  getLimit: (limits) => limits.maxRoutines,
  getCurrent: async (userId) =>
    count('routines', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const exerciseIdParamsSchema = z.object({ id: z.string().uuid(), exerciseId: z.string().uuid() })

const listQuerySchema = z.object({
  is_template: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createRoutineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  target_muscle_groups: z.array(z.string().max(64)).max(20).optional(),
  estimated_duration_minutes: z.number().int().min(0).max(720).nullable().optional(),
  day_count: z.number().int().min(1).max(31).optional(),
  is_template: z.boolean().optional(),
  is_public: z.boolean().optional(),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().uuid(),
        day_index: z.number().int().min(0).max(31).optional(),
        sort_order: z.number().int().min(0).max(99).optional(),
        order_index: z.number().int().min(0).max(99).optional(),
        target_sets: z.number().int().min(1).max(20).optional(),
        target_reps: z.number().int().min(1).max(99).optional(),
        target_rest_seconds: z.number().int().min(0).max(3600).optional(),
        sets: z.number().int().min(1).max(20).optional(),
        reps: z.number().int().min(1).max(99).optional(),
        rest_seconds: z.number().int().min(0).max(3600).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .max(50)
    .optional(),
})

const updateRoutineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  target_muscle_groups: z.array(z.string().max(64)).max(20).optional(),
  estimated_duration_minutes: z.number().int().min(0).max(720).nullable().optional(),
  day_count: z.number().int().min(1).max(31).optional(),
  is_template: z.boolean().optional(),
  is_public: z.boolean().optional(),
})

const addExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  day_index: z.number().int().min(0).max(31).optional(),
  sort_order: z.number().int().min(0).max(99).optional(),
  order_index: z.number().int().min(0).max(99).optional(),
  target_sets: z.number().int().min(1).max(20).optional(),
  target_reps: z.number().int().min(1).max(99).optional(),
  target_rest_seconds: z.number().int().min(0).max(3600).optional(),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(99).optional(),
  rest_seconds: z.number().int().min(0).max(3600).optional(),
  notes: z.string().max(1000).optional(),
})

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1).max(50),
})

const startSchema = z.object({
  day_index: z.number().int().min(0).max(31).optional(),
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
    const { is_template, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (is_template === 'true') where.push({ field: 'is_template', operator: '=', value: true })
    if (is_template === 'false') where.push({ field: 'is_template', operator: '=', value: false })

    const orderBy: OrderBy[] = [
      { field: 'name', direction: 'asc' },
      { field: 'created_at', direction: 'desc' },
    ]
    const routines = await findMany('routines', {
      where,
      orderBy,
      limit: limit ?? 50,
      offset: offset ?? 0,
    })
    res.json(routines)
  },
)

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
    const routine = await findById<Record<string, unknown>>('routines', id)
    if (!routine || routine.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    const exercises = await findMany('routine_exercises', {
      where: [{ field: 'routine_id', operator: '=', value: id }],
      orderBy: [
        { field: 'day_index', direction: 'asc' },
        { field: 'sort_order', direction: 'asc' },
        { field: 'order_index', direction: 'asc' },
      ],
    })
    res.json({ ...routine, exercises })
  },
)

router.post(
  '/',
  enforceMaxRoutines,
  validateBody(createRoutineSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createRoutineSchema>
    const result = await create<Record<string, unknown>>('routines', {
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      target_muscle_groups: JSON.stringify(body.target_muscle_groups ?? []),
      estimated_duration_minutes: body.estimated_duration_minutes ?? null,
      day_count: body.day_count ?? 1,
      is_template: body.is_template ?? false,
      is_public: body.is_public ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const routineId = String(result.data?.id ?? '')

    if (routineId && body.exercises?.length) {
      for (let i = 0; i < body.exercises.length; i++) {
        const ex = body.exercises[i]
        await create('routine_exercises', {
          routine_id: routineId,
          exercise_id: ex.exercise_id,
          day_index: ex.day_index ?? 0,
          sort_order: ex.sort_order ?? i,
          order_index: ex.order_index ?? i,
          target_sets: ex.target_sets ?? ex.sets ?? 3,
          target_reps: ex.target_reps ?? ex.reps ?? 10,
          target_rest_seconds: ex.target_rest_seconds ?? ex.rest_seconds ?? 90,
          sets: ex.sets ?? ex.target_sets ?? 3,
          reps: ex.reps ?? ex.target_reps ?? 10,
          rest_seconds: ex.rest_seconds ?? ex.target_rest_seconds ?? 90,
          notes: ex.notes ?? null,
          created_at: new Date(),
        })
      }
    }
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateRoutineSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('routines', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.target_muscle_groups !== undefined) {
      incoming.target_muscle_groups = JSON.stringify(incoming.target_muscle_groups)
    }
    const result = await updateById('routines', id, { ...incoming, updated_at: new Date() })
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
    const existing = await findById<Record<string, unknown>>('routines', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    await deleteMany('routine_exercises', [{ field: 'routine_id', operator: '=', value: id }])
    await deleteMany('routines', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

router.post(
  '/:id/exercises',
  validateParams(idParamSchema),
  validateBody(addExerciseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const routine = await findById<Record<string, unknown>>('routines', id)
    if (!routine || routine.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof addExerciseSchema>
    const existingCount = await count('routine_exercises', [
      { field: 'routine_id', operator: '=', value: id },
    ])
    const result = await create('routine_exercises', {
      routine_id: id,
      exercise_id: body.exercise_id,
      day_index: body.day_index ?? 0,
      sort_order: body.sort_order ?? existingCount,
      order_index: body.order_index ?? existingCount,
      target_sets: body.target_sets ?? body.sets ?? 3,
      target_reps: body.target_reps ?? body.reps ?? 10,
      target_rest_seconds: body.target_rest_seconds ?? body.rest_seconds ?? 90,
      sets: body.sets ?? body.target_sets ?? 3,
      reps: body.reps ?? body.target_reps ?? 10,
      rest_seconds: body.rest_seconds ?? body.target_rest_seconds ?? 90,
      notes: body.notes ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.delete(
  '/:id/exercises/:exerciseId',
  validateParams(exerciseIdParamsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const exerciseRowId = String(req.params.exerciseId)
    const routine = await findById<Record<string, unknown>>('routines', id)
    if (!routine || routine.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    await deleteMany('routine_exercises', [
      { field: 'id', operator: '=', value: exerciseRowId },
      { field: 'routine_id', operator: '=', value: id },
    ])
    res.status(204).end()
  },
)

router.post(
  '/:id/exercises/reorder',
  validateParams(idParamSchema),
  validateBody(reorderSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const routine = await findById<Record<string, unknown>>('routines', id)
    if (!routine || routine.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    const { order } = req.body as z.infer<typeof reorderSchema>
    for (let i = 0; i < order.length; i++) {
      const rowId = order[i]
      const row = await findById<Record<string, unknown>>('routine_exercises', rowId)
      if (!row || row.routine_id !== id) continue
      await updateById('routine_exercises', rowId, { sort_order: i, order_index: i })
    }
    res.json({ reordered: order.length })
  },
)

router.post(
  '/:id/start',
  validateParams(idParamSchema),
  validateBody(startSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const routine = await findById<Record<string, unknown>>('routines', id)
    if (!routine || routine.user_id !== userId) {
      res.status(404).json({
        error: t('routine.notFound', undefined, { defaultValue: 'Routine not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof startSchema>
    const dayIndex = body.day_index ?? 0
    const result = await create<Record<string, unknown>>('workouts', {
      user_id: userId,
      routine_id: id,
      day_index: dayIndex,
      name: routine.name ?? null,
      notes: null,
      started_at: new Date(),
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

export default router
