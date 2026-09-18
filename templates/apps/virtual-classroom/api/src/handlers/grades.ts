/**
 * Grade handlers.
 *
 * - GET /                lists grades for the authenticated user
 *                         (their own grades as a student, OR every grade
 *                          they've issued as instructor of a course).
 * - GET /assignment/:id  instructor-only roster of grades for the assignment.
 * - POST /               instructor-only — assign or update a grade
 *                         (idempotent on (assignment_id, student_id)).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type CourseRow,
  type GradeRow,
  internalError,
  requireOwnedAssignment,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const upsertSchema = z.object({
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  score: z.number().nonnegative(),
  max_score: z.number().positive().optional(),
  letter_grade: z.string().max(8).nullable().optional(),
  feedback: z.string().max(5000).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    // Student view — every grade for me.
    const mine = await findMany<GradeRow>('grades', {
      where: [{ field: 'student_id', operator: '=', value: userId }],
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    // Instructor view — every grade I gave (i.e. courses I instruct).
    const courses = await findMany<CourseRow>('courses', {
      where: [{ field: 'instructor_id', operator: '=', value: userId }],
    })
    let issued: GradeRow[] = []
    if (courses.length > 0) {
      issued = await findMany<GradeRow>('grades', {
        where: [{ field: 'course_id', operator: 'in', value: courses.map((c) => c.id) }],
        orderBy: [{ field: 'graded_at', direction: 'desc' }],
      })
    }
    const seen = new Set<string>()
    const merged: GradeRow[] = []
    for (const g of [...mine, ...issued]) {
      if (seen.has(g.id)) continue
      seen.add(g.id)
      merged.push(g)
    }
    res.json(merged)
  } catch (error) {
    logger.error('grades.list', error)
    internalError(res)
  }
})

router.get('/assignment/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAssignment(id.data.id, userId)
    if (!owned) {
      res.status(404).json({
        error: t('assignment.notFound', {}, { defaultValue: 'Assignment not found' }),
      })
      return
    }
    const grades = await findMany<GradeRow>('grades', {
      where: [{ field: 'assignment_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    res.json(grades)
  } catch (error) {
    logger.error('grades.listByAssignment', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const parsed = upsertSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const owned = await requireOwnedAssignment(parsed.data.assignment_id, userId)
    if (!owned) {
      res.status(404).json({
        error: t('assignment.notFound', {}, { defaultValue: 'Assignment not found' }),
      })
      return
    }
    const existing = await findOne<GradeRow>('grades', [
      { field: 'assignment_id', operator: '=', value: parsed.data.assignment_id },
      { field: 'student_id', operator: '=', value: parsed.data.student_id },
    ])
    if (existing) {
      const result = await updateById<GradeRow>('grades', existing.id, {
        score: parsed.data.score,
        max_score: parsed.data.max_score ?? existing.max_score,
        letter_grade: parsed.data.letter_grade ?? existing.letter_grade,
        feedback: parsed.data.feedback ?? existing.feedback,
        graded_at: new Date(),
      })
      res.json(result.data)
      return
    }
    const result = await create<GradeRow>('grades', {
      assignment_id: parsed.data.assignment_id,
      student_id: parsed.data.student_id,
      course_id: owned.course.id,
      score: parsed.data.score,
      max_score: parsed.data.max_score ?? owned.assignment.points,
      letter_grade: parsed.data.letter_grade ?? null,
      feedback: parsed.data.feedback ?? '',
      graded_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('grades.upsert', error)
    internalError(res)
  }
})

export default router
