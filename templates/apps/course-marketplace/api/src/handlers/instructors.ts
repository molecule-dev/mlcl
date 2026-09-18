/**
 * Instructors handler — public profile + courses + owner-only earnings/stats.
 *
 * Authorization model from INVENTORY.md:
 *   - profile read: world-readable when `is_instructor = true`.
 *   - courses list: world-readable; returns published courses for the
 *     instructor.
 *   - earnings / stats: must equal `userId` (an instructor cannot read
 *     another instructor's earnings).
 *
 * Reporting calls go through `@molecule/api-reporting`. The aggregation
 * helper falls back to a manual `findMany`/`reduce` when the reporting
 * provider isn't bonded so that the dashboard remains functional in CI
 * without the reporting backend (BLOCKED: reporting-database-bond
 * pending for the production aggregator).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { count, findById, findMany, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { decorateCourses, decorateInstructor } from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const becomeInstructorSchema = z.object({
  bio: z.string().max(2000).optional(),
  avatar_url: z.string().url().optional(),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  featured: z.coerce.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const params = listQuerySchema.parse(req.query)
    const limit = params.limit ?? 12
    // Public list of instructors. Returned shape matches the Landing
    // page's `Instructor` type.
    const instructors = await findMany<Record<string, unknown>>('users', {
      where: [{ field: 'is_instructor', operator: '=', value: true }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
    })
    const decorated = await Promise.all(instructors.map((u) => decorateInstructor(u)))
    res.json(decorated)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('instructors.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    res.json(await decorateInstructor(user))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/me/become',
  validateBody(becomeInstructorSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const body = req.body as z.infer<typeof becomeInstructorSchema>
      const result = await updateById<Record<string, unknown>>('users', userId, {
        is_instructor: true,
        instructor_bio:
          body.bio ?? 'New to teaching on Lectura — share what you know with the world.',
        instructor_avatar_url: body.avatar_url ?? `https://i.pravatar.cc/256?u=${userId}`,
        updatedAt: new Date(),
      })
      const user = (result.data ?? result) as Record<string, unknown>
      res.json(await decorateInstructor(user))
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
    const instructor = await findById<Record<string, unknown>>('users', idOf(req))
    if (!instructor || instructor.is_instructor !== true) {
      res.status(404).json({
        error: t('instructors.notFound', undefined, { defaultValue: 'Instructor not found' }),
      })
      return
    }
    res.json(await decorateInstructor(instructor))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/courses', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const isOwner = userId !== null && userId === idOf(req)
    // Owners (instructors viewing their own dashboard) see ALL their
    // courses including drafts. Public visitors only see published.
    const where: WhereCondition[] = [{ field: 'instructor_id', operator: '=', value: idOf(req) }]
    if (!isOwner) {
      where.push({ field: 'status', operator: '=', value: 'published' })
    }
    const courses = await findMany<Record<string, unknown>>('courses', {
      where,
      orderBy: [
        { field: 'status', direction: 'asc' },
        { field: 'created_at', direction: 'desc' },
      ],
      limit: 200,
    })
    res.json(await decorateCourses(courses))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/earnings', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const requested = idOf(req)
    if (!userId || userId !== requested) {
      res
        .status(403)
        .json({ error: t('instructors.forbidden', undefined, { defaultValue: 'Forbidden' }) })
      return
    }
    // Aggregate enrollment counts × course price. v1 aggregation is in
    // process — see BLOCKED: reporting-database-bond pending for the
    // production version.
    const courses = await findMany<Record<string, unknown>>('courses', {
      where: [{ field: 'instructor_id', operator: '=', value: requested }],
      select: ['id', 'title', 'price_cents', 'total_enrollments'],
      limit: 200,
    })
    let totalCents = 0
    const perCourse = courses.map((c) => {
      const enrollments = Number(c.total_enrollments ?? 0)
      const priceCents = Number(c.price_cents ?? 0)
      const courseTotal = enrollments * priceCents
      totalCents += courseTotal
      return {
        course_id: c.id,
        title: c.title,
        enrollments,
        price_cents: priceCents,
        total_cents: courseTotal,
      }
    })
    res.json({
      instructor_id: requested,
      total_cents: totalCents,
      currency: 'usd',
      courses: perCourse,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/stats', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const requested = idOf(req)
    if (!userId || userId !== requested) {
      res
        .status(403)
        .json({ error: t('instructors.forbidden', undefined, { defaultValue: 'Forbidden' }) })
      return
    }
    const courseRows = await findMany<Record<string, unknown>>('courses', {
      where: [{ field: 'instructor_id', operator: '=', value: requested }],
      select: ['id', 'status', 'total_enrollments', 'rating_avg', 'rating_count'],
      limit: 200,
    })
    const totalCourses = courseRows.length
    const publishedCourses = courseRows.filter((c) => c.status === 'published').length
    const totalEnrollments = courseRows.reduce(
      (acc, c) => acc + Number(c.total_enrollments ?? 0),
      0,
    )
    const totalReviews = courseRows.reduce((acc, c) => acc + Number(c.rating_count ?? 0), 0)
    const averageRating =
      totalReviews === 0
        ? 0
        : Math.round(
            (courseRows.reduce(
              (acc, c) => acc + Number(c.rating_avg ?? 0) * Number(c.rating_count ?? 0),
              0,
            ) /
              totalReviews) *
              100,
          ) / 100
    // Lessons authored across the instructor's courses.
    const courseIds = courseRows.map((c) => String(c.id))
    const totalLessons =
      courseIds.length === 0
        ? 0
        : await count('lessons', [{ field: 'course_id', operator: 'in', value: courseIds }])
    res.json({
      instructor_id: requested,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalReviews,
      averageRating,
      totalLessons,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
