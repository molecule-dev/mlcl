import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { index, search } from '@molecule/api-search'

import type { LmsLimits } from '../tiers.js'
import { assertCourseStaff, requireUserId } from './_lmsAccess.js'

const router = Router()

/**
 * Best-effort write into the search index. A search bond is not strictly
 * required (e.g. local development without Meilisearch up, or a deploy
 * tier that turns it off) — so a failure here must not turn a successful
 * DB write into a 500. We log and swallow.
 */
async function indexCourseSafe(course: Record<string, unknown>): Promise<void> {
  try {
    await index('courses', String(course.id), course)
  } catch (error) {
    logger.warn?.({ err: error }, 'Failed to index course; continuing.')
  }
}

const courseCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  instructor_id: z.string().optional(),
})

const courseUpdateSchema = courseCreateSchema.partial()

/**
 * List courses, with optional filters:
 *
 * - `?search=…` → full-text search via the search bond
 * - `?status=draft|published|archived`
 * - `?instructor_id=<uuid>`
 * - `?my=true` → only courses the signed-in user is **enrolled in** OR
 *   **instructs**. Used by the dashboard's "Continue Learning" panel so
 *   anonymous and freshly-signed-up users don't see every other user's
 *   catalog and so React doesn't render duplicate-key cards from a flat
 *   global list. Requires authentication.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search: searchText, status, instructor_id, my } = req.query
    if (searchText) {
      const results = await search('courses', { text: String(searchText) })
      res.json(results.hits.map((h) => h.document))
      return
    }

    if (my === 'true' || my === '1') {
      const userId = requireUserId(res)
      if (!userId) return

      const enrollments = await findMany<{ course_id: string }>('enrollments', {
        where: [
          { field: 'student_id', operator: '=', value: userId },
          { field: 'status', operator: '=', value: 'active' },
        ],
      })
      const enrolledIds = enrollments.map((e) => e.course_id)

      const owned = await findMany<Record<string, unknown>>('courses', {
        where: [{ field: 'instructor_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })

      let enrolled: Array<Record<string, unknown>> = []
      if (enrolledIds.length > 0) {
        enrolled = await findMany<Record<string, unknown>>('courses', {
          where: [{ field: 'id', operator: 'in', value: enrolledIds }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
        })
      }

      const seen = new Set<string>()
      const merged: Array<Record<string, unknown>> = []
      for (const c of [...owned, ...enrolled]) {
        const id = String(c.id)
        if (seen.has(id)) continue
        seen.add(id)
        merged.push(c)
      }
      res.json(merged)
      return
    }

    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (instructor_id) where.push({ field: 'instructor_id', operator: '=', value: instructor_id })
    const courses = await findMany('courses', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(courses)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.fetchError', {}, { defaultValue: 'Failed to fetch courses' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const course = await findById('courses', id)
    if (!course) {
      res
        .status(404)
        .json({ error: t('courses.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    res.json(course)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.fetchError', {}, { defaultValue: 'Failed to fetch course' }) })
  }
})

router.post(
  '/',
  enforceLimit<LmsLimits>({
    limitType: 'maxCourses',
    getLimit: (limits) => limits.maxCourses,
    getCurrent: async (userId) =>
      count('courses', [{ field: 'instructor_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(courseCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireUserId(res)
      if (!userId) return

      const { data: course } = await create('courses', {
        ...req.body,
        instructor_id: req.body.instructor_id ?? userId,
        status: 'draft',
        created_at: new Date().toISOString(),
      })
      if (course) {
        await indexCourseSafe(course as Record<string, unknown>)
      }
      res.status(201).json(course)
    } catch (error) {
      logger.error(error)
      res
        .status(500)
        .json({ error: t('courses.createError', {}, { defaultValue: 'Failed to create course' }) })
    }
  },
)

router.put('/:id', validateBody(courseUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    if (!(await assertCourseStaff(res, userId, id))) return

    const { data: course } = await updateById('courses', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!course) {
      res
        .status(404)
        .json({ error: t('courses.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    await indexCourseSafe(course as Record<string, unknown>)
    res.json(course)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.updateError', {}, { defaultValue: 'Failed to update course' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    if (!(await assertCourseStaff(res, userId, id))) return

    await deleteById('courses', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.deleteError', {}, { defaultValue: 'Failed to delete course' }) })
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    if (!(await assertCourseStaff(res, userId, id))) return

    const { data: course } = await updateById('courses', id, {
      status: 'published',
      published_at: new Date().toISOString(),
    })
    if (!course) {
      res
        .status(404)
        .json({ error: t('courses.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    res.json(course)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.publishError', {}, { defaultValue: 'Failed to publish course' }) })
  }
})

router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const id = req.params.id as string
    if (!(await assertCourseStaff(res, userId, id))) return

    const { data: course } = await updateById('courses', id, {
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    if (!course) {
      res
        .status(404)
        .json({ error: t('courses.notFound', {}, { defaultValue: 'Course not found' }) })
      return
    }
    res.json(course)
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('courses.archiveError', {}, { defaultValue: 'Failed to archive course' }) })
  }
})

/**
 * Mark a lesson complete for the signed-in student. The Lesson page calls
 * this when the student clicks "Mark complete" on the lesson player.
 *
 * Idempotent: re-clicking the button (or replaying the request) does not
 * insert a duplicate row, thanks to the (user_id, course_id, lesson_id)
 * unique constraint.
 *
 * Side-effects asserted by the e2e suite: GET
 * `/api/courses/:courseId/progress` for the same user + course returns the
 * lesson_id in `completed_lesson_ids` and a non-zero `percentage`.
 */
router.post('/:courseId/lessons/:lessonId/complete', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const courseId = req.params.courseId as string
    const lessonId = req.params.lessonId as string

    const existing = await findOne<Record<string, unknown>>('lesson_completions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: courseId },
      { field: 'lesson_id', operator: '=', value: lessonId },
    ])
    if (existing) {
      res.status(200).json({ completed: true, alreadyComplete: true, completion: existing })
      return
    }

    const { data: completion } = await create<Record<string, unknown>>('lesson_completions', {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
    })
    res.status(201).json({ completed: true, completion })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t(
        'courses.completeLessonError',
        {},
        { defaultValue: 'Failed to mark lesson complete' },
      ),
    })
  }
})

/**
 * Per-course progress snapshot for the signed-in student. Returns the
 * list of completed lesson ids plus a percentage relative to the
 * total module-items in the course (used by the lesson sidebar to
 * render the progress bar).
 */
router.get('/:courseId/progress', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const courseId = req.params.courseId as string

    const completions = await findMany<{ lesson_id: string; completed_at: string }>(
      'lesson_completions',
      {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'course_id', operator: '=', value: courseId },
        ],
      },
    )
    const completedLessonIds = completions.map((c) => c.lesson_id)

    const modules = await findMany<{ id: string }>('course_modules', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
    })
    let totalLessons = 0
    if (modules.length > 0) {
      const moduleIds = modules.map((m) => m.id)
      const items = await findMany<Record<string, unknown>>('module_items', {
        where: [{ field: 'module_id', operator: 'in', value: moduleIds }],
      })
      totalLessons = items.length
    }
    const percentage =
      totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0

    res.json({
      courseId,
      completedLessonIds,
      completedCount: completedLessonIds.length,
      totalLessons,
      percentage,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('courses.progressError', {}, { defaultValue: 'Failed to fetch course progress' }),
    })
  }
})

export default router
