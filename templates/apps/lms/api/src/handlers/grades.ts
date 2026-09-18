import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import type { Filter } from '@molecule/api-reporting'
import { aggregate } from '@molecule/api-reporting'

import { assertCourseStaff, isCourseStaff, requireUserId, staffCourseIds } from './_lmsAccess.js'

const router = Router()

const gradeCreateSchema = z.object({
  assignment_id: z.string(),
  student_id: z.string(),
  course_id: z.string(),
  score: z.number().min(0),
  // Optional: defaults to the assignment's declared `points` (its worth) when omitted.
  max_score: z.number().min(0).optional(),
  letter_grade: z.string().max(2).optional(),
  feedback: z.string().max(5000).optional(),
})

const gradeUpdateSchema = z.object({
  score: z.number().min(0).optional(),
  max_score: z.number().min(0).optional(),
  letter_grade: z.string().max(2).optional(),
  feedback: z.string().max(5000).optional(),
})

// Postgres NUMERIC columns (and AVG/MIN/MAX measures) come back as strings
// (`"85.0000"`) over node-postgres. Coerce known-numeric fields at the API
// boundary so clients can math/sort/compare without re-parsing every cell.
const numericMeasureKeys = new Set([
  'avgScore',
  'minScore',
  'maxScore',
  'totalGrades',
  'totalAssignments',
])

const numericGradeFields = new Set(['score', 'max_score'])

function coerceFields<T extends Record<string, unknown> | null | undefined>(
  row: T,
  fields: Set<string>,
): T {
  if (!row || typeof row !== 'object') return row
  const out: Record<string, unknown> = { ...row }
  for (const key of Object.keys(out)) {
    if (fields.has(key) && out[key] != null) {
      const n = Number(out[key])
      if (!Number.isNaN(n)) out[key] = n
    }
  }
  return out as T
}

const normalizeAggregateRow = <T extends Record<string, unknown>>(row: T): T =>
  coerceFields(row, numericMeasureKeys)

const normalizeGrade = <T extends Record<string, unknown> | null | undefined>(row: T): T =>
  coerceFields(row, numericGradeFields)

/**
 * List every grade for the signed-in caller. The Gradebook UI calls this
 * with no params and then groups client-side by course. Anonymous /
 * unauthenticated callers get an empty list rather than a 401 so the page
 * can still render the empty-state UI.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    const where = userId ? [{ field: 'student_id', operator: '=' as const, value: userId }] : []
    const grades = await findMany<Record<string, unknown>>('grades', {
      where,
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    res.json(grades.map(normalizeGrade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.fetchError', {}, { defaultValue: 'Failed to fetch grades' }) })
  }
})

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    // Course-wide grades expose every enrolled student's scores — restrict
    // to the course's own instructor/TA (401 anon, 403 non-staff, 404 missing).
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await assertCourseStaff(res, userId, courseId))) return

    const grades = await findMany<Record<string, unknown>>('grades', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    res.json(grades.map(normalizeGrade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.fetchError', {}, { defaultValue: 'Failed to fetch grades' }) })
  }
})

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string
    const userId = requireUserId(res)
    if (!userId) return

    // Self: all courses. Non-self: only the courses the caller staffs (so an
    // instructor/TA sees this student's grades for *their* courses, never
    // every course). A non-self caller who staffs nothing is forbidden.
    const where: Array<{ field: string; operator: '=' | 'in'; value: string | string[] }> = [
      { field: 'student_id', operator: '=', value: studentId },
    ]
    if (userId !== studentId) {
      const courseIds = await staffCourseIds(userId)
      if (courseIds.length === 0) {
        res.status(403).json({ error: t('grades.forbidden', {}, { defaultValue: 'Forbidden' }) })
        return
      }
      where.push({ field: 'course_id', operator: 'in', value: courseIds })
    }

    const grades = await findMany<Record<string, unknown>>('grades', {
      where,
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    res.json(grades.map(normalizeGrade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.fetchError', {}, { defaultValue: 'Failed to fetch grades' }) })
  }
})

router.get('/student/:studentId/course/:courseId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string
    const courseId = req.params.courseId as string
    const userId = requireUserId(res)
    if (!userId) return

    // The course is known, so gate directly: a student may read their own
    // grades; otherwise the caller must be staff for this specific course.
    if (userId !== studentId && !(await isCourseStaff(userId, courseId))) {
      res.status(403).json({ error: t('grades.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const grades = await findMany<Record<string, unknown>>('grades', {
      where: [
        { field: 'student_id', operator: '=', value: studentId },
        { field: 'course_id', operator: '=', value: courseId },
      ],
      orderBy: [{ field: 'graded_at', direction: 'desc' }],
    })
    res.json(grades.map(normalizeGrade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.fetchError', {}, { defaultValue: 'Failed to fetch grades' }) })
  }
})

router.post('/', validateBody(gradeCreateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await assertCourseStaff(res, userId, req.body.course_id as string))) return

    // A grade is scored out of its assignment's declared worth: default max_score
    // from the assignment's `points` when the request omits it, so the assignment's
    // point value actually governs the grade (an explicit max_score still overrides).
    const assignment = await findById<{ points?: number | string }>(
      'assignments',
      String(req.body.assignment_id),
    )
    const maxScore =
      req.body.max_score != null ? Number(req.body.max_score) : Number(assignment?.points ?? 0)

    const { data: grade } = await create<Record<string, unknown>>('grades', {
      ...req.body,
      max_score: maxScore,
      graded_at: new Date().toISOString(),
    })
    res.status(201).json(normalizeGrade(grade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.createError', {}, { defaultValue: 'Failed to create grade' }) })
  }
})

router.put('/:id', validateBody(gradeUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('grades', id)
    if (!existing) {
      res.status(404).json({ error: t('grades.notFound', {}, { defaultValue: 'Grade not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) return

    const { data: grade } = await updateById<Record<string, unknown>>('grades', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!grade) {
      res.status(404).json({ error: t('grades.notFound', {}, { defaultValue: 'Grade not found' }) })
      return
    }
    res.json(normalizeGrade(grade))
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('grades.updateError', {}, { defaultValue: 'Failed to update grade' }) })
  }
})

router.get('/course/:courseId/report', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    // Aggregate course gradebook report — same exposure as the raw rows, so
    // restrict to the course instructor/TA.
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await assertCourseStaff(res, userId, courseId))) return

    const filters: Filter[] = [{ field: 'course_id', operator: 'eq', value: courseId }]
    const report = await aggregate({
      table: 'grades',
      measures: [
        { field: 'score', function: 'avg', alias: 'avgScore' },
        { field: 'score', function: 'min', alias: 'minScore' },
        { field: 'score', function: 'max', alias: 'maxScore' },
        { field: 'id', function: 'count', alias: 'totalGrades' },
      ],
      dimensions: ['assignment_id'],
      filters,
    })
    res.json(report.rows.map(normalizeAggregateRow))
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('grades.reportError', {}, { defaultValue: 'Failed to generate grade report' }),
    })
  }
})

router.get('/student/:studentId/transcript', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string
    // A transcript is a cross-course aggregate of one student's record —
    // self-only (students view their own transcript).
    const userId = requireUserId(res)
    if (!userId) return
    if (userId !== studentId) {
      res.status(403).json({ error: t('grades.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const filters: Filter[] = [{ field: 'student_id', operator: 'eq', value: studentId }]
    const report = await aggregate({
      table: 'grades',
      measures: [
        { field: 'score', function: 'avg', alias: 'avgScore' },
        { field: 'id', function: 'count', alias: 'totalAssignments' },
      ],
      dimensions: ['course_id'],
      filters,
    })
    res.json(report.rows.map(normalizeAggregateRow))
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('grades.transcriptError', {}, { defaultValue: 'Failed to generate transcript' }),
    })
  }
})

export default router
