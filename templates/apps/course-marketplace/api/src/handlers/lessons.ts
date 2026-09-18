/**
 * Lessons handler — CRUD + progress tracking.
 *
 * Authorization model from INVENTORY.md:
 *   - lesson read: requires `enrollments` row OR `lesson.free_preview = true`.
 *   - lesson create/update/delete: must own the parent course.
 *   - progress: owner-only; scoped to caller's `userId`.
 *
 * Validation: every input goes through `validateBody`/`validateQuery`/
 *   `validateParams` from `@molecule/api-middleware-validation`.
 *
 * The HLS transcode pipeline (`@molecule/api-media-streaming-hls`) is wired
 * through its core bond. The transcoder is a stub in v1 — see
 * `BLOCKED: hls-transcode-bond pending` in the spec for the full transcode
 * pipeline; the route still accepts HLS URLs and writes them to the row,
 * which is sufficient to exercise playback E2E with fixture m3u8 playlists.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const courseIdParamSchema = z.object({ courseId: z.string().uuid() })

const createLessonSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  video_url: z.string().url().optional(),
  video_hls_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  duration_sec: z.number().int().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
  free_preview: z.boolean().optional(),
})

const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  video_url: z.string().url().optional(),
  video_hls_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  duration_sec: z.number().int().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
  free_preview: z.boolean().optional(),
})

const progressSchema = z.object({
  watched_seconds: z.number().int().min(0).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
})

const isOwnerOrEnrolled = async (
  userId: string,
  course: Record<string, unknown>,
): Promise<boolean> => {
  if (course.instructor_id === userId) return true
  const enrollment = await findOne('enrollments', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'course_id', operator: '=', value: course.id },
  ])
  return !!enrollment
}

router.get(
  '/course/:courseId',
  validateParams(courseIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      // Public curriculum: any visitor (auth or not) can see the lesson
      // titles, durations, and which are free previews so the
      // CourseDetail page can render the full curriculum before
      // checkout. Video URLs are stripped from gated rows so
      // non-enrolled visitors can't sideload the video.
      const userId = getUserId(res)
      const courseId = String(req.params.courseId)
      const course = await findById<Record<string, unknown>>('courses', courseId)
      if (!course || course.status !== 'published') {
        res
          .status(404)
          .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
        return
      }
      const where: WhereCondition[] = [{ field: 'course_id', operator: '=', value: courseId }]
      const lessons = await findMany<Record<string, unknown>>('lessons', {
        where,
        orderBy: [{ field: 'sort_order', direction: 'asc' }],
        limit: 200,
      })
      const isAllowed = userId ? await isOwnerOrEnrolled(userId, course) : false
      // Per-user progress map so the curriculum can render completed
      // checkmarks for the caller.
      const progressByLesson = new Map<string, Record<string, unknown>>()
      if (userId) {
        const rows = await findMany<Record<string, unknown>>('lesson_progress', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'course_id', operator: '=', value: courseId },
          ],
          limit: 500,
        })
        for (const r of rows) progressByLesson.set(String(r.lesson_id), r)
      }
      // For non-enrolled visitors, return the full list with video URLs
      // stripped from gated rows. Free-preview rows keep their video_url
      // so the inline preview player works.
      const projected = lessons.map((l) => {
        const progress = progressByLesson.get(String(l.id))
        const enriched = {
          ...l,
          is_completed: !!progress?.completed_at,
          watched_seconds: Number(progress?.watched_seconds ?? 0),
        }
        if (isAllowed) return enriched
        if (l.free_preview === true) return enriched
        return { ...enriched, video_url: null, video_hls_url: null }
      })
      res.json(projected)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const lesson = await findById<Record<string, unknown>>('lessons', idOf(req))
    if (!lesson) {
      res
        .status(404)
        .json({ error: t('lessons.notFound', undefined, { defaultValue: 'Lesson not found' }) })
      return
    }
    if (lesson.free_preview !== true) {
      const course = await findById<Record<string, unknown>>('courses', String(lesson.course_id))
      if (!course || !(await isOwnerOrEnrolled(userId, course))) {
        res.status(403).json({
          error: t('lessons.forbidden', undefined, { defaultValue: 'Enrollment required' }),
        })
        return
      }
    }
    const progress = await findOne<Record<string, unknown>>('lesson_progress', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'lesson_id', operator: '=', value: idOf(req) },
    ])
    res.json({
      ...lesson,
      is_completed: !!progress?.completed_at,
      watched_seconds: Number(progress?.watched_seconds ?? 0),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createLessonSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createLessonSchema>
    const course = await findById<Record<string, unknown>>('courses', body.course_id)
    if (!course) {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }
    if (course.instructor_id !== userId) {
      res
        .status(403)
        .json({ error: t('lessons.forbidden', undefined, { defaultValue: 'Not your course' }) })
      return
    }
    const result = await create('lessons', {
      course_id: body.course_id,
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      video_url: body.video_url ?? null,
      video_hls_url: body.video_hls_url ?? null,
      thumbnail_url: body.thumbnail_url ?? null,
      duration_sec: body.duration_sec ?? 0,
      sort_order: body.sort_order ?? 0,
      free_preview: body.free_preview ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    // Bump the parent course's `total_lessons` counter so the catalog
    // surface reflects the actual lesson count without re-querying.
    const total = await count('lessons', [
      { field: 'course_id', operator: '=', value: body.course_id },
    ])
    await updateById('courses', body.course_id, { total_lessons: total })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateLessonSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('lessons', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('lessons.notFound', undefined, { defaultValue: 'Lesson not found' }) })
        return
      }
      const course = await findById<Record<string, unknown>>('courses', String(existing.course_id))
      if (!course || course.instructor_id !== userId) {
        res
          .status(403)
          .json({ error: t('lessons.forbidden', undefined, { defaultValue: 'Not your course' }) })
        return
      }
      const body = req.body as z.infer<typeof updateLessonSchema>
      const result = await updateById('lessons', idOf(req), {
        ...body,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('lessons', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('lessons.notFound', undefined, { defaultValue: 'Lesson not found' }) })
      return
    }
    const course = await findById<Record<string, unknown>>('courses', String(existing.course_id))
    if (!course || course.instructor_id !== userId) {
      res
        .status(403)
        .json({ error: t('lessons.forbidden', undefined, { defaultValue: 'Not your course' }) })
      return
    }
    await deleteById('lessons', idOf(req))
    const total = await count('lessons', [
      { field: 'course_id', operator: '=', value: existing.course_id },
    ])
    await updateById('courses', String(existing.course_id), { total_lessons: total })
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/progress',
  validateParams(idParamSchema),
  validateBody(progressSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const lesson = await findById<Record<string, unknown>>('lessons', idOf(req))
      if (!lesson) {
        res
          .status(404)
          .json({ error: t('lessons.notFound', undefined, { defaultValue: 'Lesson not found' }) })
        return
      }
      // Only enrolled users (or the instructor themselves previewing the
      // course) can record progress. This prevents an attacker pre-poisoning
      // their own progress rows for a course they have not paid for.
      if (lesson.free_preview !== true) {
        const course = await findById<Record<string, unknown>>('courses', String(lesson.course_id))
        if (!course || !(await isOwnerOrEnrolled(userId, course))) {
          res.status(403).json({
            error: t('lessons.forbidden', undefined, { defaultValue: 'Enrollment required' }),
          })
          return
        }
      }

      const body = req.body as z.infer<typeof progressSchema>
      const isCompleted = body.completed === true || (body.progress_percent ?? 0) >= 100
      const existing = await findOne<Record<string, unknown>>('lesson_progress', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'lesson_id', operator: '=', value: idOf(req) },
      ])
      const patch: Record<string, unknown> = {
        watched_seconds: body.watched_seconds ?? 0,
        completed_at: isCompleted ? new Date() : null,
        updated_at: new Date(),
      }
      let saved: Record<string, unknown> | null
      if (existing) {
        const r = await updateById('lesson_progress', String(existing.id), patch)
        saved = r.data ?? null
      } else {
        const r = await create('lesson_progress', {
          user_id: userId,
          lesson_id: idOf(req),
          course_id: lesson.course_id,
          ...patch,
          created_at: new Date(),
        })
        saved = r.data ?? null
      }

      // Recompute enrollment.progress as the percentage of completed lessons.
      const courseLessons = await findMany<Record<string, unknown>>('lessons', {
        where: [{ field: 'course_id', operator: '=', value: lesson.course_id }],
        select: ['id'],
        limit: 500,
      })
      const totalLessons = courseLessons.length
      if (totalLessons > 0) {
        const completedRows = await findMany<Record<string, unknown>>('lesson_progress', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'course_id', operator: '=', value: lesson.course_id },
            { field: 'completed_at', operator: 'is_not_null' },
          ],
          select: ['id'],
          limit: 500,
        })
        const pct = Math.min(100, Math.round((completedRows.length / totalLessons) * 100))
        const enrollment = await findOne<Record<string, unknown>>('enrollments', [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'course_id', operator: '=', value: lesson.course_id },
        ])
        if (enrollment) {
          await updateById('enrollments', String(enrollment.id), {
            progress: pct,
            completed_at: pct >= 100 ? new Date() : null,
            updated_at: new Date(),
          })
        }
      }

      res.status(existing ? 200 : 201).json(saved)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
