/**
 * Personal-record reads (estimated 1RM, 1RM, 3RM, 5RM, max-volume,
 * max-reps). Records are written automatically when a workout completes
 * (see workouts.ts:recomputePersonalRecords); this surface only exposes
 * read-by-list and a manual `POST /records` for users who log a tested
 * 1RM outside a workout.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  exercise_id: z.string().uuid().optional(),
  kind: z.enum(['1rm_estimated', '1rm', '3rm', '5rm', 'max_volume', 'max_reps']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createSchema = z.object({
  exercise_id: z.string().uuid(),
  kind: z.enum(['1rm', '3rm', '5rm', 'max_volume', 'max_reps']),
  value: z.number().positive(),
  workout_id: z.string().uuid().nullable().optional(),
  achieved_at: z.string().datetime().optional(),
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
    const { exercise_id, kind, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (exercise_id) where.push({ field: 'exercise_id', operator: '=', value: exercise_id })
    if (kind) where.push({ field: 'kind', operator: '=', value: kind })
    const orderBy: OrderBy[] = [{ field: 'achieved_at', direction: 'desc' }]
    const records = await findMany('personal_records', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(records)
  },
)

router.post('/', validateBody(createSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('personal_records', {
    user_id: userId,
    exercise_id: body.exercise_id,
    workout_id: body.workout_id ?? null,
    kind: body.kind,
    value: body.value,
    achieved_at: body.achieved_at ? new Date(body.achieved_at) : new Date(),
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

export default router
