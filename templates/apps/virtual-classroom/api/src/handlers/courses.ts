/**
 * Course handlers — instructor owns courses; students enroll into them.
 *
 * - GET /                lists courses the user owns OR is enrolled in
 *                        (supports `?my=true|false` for an "all published"
 *                        catalogue view used by the Browse tab).
 * - GET /:id             requires course-membership.
 * - POST /               creates a course owned by the authenticated user.
 * - PUT /:id             instructor-only.
 * - DELETE /:id          instructor-only.
 * - POST /:id/enroll     enroll the authenticated user into a course.
 * - GET /:id/assignments course-member can read.
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
  requireCourseMember,
  requireOwnedCourse,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  code: z.string().min(1).max(32),
  title: z.string().min(1).max(255),
  term: z.string().max(64).nullable().optional(),
  description: z.string().max(2000).optional(),
  is_published: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

const enrollSchema = z.object({
  role: z.enum(['student', 'ta']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    // Default behavior: "my" — courses you teach + courses you're enrolled in.
    const my = req.query.my !== 'false' && req.query.my !== '0'
    if (my) {
      const owned = await findMany<CourseRow>('courses', {
        where: [{ field: 'instructor_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      const enrollments = await findMany<CourseEnrollmentRow>('course_enrollments', {
        where: [{ field: 'student_id', operator: '=', value: userId }],
      })
      let enrolled: CourseRow[] = []
      if (enrollments.length > 0) {
        enrolled = await findMany<CourseRow>('courses', {
          where: [{ field: 'id', operator: 'in', value: enrollments.map((e) => e.course_id) }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
        })
      }
      const seen = new Set<string>()
      const merged: CourseRow[] = []
      for (const c of [...owned, ...enrolled]) {
        if (seen.has(c.id)) continue
        seen.add(c.id)
        merged.push(c)
      }
      res.json(merged)
      return
    }
    // Browse / catalogue — published courses across the platform. Useful for
    // the "Browse" tab in /courses; would normally exclude any course the
    // user is already enrolled in / instructs to keep the catalogue clean.
    const all = await findMany<CourseRow>('courses', {
      where: [{ field: 'is_published', operator: '=', value: true }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(all)
  } catch (error) {
    logger.error('courses.list', error)
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
    const course = await requireCourseMember(id.data.id, userId)
    if (!course) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    res.json(course)
  } catch (error) {
    logger.error('courses.get', error)
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
    const result = await create<CourseRow>('courses', {
      instructor_id: userId,
      code: parsed.data.code,
      title: parsed.data.title,
      term: parsed.data.term ?? null,
      description: parsed.data.description ?? '',
      is_published: parsed.data.is_published ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('courses.create', error)
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
    const owned = await requireOwnedCourse(id.data.id, userId)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    const result = await updateById<CourseRow>('courses', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('courses.update', error)
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
    const owned = await requireOwnedCourse(id.data.id, userId)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    await deleteById('courses', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('courses.delete', error)
    internalError(res)
  }
})

router.post('/:id/enroll', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  const body = enrollSchema.safeParse(req.body ?? {})
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const course = await findOne<CourseRow>('courses', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!course) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    // Idempotent — re-enrolling returns the existing row instead of creating
    // a duplicate (the unique index on (course_id, student_id) would otherwise
    // crash with a 500).
    const existing = await findOne<CourseEnrollmentRow>('course_enrollments', [
      { field: 'course_id', operator: '=', value: id.data.id },
      { field: 'student_id', operator: '=', value: userId },
    ])
    if (existing) {
      res.status(200).json(existing)
      return
    }
    // Self-enrolling users are always plain 'student'. An elevated enrollment
    // role (e.g. 'ta') may ONLY be granted by the course instructor — otherwise
    // a student could self-assign 'ta' here and then inherit whiteboard
    // write/clear access when joining a room for this course.
    let role = 'student'
    if (body.data.role && body.data.role !== 'student') {
      if (course.instructor_id !== userId) {
        res.status(403).json({
          error: t(
            'course.enrollRoleForbidden',
            {},
            { defaultValue: 'Only the course instructor can grant elevated enrollment roles' },
          ),
        })
        return
      }
      role = body.data.role
    }
    const result = await create<CourseEnrollmentRow>('course_enrollments', {
      course_id: id.data.id,
      student_id: userId,
      role,
      enrolled_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('courses.enroll', error)
    internalError(res)
  }
})

router.get('/:id/assignments', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const course = await requireCourseMember(id.data.id, userId)
    if (!course) {
      res
        .status(404)
        .json({ error: t('course.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    const assignments = await findMany<AssignmentRow>('assignments', {
      where: [{ field: 'course_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'due_date', direction: 'asc' }],
    })
    res.json(assignments)
  } catch (error) {
    logger.error('courses.listAssignments', error)
    internalError(res)
  }
})

export default router
