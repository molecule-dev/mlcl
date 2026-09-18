/**
 * Reviews handler — read public reviews for a course; create/update/delete
 * is owner-scoped + requires enrollment.
 *
 * Authorization model from INVENTORY.md:
 *   - read: world-readable per course (returns rows for the given courseId).
 *   - create: requires the caller to have an active enrollment in the
 *     course; one review per (user, course).
 *   - update / delete: owner-only (`userId` of the review matches the
 *     session userId).
 *
 * The reviews table uses the canonical `@molecule/api-resource-review`
 * schema: `resourceType`, `resourceId`, `userId`, `rating`, `title`, `body`.
 * We treat `resourceType = 'course'` and `resourceId = courseId`.
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

const createReviewSchema = z.object({
  course_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
})

const recomputeRatings = async (courseId: string): Promise<void> => {
  const rows = await findMany<Record<string, unknown>>('reviews', {
    where: [
      { field: 'resourceType', operator: '=', value: 'course' },
      { field: 'resourceId', operator: '=', value: courseId },
    ],
    select: ['rating'],
    limit: 5000,
  })
  const total = rows.length
  const sum = rows.reduce((acc, r) => acc + Number(r.rating ?? 0), 0)
  const avg = total === 0 ? 0 : Math.round((sum / total) * 100) / 100
  await updateById('courses', courseId, {
    rating_avg: avg,
    rating_count: total,
  })
}

router.get(
  '/course/:courseId',
  validateParams(courseIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const courseId = String(req.params.courseId)
      const where: WhereCondition[] = [
        { field: 'resourceType', operator: '=', value: 'course' },
        { field: 'resourceId', operator: '=', value: courseId },
      ]
      const reviews = await findMany('reviews', {
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 100,
      })
      res.json(reviews)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/', validateBody(createReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createReviewSchema>
    // Caller must be enrolled in the course before they can review it.
    const enrollment = await findOne('enrollments', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: body.course_id },
    ])
    if (!enrollment) {
      res.status(400).json({
        error: t('reviews.enrollmentRequired', undefined, {
          defaultValue: 'Enrollment required to review',
        }),
      })
      return
    }
    // One review per user per course.
    const dup = await count('reviews', [
      { field: 'resourceType', operator: '=', value: 'course' },
      { field: 'resourceId', operator: '=', value: body.course_id },
      { field: 'userId', operator: '=', value: userId },
    ])
    if (dup > 0) {
      res.status(409).json({
        error: t('reviews.alreadyReviewed', undefined, {
          defaultValue: 'You already reviewed this course',
        }),
      })
      return
    }
    const result = await create('reviews', {
      resourceType: 'course',
      resourceId: body.course_id,
      userId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      helpful: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await recomputeRatings(body.course_id)
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
  validateBody(updateReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('reviews', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('reviews.notFound', undefined, { defaultValue: 'Review not found' }) })
        return
      }
      if (existing.userId !== userId) {
        res
          .status(403)
          .json({ error: t('reviews.forbidden', undefined, { defaultValue: 'Not your review' }) })
        return
      }
      const body = req.body as z.infer<typeof updateReviewSchema>
      const result = await updateById('reviews', idOf(req), { ...body, updatedAt: new Date() })
      await recomputeRatings(String(existing.resourceId))
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
    const existing = await findById<Record<string, unknown>>('reviews', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('reviews.notFound', undefined, { defaultValue: 'Review not found' }) })
      return
    }
    if (existing.userId !== userId) {
      res
        .status(403)
        .json({ error: t('reviews.forbidden', undefined, { defaultValue: 'Not your review' }) })
      return
    }
    await deleteById('reviews', idOf(req))
    await recomputeRatings(String(existing.resourceId))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
