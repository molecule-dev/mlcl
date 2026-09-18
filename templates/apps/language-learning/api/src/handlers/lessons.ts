/**
 * Lesson catalog handlers.
 *
 * - Lessons / exercises lists are public (read-only catalog) — no `user_id`
 *   ownership scoping is needed because the rows are shared system content,
 *   not per-user data. Per-user progress against a lesson lives in the
 *   `progress.ts` and `exercises.ts` handlers, which DO scope by session
 *   userId (no IDOR).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const unitIdParamSchema = z.object({ unitId: z.string().min(1) })

const listQuerySchema = z.object({
  course_id: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (q.course_id) where.push({ field: 'course_id', operator: '=', value: q.course_id })
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const lessons = await findMany('lessons', {
      where,
      orderBy,
      limit: q.limit ?? 200,
      offset: q.offset ?? 0,
    })
    res.json(lessons)
  },
)

router.get(
  '/unit/:unitId',
  validateParams(unitIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const unitId = String(req.params.unitId)
    const where: WhereCondition[] = [{ field: 'unit_id', operator: '=', value: unitId }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const lessons = await findMany('lessons', { where, orderBy, limit: 200 })
    res.json(lessons)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const lesson = await findById<Record<string, unknown>>('lessons', String(req.params.id))
    if (!lesson) {
      res.status(404).json({
        error: t('lessons.notFound', undefined, { defaultValue: 'Lesson not found.' }),
      })
      return
    }
    res.json(lesson)
  },
)

router.get(
  '/:id/exercises',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const lessonId = String(req.params.id)
    const where: WhereCondition[] = [{ field: 'lesson_id', operator: '=', value: lessonId }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const exercises = await findMany('exercises', { where, orderBy, limit: 200 })
    res.json(exercises)
  },
)

export default router
