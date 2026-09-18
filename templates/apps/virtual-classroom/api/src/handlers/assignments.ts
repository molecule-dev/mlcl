/**
 * Assignment handlers.
 *
 * - GET /                 lists every assignment from courses the user owns
 *                          OR is enrolled in (joined client-side via the
 *                          assignment's course_id; instructor / student
 *                          difference is implicit in which courses they see).
 * - GET /:id              requires assignment-membership.
 * - POST /                instructor-only (course_id must be owned).
 * - PUT /:id              instructor-only.
 * - DELETE /:id           instructor-only.
 * - POST /:id/submit      student submission (creates or updates own row).
 * - GET /:id/submissions  instructor-only — list every student's submission.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type AssignmentRow,
  type CourseEnrollmentRow,
  type CourseRow,
  internalError,
  requireAssignmentMember,
  requireOwnedAssignment,
  requireOwnedCourse,
  requireUser,
  type SubmissionRow,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  points: z.number().int().nonnegative().max(10_000).optional(),
  type: z.enum(['homework', 'quiz', 'lab', 'project', 'exam']).optional(),
})

const updateSchema = createSchema.partial().omit({ course_id: true })

const submitSchema = z.object({
  content: z.string().max(20_000).optional(),
  file_url: z.string().url().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    // Build the union of "courses I instruct" + "courses I'm enrolled in".
    const owned = await findMany<CourseRow>('courses', {
      where: [{ field: 'instructor_id', operator: '=', value: userId }],
    })
    const enrollments = await findMany<CourseEnrollmentRow>('course_enrollments', {
      where: [{ field: 'student_id', operator: '=', value: userId }],
    })
    const courseIds = new Set<string>([
      ...owned.map((c) => c.id),
      ...enrollments.map((e) => e.course_id),
    ])
    if (courseIds.size === 0) {
      res.json([])
      return
    }
    const assignments = await findMany<AssignmentRow>('assignments', {
      where: [{ field: 'course_id', operator: 'in', value: Array.from(courseIds) }],
      orderBy: [{ field: 'due_date', direction: 'asc' }],
    })
    res.json(assignments)
  } catch (error) {
    logger.error('assignments.list', error)
    internalError(res)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const member = await requireAssignmentMember(id.data.id, userId)
    if (!member) {
      res.status(404).json({
        error: t('assignment.notFound', {}, { defaultValue: 'Assignment not found' }),
      })
      return
    }
    res.json(member.assignment)
  } catch (error) {
    logger.error('assignments.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const owned = await requireOwnedCourse(parsed.data.course_id, userId)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    const result = await create<AssignmentRow>('assignments', {
      course_id: parsed.data.course_id,
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      due_date: parsed.data.due_date ?? null,
      points: parsed.data.points ?? 100,
      type: parsed.data.type ?? 'homework',
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('assignments.create', error)
    internalError(res)
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
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
    const result = await updateById<AssignmentRow>('assignments', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('assignments.update', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
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
    await deleteById('assignments', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('assignments.delete', error)
    internalError(res)
  }
})

router.post('/:id/submit', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  const body = submitSchema.safeParse(req.body ?? {})
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const member = await requireAssignmentMember(id.data.id, userId)
    if (!member) {
      res.status(404).json({
        error: t('assignment.notFound', {}, { defaultValue: 'Assignment not found' }),
      })
      return
    }
    // Resubmissions overwrite — the (assignment_id, student_id) unique index
    // would otherwise reject a second submit POST.
    const existing = await findOne<SubmissionRow>('submissions', [
      { field: 'assignment_id', operator: '=', value: id.data.id },
      { field: 'student_id', operator: '=', value: userId },
    ])
    if (existing) {
      const result = await updateById<SubmissionRow>('submissions', existing.id, {
        content: body.data.content ?? existing.content,
        file_url: body.data.file_url ?? existing.file_url,
        status: 'submitted',
        submitted_at: new Date(),
      })
      res.json(result.data)
      return
    }
    const result = await create<SubmissionRow>('submissions', {
      assignment_id: id.data.id,
      student_id: userId,
      content: body.data.content ?? '',
      file_url: body.data.file_url ?? null,
      status: 'submitted',
      submitted_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('assignments.submit', error)
    internalError(res)
  }
})

router.get('/:id/submissions', async (req: Request, res: Response) => {
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
    const submissions = await findMany<SubmissionRow>('submissions', {
      where: [{ field: 'assignment_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
    })
    res.json(submissions)
  } catch (error) {
    logger.error('assignments.listSubmissions', error)
    internalError(res)
  }
})

router.get('/:id/my-submission', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const member = await requireAssignmentMember(id.data.id, userId)
    if (!member) {
      res.status(404).json({
        error: t('assignment.notFound', {}, { defaultValue: 'Assignment not found' }),
      })
      return
    }
    const submission = await findOne<SubmissionRow>('submissions', [
      { field: 'assignment_id', operator: '=', value: id.data.id },
      { field: 'student_id', operator: '=', value: userId },
    ])
    if (!submission) {
      res.status(404).json({
        error: t('submission.notFound', {}, { defaultValue: 'No submission yet' }),
      })
      return
    }
    res.json(submission)
  } catch (error) {
    logger.error('assignments.mySubmission', error)
    internalError(res)
  }
})

export default router
