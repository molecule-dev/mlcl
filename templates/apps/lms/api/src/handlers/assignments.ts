import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LmsLimits } from '../tiers.js'
import {
  assertCourseStaff,
  assertEnrolled,
  enrolledCourseIds,
  isCourseStaff,
  requireUserId,
  staffCourseIds,
} from './_lmsAccess.js'

const router = Router()

/**
 * Assignment content reads (a course's assignments, a single assignment) are
 * gated by course membership: course staff OR an active enrollment. The global
 * `verifyMiddleware` only POPULATES the session (it never 401s), so the handler
 * must self-guard. `isCourseStaff` is checked first so an instructor (not
 * enrolled as a student) is not rejected by `assertEnrolled`. Writes a 404
 * (missing course) / 403 (not a member) and returns false when access is
 * denied — mirror of discussions.ts canReadCourse.
 */
async function canReadCourse(res: Response, userId: string, courseId: string): Promise<boolean> {
  if (await isCourseStaff(userId, courseId)) return true
  return assertEnrolled(res, userId, courseId)
}

const assignmentCreateSchema = z.object({
  course_id: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  points: z.number().min(0).optional(),
  type: z.enum(['assignment', 'quiz', 'discussion', 'project']).optional(),
})

const assignmentUpdateSchema = assignmentCreateSchema.partial()

const submissionCreateSchema = z.object({
  content: z.string().optional(),
  file_url: z.string().optional(),
})

/**
 * List every assignment visible to the caller. The dashboard / `/assignments`
 * page hits this endpoint with no params; per-course listings can use
 * either `/course/:courseId` (sub-route) or `?course_id=…` (query) — the
 * UI uses the latter to keep all "list with filter" patterns uniform.
 * Sorting by `due_date asc, created_at desc` matches the UI's "next due
 * first, newest tie-breaker" expectation.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    // Scope to the courses the caller is a member of (active enrollment) or
    // staffs — never the global assignments table across every course.
    const accessible = new Set<string>([
      ...(await enrolledCourseIds(userId)),
      ...(await staffCourseIds(userId)),
    ])

    let courseIds = [...accessible]
    const { course_id } = req.query
    if (course_id) {
      // A ?course_id filter may only narrow within the accessible set.
      const cid = String(course_id)
      if (!accessible.has(cid)) {
        res.json([])
        return
      }
      courseIds = [cid]
    }
    if (courseIds.length === 0) {
      res.json([])
      return
    }

    // NOTE: the `assignments` table has no `status` column (only course_id/title/due_date/points/
    // type), so there is no status filter to apply here — a prior `?status=` filter queried a
    // non-existent column. Assignment lifecycle state lives on `submissions.status`, not assignments.
    const where: WhereCondition[] = [{ field: 'course_id', operator: 'in', value: courseIds }]
    const assignments = await findMany('assignments', {
      where,
      orderBy: [
        { field: 'due_date', direction: 'asc' },
        { field: 'created_at', direction: 'desc' },
      ],
    })
    res.json(assignments)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('assignments.fetchError', {}, { defaultValue: 'Failed to fetch assignments' }),
    })
  }
})

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string
    const userId = requireUserId(res)
    if (!userId) return
    if (!(await canReadCourse(res, userId, courseId))) return

    const assignments = await findMany('assignments', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'due_date', direction: 'asc' }],
    })
    res.json(assignments)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('assignments.fetchError', {}, { defaultValue: 'Failed to fetch assignments' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const id = req.params.id as string
    const assignment = await findById<Record<string, unknown>>('assignments', id)
    if (!assignment) {
      res
        .status(404)
        .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
      return
    }
    if (!(await canReadCourse(res, userId, String(assignment.course_id)))) return
    res.json(assignment)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('assignments.fetchError', {}, { defaultValue: 'Failed to fetch assignment' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<LmsLimits>({
    limitType: 'maxAssignments',
    getLimit: (limits) => limits.maxAssignments,
    // Total across the instructor's courses. The tier doc promises enforcement on the relevant POST
    // routes, but only maxCourses was wired. Count assignments in every course the user staffs.
    getCurrent: async (userId) => {
      const courseIds = await staffCourseIds(userId)
      if (courseIds.length === 0) return 0
      return count('assignments', [{ field: 'course_id', operator: 'in', value: courseIds }])
    },
  }) as unknown as RequestHandler,
  validateBody(assignmentCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return
      if (!(await assertCourseStaff(res, userId, req.body.course_id as string))) return

      const { data: assignment } = await create('assignments', {
        ...req.body,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(assignment)
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: t('assignments.createError', {}, { defaultValue: 'Failed to create assignment' }),
      })
    }
  },
)

router.put('/:id', validateBody(assignmentUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('assignments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) return

    const { data: assignment } = await updateById('assignments', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!assignment) {
      res
        .status(404)
        .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
      return
    }
    res.json(assignment)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('assignments.updateError', {}, { defaultValue: 'Failed to update assignment' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('assignments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(existing.course_id)))) return

    await deleteById('assignments', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('assignments.deleteError', {}, { defaultValue: 'Failed to delete assignment' }),
    })
  }
})

router.post(
  '/:id/submissions',
  validateBody(submissionCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return

      const assignmentId = req.params.id as string
      const assignment = await findById<Record<string, unknown>>('assignments', assignmentId)
      if (!assignment) {
        res
          .status(404)
          .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
        return
      }
      if (!(await assertEnrolled(res, userId, String(assignment.course_id)))) return

      const { data: submission } = await create('submissions', {
        assignment_id: assignmentId,
        student_id: userId,
        content: req.body.content ?? null,
        file_url: req.body.file_url ?? null,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      })
      res.status(201).json(submission)
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: t('assignments.submitError', {}, { defaultValue: 'Failed to submit assignment' }),
      })
    }
  },
)

router.get('/:id/submissions', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const assignmentId = req.params.id as string
    const assignment = await findById<Record<string, unknown>>('assignments', assignmentId)
    if (!assignment) {
      res
        .status(404)
        .json({ error: t('assignments.notFound', {}, { defaultValue: 'Assignment not found' }) })
      return
    }
    if (!(await assertCourseStaff(res, userId, String(assignment.course_id)))) return

    const submissions = await findMany('submissions', {
      where: [{ field: 'assignment_id', operator: '=', value: assignmentId }],
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
    })
    res.json(submissions)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t(
        'assignments.fetchSubmissionsError',
        {},
        { defaultValue: 'Failed to fetch submissions' },
      ),
    })
  }
})

export default router
