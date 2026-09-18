/**
 * Course catalog + per-user enrollment handlers.
 *
 * - Course / unit reads are public (catalog).
 * - Enrollment writes scope by `user_id` from the session — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const orderBy: OrderBy[] = [{ field: 'language_name', direction: 'asc' }]
  const courses = await findMany('language_courses', { orderBy, limit: 200 })
  res.json(courses)
})

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const course = await findById<Record<string, unknown>>(
      'language_courses',
      String(req.params.id),
    )
    if (!course) {
      res.status(404).json({
        error: t('courses.notFound', undefined, { defaultValue: 'Course not found.' }),
      })
      return
    }
    res.json(course)
  },
)

router.get(
  '/:id/units',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const courseId = String(req.params.id)
    const where: WhereCondition[] = [{ field: 'course_id', operator: '=', value: courseId }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const units = await findMany('units', { where, orderBy, limit: 200 })
    res.json(units)
  },
)

router.post(
  '/:id/enroll',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const courseId = String(req.params.id)
    const course = await findById<Record<string, unknown>>('language_courses', courseId)
    if (!course) {
      res.status(404).json({
        error: t('courses.notFound', undefined, { defaultValue: 'Course not found.' }),
      })
      return
    }
    const result = await create('course_enrollments', {
      course_id: courseId,
      user_id: userId,
      current_unit: 0,
      current_lesson: 0,
      enrolled_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

export default router
