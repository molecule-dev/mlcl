/**
 * Exercise grading handler.
 *
 * - Submit endpoint records the exercise_result against the SESSION user_id
 *   (never the request body) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, findById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { LanguageLearningLimits } from '../tiers.js'

const router = Router()

const submitSchema = z.object({
  answer: z.string().min(1).max(8000),
  time_taken_ms: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000)
    .optional(),
})

const enforceMaxExercises = enforceLimit<LanguageLearningLimits>({
  limitType: 'maxExercisesPerDay',
  getLimit: (limits) => limits.maxExercises,
  getCurrent: async (userId) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return count('exercise_results', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'completed_at', operator: '>=', value: startOfDay.toISOString() },
    ])
  },
}) as unknown as RequestHandler

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const exercise = await findById<Record<string, unknown>>('exercises', String(req.params.id))
    if (!exercise) {
      res.status(404).json({
        error: t('exercises.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    res.json(exercise)
  },
)

router.post(
  '/:id/submit',
  validateParams(idParamSchema),
  enforceMaxExercises,
  validateBody(submitSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const exerciseId = String(req.params.id)
    const exercise = await findById<Record<string, unknown>>('exercises', exerciseId)
    if (!exercise) {
      res.status(404).json({
        error: t('exercises.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof submitSchema>
    const isCorrect = body.answer === (exercise.correct_answer as string)
    const xpEarned = isCorrect ? Number(exercise.xp_value ?? 0) : 0

    const result = await create('exercise_results', {
      exercise_id: exerciseId,
      user_id: userId,
      answer: body.answer,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      time_taken_ms: body.time_taken_ms ?? 0,
      completed_at: new Date(),
    })

    res.status(201).json({
      ...((result as { data: Record<string, unknown> }).data ?? {}),
      is_correct: isCorrect,
      xp_earned: xpEarned,
      correct_answer: exercise.correct_answer,
      explanation: exercise.explanation,
    })
  },
)

export default router
