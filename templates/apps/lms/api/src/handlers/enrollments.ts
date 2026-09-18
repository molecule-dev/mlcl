import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  assertCourseStaff,
  assertEnrolled,
  isCourseStaff,
  requireUserId,
  staffCourseIds,
} from './_lmsAccess.js'

const router = Router()

const enrollmentCreateSchema = z.object({
  course_id: z.string(),
  student_id: z.string().optional(),
  student_email: z.string().email(),
  role: z.enum(['student', 'ta', 'observer']).optional(),
})

const enrollmentUpdateSchema = z.object({
  status: z.enum(['active', 'inactive', 'completed']).optional(),
  role: z.enum(['student', 'ta', 'observer']).optional(),
})

/**
 * List enrollments with optional `?course_id` / `?student_id` filters.
 *
 * The UI uses this to count students per course on the CourseHeader
 * (`?course_id=…`) and to list "my enrollments" on the dashboard
 * (`?student_id=me`, where `me` resolves to the signed-in user).
 *
 * Enrollment rows carry student PII (`student_email`, `student_id`, `role`),
 * so every path is authorized:
 *
 * - `?course_id=…` → caller must be enrolled in (or staff for) that course.
 * - `?student_id=…` → caller may read their own; a non-self id is scoped to
 *   the courses the caller staffs (403 if they staff none).
 * - no filter → scoped to the caller's own enrollments (never the global
 *   table).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const where: WhereCondition[] = []
    const { course_id, student_id, status } = req.query

    if (course_id) {
      const cid = String(course_id)
      // Roster / student-count: course staff, or any enrolled member, may see
      // it. isCourseStaff is checked first so an instructor (not enrolled as a
      // student) is not rejected by assertEnrolled.
      if (!(await isCourseStaff(userId, cid)) && !(await assertEnrolled(res, userId, cid))) return
      where.push({ field: 'course_id', operator: '=', value: cid })
    }

    if (student_id) {
      const sid = String(student_id) === 'me' ? userId : String(student_id)
      where.push({ field: 'student_id', operator: '=', value: sid })
      if (sid !== userId) {
        // Listing another user's enrollments is staff-only; scope to the
        // courses the caller actually staffs.
        const courseIds = await staffCourseIds(userId)
        if (courseIds.length === 0) {
          res
            .status(403)
            .json({ error: t('enrollments.forbidden', {}, { defaultValue: 'Forbidden' }) })
          return
        }
        where.push({ field: 'course_id', operator: 'in', value: courseIds })
      }
    }

    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    // Never return the global enrollment table: with no scoping filter, fall
    // back to the caller's own enrollments.
    if (!course_id && !student_id) {
      where.push({ field: 'student_id', operator: '=', value: userId })
    }

    const enrollments = await findMany('enrollments', {
      where,
      orderBy: [{ field: 'enrolled_at', direction: 'desc' }],
    })
    res.json(enrollments)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.fetchError', {}, { defaultValue: 'Failed to fetch enrollments' }),
    })
  }
})

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    // The full roster (incl. every student's email) is staff-only.
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await assertCourseStaff(res, userId, courseId))) return

    const enrollments = await findMany('enrollments', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'enrolled_at', direction: 'desc' }],
    })
    res.json(enrollments)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.fetchError', {}, { defaultValue: 'Failed to fetch enrollments' }),
    })
  }
})

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string
    const userId = requireUserId(res)
    if (!userId) return

    // Self: all enrollments. Non-self: only within the courses the caller
    // staffs (403 if they staff none).
    const where: Array<{ field: string; operator: '=' | 'in'; value: string | string[] }> = [
      { field: 'student_id', operator: '=', value: studentId },
    ]
    if (userId !== studentId) {
      const courseIds = await staffCourseIds(userId)
      if (courseIds.length === 0) {
        res
          .status(403)
          .json({ error: t('enrollments.forbidden', {}, { defaultValue: 'Forbidden' }) })
        return
      }
      where.push({ field: 'course_id', operator: 'in', value: courseIds })
    }

    const enrollments = await findMany('enrollments', {
      where,
      orderBy: [{ field: 'enrolled_at', direction: 'desc' }],
    })
    res.json(enrollments)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.fetchError', {}, { defaultValue: 'Failed to fetch enrollments' }),
    })
  }
})

// NOTE: the `maxStudents` tier limit is intentionally NOT enforced by an `enforceLimit` middleware
// here. `enforceLimit` caps the *requesting* user's own plan, but this route is primarily a student
// self-enrolling — and `maxStudents` is the course *instructor's* cap ("students across all their
// courses"), not the enroller's. Enforcing it against the enroller's plan would be semantically
// wrong. Correctly enforcing it needs the course owner's tier + a count of enrollments across the
// owner's courses (a custom guard), which is tracked separately. maxModulesPerCourse + maxAssignments
// (whose actor IS the instructor whose plan applies) are enforced on their create routes.
router.post('/', validateBody(enrollmentCreateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const courseId = req.body.course_id as string
    const requestedRole = req.body.role as string | undefined
    const requestedStudentId = req.body.student_id as string | undefined

    // Privilege-escalation guard: a caller may only enroll *someone else*, or
    // enroll with a *non-student role* (e.g. promote to 'ta'/'observer'), when
    // they are course staff. Otherwise force a plain self-enrollment as a
    // student — a student must never be able to self-grant staff access.
    const wantsPrivilege =
      (requestedRole !== undefined && requestedRole !== 'student') ||
      (requestedStudentId !== undefined && requestedStudentId !== userId)

    let role = 'student'
    let studentId = userId
    if (wantsPrivilege) {
      if (!(await assertCourseStaff(res, userId, courseId))) return
      role = requestedRole ?? 'student'
      studentId = requestedStudentId ?? userId
    }

    // Idempotent enroll: clicking "Enroll" twice (or a replayed/retried request)
    // must not create a duplicate enrollment. Mirrors the lesson_completions
    // pattern and is backed by the UNIQUE (student_id, course_id) constraint,
    // which also closes the concurrent-double-submit race the check alone can't.
    const alreadyEnrolled = await findOne<Record<string, unknown>>('enrollments', [
      { field: 'course_id', operator: '=', value: courseId },
      { field: 'student_id', operator: '=', value: studentId },
    ])
    if (alreadyEnrolled) {
      res.status(200).json({ ...alreadyEnrolled, alreadyEnrolled: true })
      return
    }

    const { data: enrollment } = await create('enrollments', {
      course_id: courseId,
      student_id: studentId,
      student_email: req.body.student_email,
      role,
      status: 'active',
      enrolled_at: new Date().toISOString(),
    })

    const course = await findById<Record<string, unknown>>('courses', req.body.course_id)
    if (course) {
      try {
        await sendMail({
          from: { address: 'noreply@lms.example.com', name: 'LMS' },
          to: req.body.student_email,
          subject: t(
            'enrollments.welcomeSubject',
            { courseName: String(course.name) },
            { defaultValue: `Welcome to ${String(course.name)}` },
          ),
          text: t(
            'enrollments.welcomeBody',
            { courseName: String(course.name) },
            { defaultValue: `You have been enrolled in ${String(course.name)}.` },
          ),
        })
      } catch (emailError) {
        logger.error(emailError)
      }
    }

    res.status(201).json(enrollment)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.createError', {}, { defaultValue: 'Failed to create enrollment' }),
    })
  }
})

router.put('/:id', validateBody(enrollmentUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string

    const existing = await findById<Record<string, unknown>>('enrollments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('enrollments.notFound', {}, { defaultValue: 'Enrollment not found' }) })
      return
    }

    const updates: Record<string, unknown> = { ...req.body }
    if (String(existing.student_id) === userId) {
      // A student may change only their own enrollment *status* — never
      // self-promote by changing their role.
      delete updates.role
    } else if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) {
      // Editing someone else's enrollment requires course staff.
      return
    }

    const { data: enrollment } = await updateById('enrollments', id, {
      ...updates,
      updated_at: new Date().toISOString(),
    })
    if (!enrollment) {
      res
        .status(404)
        .json({ error: t('enrollments.notFound', {}, { defaultValue: 'Enrollment not found' }) })
      return
    }
    res.json(enrollment)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.updateError', {}, { defaultValue: 'Failed to update enrollment' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string

    const existing = await findById<Record<string, unknown>>('enrollments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('enrollments.notFound', {}, { defaultValue: 'Enrollment not found' }) })
      return
    }

    // Allow only self-unenrollment, or removal by course staff. This scopes
    // PUT/DELETE-by-id so a student cannot delete another course's enrollment
    // (IDOR).
    if (
      String(existing.student_id) !== userId &&
      !(await assertCourseStaff(res, userId, String(existing.course_id)))
    ) {
      return
    }

    await deleteById('enrollments', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('enrollments.deleteError', {}, { defaultValue: 'Failed to delete enrollment' }),
    })
  }
})

export default router
